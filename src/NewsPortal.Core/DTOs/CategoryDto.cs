using System.ComponentModel.DataAnnotations;

namespace NewsPortal.Core.DTOs;

public class CategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string NameBn { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public string? Color { get; set; }
    public int ArticleCount { get; set; }
}

public class CreateCategoryDto
{
    [Required(ErrorMessage = "Name is required")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Name must be between 2 and 100 characters")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Bengali name is required")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Bengali name must be between 2 and 100 characters")]
    public string NameBn { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
    public string? Description { get; set; }

    [StringLength(50, ErrorMessage = "Icon cannot exceed 50 characters")]
    public string? Icon { get; set; }

    [StringLength(20, ErrorMessage = "Color cannot exceed 20 characters")]
    [RegularExpression(@"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$", ErrorMessage = "Color must be a valid hex color code")]
    public string? Color { get; set; }

    [Range(0, 1000, ErrorMessage = "Sort order must be between 0 and 1000")]
    public int SortOrder { get; set; }
}
