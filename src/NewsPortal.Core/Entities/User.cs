namespace NewsPortal.Core.Entities;

public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty; // Optional
    public string LastName { get; set; } = string.Empty;  // Optional
    public string Role { get; set; } = UserRole.Viewer; // SuperAdmin, Admin, Editor, Viewer
    public DateTime? LastLoginAt { get; set; }
}

public static class UserRole
{
    public const string SuperAdmin = "SuperAdmin";  // Can manage users
    public const string Admin = "Admin";            // Full system access
    public const string Editor = "Editor";          // Can edit/fetch news
    public const string Viewer = "Viewer";          // Read-only
}
