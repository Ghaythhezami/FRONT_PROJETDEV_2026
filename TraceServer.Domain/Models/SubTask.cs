using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AgileAi.Domain.Models
{
    public class SubTask
    {
        [Key]
        public Guid SubTaskId { get; set; } = Guid.NewGuid();
        public string Title { get; set; }
        public bool IsCompleted { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? DueDate { get; set; }

        public Guid? IssueId { get; set; }
        public Issue? Issue { get; set; }
        public Guid? AssigneeId { get; set; }
        public bool isDeleted { get; set; } = false;

    }
}
