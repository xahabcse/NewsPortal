using NewsPortal.Core.DTOs;

namespace NewsPortal.Core.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto?> LoginAsync(LoginDto loginDto);
    Task<AuthResponseDto?> RegisterAsync(RegisterDto registerDto);
    Task<AuthResponseDto?> GoogleLoginAsync(string credential);
    Task<UserDto?> GetUserByIdAsync(int userId);
    Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto changePasswordDto);
    Task<bool> UserExistsAsync(string username, string email);
}
