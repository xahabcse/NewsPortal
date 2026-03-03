using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Helpers;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Service.Services;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUnitOfWork unitOfWork,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _unitOfWork = unitOfWork;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto loginDto)
    {
        try
        {
            var user = await _unitOfWork.Users.GetByUsernameAsync(loginDto.Username);

            if (user == null || !user.IsActive)
            {
                _logger.LogWarning("Login attempt failed for username: {Username}", loginDto.Username);
                return null;
            }

            if (!PasswordHelper.VerifyPasswordHash(loginDto.Password, user.PasswordHash))
            {
                _logger.LogWarning("Invalid password for username: {Username}", loginDto.Username);
                return null;
            }

            await _unitOfWork.Users.UpdateLastLoginAsync(user.Id);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("User {Username} logged in successfully", user.Username);

            return BuildAuthResponse(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login for username: {Username}", loginDto.Username);
            return null;
        }
    }

    public async Task<AuthResponseDto?> RegisterAsync(RegisterDto registerDto)
    {
        try
        {
            if (await UserExistsAsync(registerDto.Username, registerDto.Email))
            {
                _logger.LogWarning("Registration attempt with existing username or email: {Username}, {Email}",
                    registerDto.Username, registerDto.Email);
                return null;
            }

            var user = new User
            {
                Username = registerDto.Username,
                Email = registerDto.Email,
                PasswordHash = PasswordHelper.HashPassword(registerDto.Password),
                Role = UserRole.Reader, // Default role
                IsActive = true
            };

            await _unitOfWork.Users.AddAsync(user);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("New user registered: {Username}", user.Username);
            return BuildAuthResponse(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during registration for username: {Username}", registerDto.Username);
            return null;
        }
    }

    public async Task<AuthResponseDto?> GoogleLoginAsync(string credential)
    {
        try
        {
            var clientId = _configuration["Authentication:Google:ClientId"];
            if (string.IsNullOrWhiteSpace(clientId))
            {
                _logger.LogWarning("Google OAuth is not configured (missing ClientId)");
                return null;
            }

            var payload = await GoogleJsonWebSignature.ValidateAsync(credential,
                new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { clientId }
                });

            // Find existing user by email
            var user = await _unitOfWork.Users.GetByEmailAsync(payload.Email);

            if (user == null)
            {
                // Auto-register new Google user
                var username = await GenerateUniqueUsernameAsync(payload.Email);
                user = new User
                {
                    Username = username,
                    Email = payload.Email,
                    PasswordHash = PasswordHelper.HashPassword(Guid.NewGuid().ToString()), // Random — Google users can't password-login
                    FirstName = payload.GivenName ?? "",
                    LastName = payload.FamilyName ?? "",
                    Role = UserRole.Reader,
                    IsActive = true
                };
                await _unitOfWork.Users.AddAsync(user);
                _logger.LogInformation("New user auto-registered via Google: {Email}", payload.Email);
            }
            else if (!user.IsActive)
            {
                _logger.LogWarning("Disabled user attempted Google login: {Email}", payload.Email);
                return null;
            }

            await _unitOfWork.Users.UpdateLastLoginAsync(user.Id);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("User {Email} signed in via Google", payload.Email);
            return BuildAuthResponse(user);
        }
        catch (InvalidJwtException ex)
        {
            _logger.LogWarning("Invalid Google credential: {Message}", ex.Message);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Google login");
            return null;
        }
    }

    public async Task<UserDto?> GetUserByIdAsync(int userId)
    {
        try
        {
            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            if (user == null) return null;

            return new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role,
                IsActive = user.IsActive,
                LastLoginAt = user.LastLoginAt,
                CreatedAt = user.CreatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user by ID: {UserId}", userId);
            return null;
        }
    }

    public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto changePasswordDto)
    {
        try
        {
            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            if (user == null) return false;

            if (!PasswordHelper.VerifyPasswordHash(changePasswordDto.CurrentPassword, user.PasswordHash))
            {
                _logger.LogWarning("Password change failed - incorrect current password for user: {UserId}", userId);
                return false;
            }

            user.PasswordHash = PasswordHelper.HashPassword(changePasswordDto.NewPassword);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("Password changed successfully for user: {UserId}", userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password for user: {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> UserExistsAsync(string username, string email)
    {
        return await _unitOfWork.Users.ExistsByUsernameAsync(username) ||
               await _unitOfWork.Users.ExistsByEmailAsync(email);
    }

    #region Private Helper Methods

    private AuthResponseDto BuildAuthResponse(User user)
    {
        return new AuthResponseDto
        {
            Token = GenerateJwtToken(user),
            Username = user.Username,
            Email = user.Email,
            Role = user.Role,
            ExpiresAt = DateTime.UtcNow.AddHours(GetTokenExpirationHours())
        };
    }

    /// <summary>Derives a URL-safe username from an email, appending a counter if already taken.</summary>
    private async Task<string> GenerateUniqueUsernameAsync(string email)
    {
        var base_ = Regex.Replace(email.Split('@')[0], @"[^a-zA-Z0-9_]", "_");
        if (base_.Length > 30) base_ = base_[..30];

        var candidate = base_;
        var counter = 1;
        while (await _unitOfWork.Users.ExistsByUsernameAsync(candidate))
        {
            candidate = $"{base_}_{counter++}";
        }
        return candidate;
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");
        var issuer = jwtSettings["Issuer"] ?? "NewsPortalAPI";
        var audience = jwtSettings["Audience"] ?? "NewsPortalClient";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(GetTokenExpirationHours()),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private int GetTokenExpirationHours()
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        return int.TryParse(jwtSettings["ExpirationHours"], out var hours) ? hours : 24;
    }

    #endregion
}
