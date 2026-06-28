using System;
using System.ComponentModel.DataAnnotations;
using AgileAi.Domain.Models;

namespace AgileAi.Domain.Dto
{
    public class CreateIssueDto
    {
        [Required]
        [StringLength(160, MinimumLength = 2)]
        public string Title { get; set; }

        [Range(0, int.MaxValue)]
        public int Order { get; set; }

        [Required]
        public Guid UserStoryId { get; set; }

        public Guid? AssigneeId { get; set; }
    }

    public class UpdateIssueDto
    {
        [Required]
        [StringLength(160, MinimumLength = 2)]
        public string Title { get; set; }

        [Required]
        public ItemStatus Status { get; set; }

        [Range(0, int.MaxValue)]
        public int Order { get; set; }

        [Required]
        public Guid UserStoryId { get; set; }

        public Guid? AssigneeId { get; set; }
    }

    public class MoveIssueDto
    {
        [Required]
        public ItemStatus Status { get; set; }

        [Range(0, int.MaxValue)]
        public int Order { get; set; }
    }

    public class IssueAssigneeDto
    {
        public Guid UserId { get; set; }
        public string Name { get; set; }
        public string PhotoUrl { get; set; }
    }

    public class IssueResponseDto
    {
        public Guid IssueId { get; set; }
        public string Title { get; set; }
        public ItemStatus Status { get; set; }
        public int Order { get; set; }
        public Guid UserStoryId { get; set; }
        public Guid? AssigneeId { get; set; }
        public string AssigneeName { get; set; }
        public string AssigneePhotoUrl { get; set; }
        public Guid? ProjectId { get; set; }
        public string ProjectName { get; set; }
        public string ProjectKey { get; set; }
        public Guid? SprintId { get; set; }
        public string SprintName { get; set; }
        public int CommentCount { get; set; }
        public int AttachmentCount { get; set; }
        public int SubtaskCount { get; set; }
        public int CompletedSubtaskCount { get; set; }
        public int ProgressPercent { get; set; }
        public System.Collections.Generic.List<IssueAssigneeDto> Assignees { get; set; } =
            new System.Collections.Generic.List<IssueAssigneeDto>();
    }
}
