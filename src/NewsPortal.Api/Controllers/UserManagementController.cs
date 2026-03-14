using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Helpers;
using NewsPortal.Core.Interfaces;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace NewsPortal.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class UserManagementController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UserManagementController> _logger;

    public UserManagementController(IUnitOfWork unitOfWork, ILogger<UserManagementController> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    /// <summary>
    /// Get all users (SuperAdmin only)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAllUsers()
    {
        try
        {
            var users = await _unitOfWork.Users.GetAllAsync();
            var userDtos = users.Select(u => new UserDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Role = u.Role,
                IsActive = u.IsActive,
                LastLoginAt = u.LastLoginAt,
                CreatedAt = u.CreatedAt
            }).ToList();

            return Ok(userDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all users");
            return StatusCode(500, new { message = "Failed to get users" });
        }
    }

    /// <summary>
    /// Get user by ID (SuperAdmin only)
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUserById(int id)
    {
        try
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            var userDto = new UserDto
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

            return Ok(userDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user by ID: {UserId}", id);
            return StatusCode(500, new { message = "Failed to get user" });
        }
    }

    /// <summary>
    /// Create a new user (SuperAdmin only)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto createDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            // Check if user already exists
            if (await _unitOfWork.Users.ExistsByUsernameAsync(createDto.Username))
                return Conflict(new { message = "Username already exists" });

            if (await _unitOfWork.Users.ExistsByEmailAsync(createDto.Email))
                return Conflict(new { message = "Email already exists" });

            var user = new User
            {
                Username = createDto.Username,
                Email = createDto.Email,
                PasswordHash = PasswordHelper.HashPassword(createDto.Password),
                FirstName = "",
                LastName = "",
                Role = createDto.Role,
                IsActive = createDto.IsActive
            };

            await _unitOfWork.Users.AddAsync(user);
            await _unitOfWork.SaveChangesAsync();

            var userDto = new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            };

            _logger.LogInformation("SuperAdmin created new user: {Username}", user.Username);
            return Created($"/api/v1/usermanagement/{user.Id}", userDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user");
            return StatusCode(500, new { message = "Failed to create user" });
        }
    }

    /// <summary>
    /// Update an existing user (SuperAdmin only)
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto updateDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            // Prevent changing SuperAdmin role if this is the only SuperAdmin
            if (user.Role == UserRole.SuperAdmin && updateDto.Role != UserRole.SuperAdmin)
            {
                var superAdminCount = await _unitOfWork.Users.CountAsync(u => u.Role == UserRole.SuperAdmin && u.IsActive);
                if (superAdminCount <= 1)
                    return BadRequest(new { message = "Cannot change role of the only SuperAdmin. Please create another SuperAdmin first." });
            }

            // Check for duplicate username/email (excluding current user)
            var existingUser = await _unitOfWork.Users.GetByUsernameAsync(updateDto.Username);
            if (existingUser != null && existingUser.Id != id)
                return Conflict(new { message = "Username already exists" });

            var existingEmail = await _unitOfWork.Users.GetByEmailAsync(updateDto.Email);
            if (existingEmail != null && existingEmail.Id != id)
                return Conflict(new { message = "Email already exists" });

            user.Username = updateDto.Username;
            user.Email = updateDto.Email;
            user.Role = updateDto.Role;
            user.IsActive = updateDto.IsActive;

            await _unitOfWork.SaveChangesAsync();

            var userDto = new UserDto
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

            _logger.LogInformation("SuperAdmin updated user: {Username}", user.Username);
            return Ok(userDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user: {UserId}", id);
            return StatusCode(500, new { message = "Failed to update user" });
        }
    }

    /// <summary>
    /// Delete a user (SuperAdmin only)
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DeleteUser(int id)
    {
        try
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            // Prevent deleting SuperAdmin
            if (user.Role == UserRole.SuperAdmin)
            {
                var superAdminCount = await _unitOfWork.Users.CountAsync(u => u.Role == UserRole.SuperAdmin && u.IsActive);
                if (superAdminCount <= 1)
                    return BadRequest(new { message = "Cannot delete the only SuperAdmin." });
            }

            // Prevent self-deletion
            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(currentUserId, out var currentId) && currentId == id)
                return BadRequest(new { message = "Cannot delete your own account." });

            await _unitOfWork.Users.DeleteAsync(user);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("SuperAdmin deleted user: {Username}", user.Username);
            return Ok(new { message = "User deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user: {UserId}", id);
            return StatusCode(500, new { message = "Failed to delete user" });
        }
    }

    /// <summary>
    /// Reset user password (SuperAdmin only)
    /// </summary>
    [HttpPost("{id}/reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordDto resetDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            user.PasswordHash = PasswordHelper.HashPassword(resetDto.NewPassword);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("SuperAdmin reset password for user: {Username}", user.Username);
            return Ok(new { message = "Password reset successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password for user: {UserId}", id);
            return StatusCode(500, new { message = "Failed to reset password" });
        }
    }
}

public class ResetPasswordDto
{
    [Required(ErrorMessage = "New password is required")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters")]
    public string NewPassword { get; set; } = string.Empty;
}
