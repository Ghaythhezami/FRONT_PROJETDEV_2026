using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace AgileAi.Domain.Dto
{
    public class CreateCommentDto
    {
        [Required]
        [StringLength(2000, MinimumLength = 1)]
        public string Content { get; set; }

        [Required]
        public Guid IssueId { get; set; }

        public Guid? SubTaskId { get; set; }
    }

    public class CommentResponseDto
    {
        public Guid CommentId { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public Guid IssueId { get; set; }
        public Guid? SubTaskId { get; set; }
        public Guid? AuthorId { get; set; }
        public string AuthorName { get; set; }
        public IEnumerable<Guid> MentionedUserIds { get; set; } = Array.Empty<Guid>();
    }

    public class CreateSubTaskDto
    {
        [Required]
        [StringLength(160, MinimumLength = 2)]
        public string Title { get; set; }

        [Required]
        public Guid IssueId { get; set; }

        public Guid? AssigneeId { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? DueDate { get; set; }
    }

    public class UpdateSubTaskDto
    {
        [Required]
        [StringLength(160, MinimumLength = 2)]
        public string Title { get; set; }

        public bool IsCompleted { get; set; }

        public Guid? IssueId { get; set; }

        public Guid? AssigneeId { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? DueDate { get; set; }
    }

    public class SubTaskResponseDto
    {
        public Guid SubTaskId { get; set; }
        public string Title { get; set; }
        public bool IsCompleted { get; set; }
        public Guid? IssueId { get; set; }
        public Guid? AssigneeId { get; set; }
        public string AssigneeName { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? DueDate { get; set; }
    }

    public class AttachmentResponseDto
    {
        public Guid AttachmentId { get; set; }
        public string FileName { get; set; }
        public string BlobUrl { get; set; }
        public string FileType { get; set; }
        public long FileSize { get; set; }
        public Guid IssueId { get; set; }
        public Guid? SubTaskId { get; set; }
        public Guid? UploaderId { get; set; }
        public string UploaderName { get; set; }
    }
}
