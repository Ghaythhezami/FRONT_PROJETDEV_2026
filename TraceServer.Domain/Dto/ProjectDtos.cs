using System;
using System.ComponentModel.DataAnnotations;

namespace AgileAi.Domain.Dto
{
    public class CreateProjectDto
    {
        [Required]
        [StringLength(120, MinimumLength = 2)]
        public string ProjectName { get; set; }

        [StringLength(1000)]
        public string ProjectDescription { get; set; }

        [Required]
        [StringLength(12, MinimumLength = 2)]
        [RegularExpression("^[A-Za-z0-9_-]+$")]
        public string Key { get; set; }
    }

    public class ProjectResponseDto
    {
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; }
        public string ProjectDescription { get; set; }
        public string Key { get; set; }
        public Guid OwnerId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsFinished { get; set; }
        public DateTime? FinishedAt { get; set; }
        public int TotalCompletedPoints { get; set; }
        public string ActiveSprintName { get; set; }
        public int OpenIssueCount { get; set; }
    }

    public class ProjectDetailsDto : ProjectResponseDto
    {
    }
}
