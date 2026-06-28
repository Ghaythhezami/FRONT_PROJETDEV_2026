using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AgileAi.Domain.Models
{
    public class Comment
    {
        [Key]
        public Guid CommentId { get; set; } = Guid.NewGuid();

        [Required]
        public string Content { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        public bool isDeleted { get; set; } = false;

        // Foreign Keys
        public Guid IssueId { get; set; }
        public virtual Issue Issue { get; set; }
        public Guid? SubTaskId { get; set; }

        public Guid? AuthorId { get; set; }

    }
}
