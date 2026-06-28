using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AgileAi.Domain.Models
{
    public class Attachment
    {
        [Key]
        public Guid AttachmentId { get; set; } = Guid.NewGuid();
        public string FileName { get; set; }
        public string BlobUrl { get; set; } // Path in Azure/AWS storage
        public string FileType { get; set; }
        public long FileSize { get; set; }

        // Relations
        public Guid IssueId { get; set; }
        public Issue Issue { get; set; }
        public Guid? SubTaskId { get; set; }
        public Guid? UploaderId { get; set; }
        public bool isDeleted { get; set; } = false;
    }
}
