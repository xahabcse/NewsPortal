namespace NewsPortal.Core.Entities;

public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = UserRole.Reader; // SuperAdmin, Admin, Editor, Reader
    public DateTime? LastLoginAt { get; set; }
}

public static class UserRole
{
    public const string SuperAdmin = "SuperAdmin";  // All access
    public const string Admin = "Admin";            // Full system + user management
    public const string Editor = "Editor";          // Edit/fetch news sources
    public const string Reader = "Reader";          // Default — browse content when logged in
    public const string Viewer = "Viewer";          // Legacy alias for Reader (existing users)
}
