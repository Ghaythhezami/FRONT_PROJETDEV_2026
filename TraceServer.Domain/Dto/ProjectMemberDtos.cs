using System;
using System.ComponentModel.DataAnnotations;

namespace AgileAi.Domain.Dto
{
    public class CreateProjectMemberDto
    {
        [Required]
        public Guid ProjectId { get; set; }

        [Required]
        public Guid MemberId { get; set; }
    }

    public class ProjectMemberResponseDto
    {
        public Guid ProjectMemberId { get; set; }
        public Guid ProjectId { get; set; }
        public Guid MemberId { get; set; }
        public string MemberName { get; set; }
        public string MemberEmail { get; set; }
        public string Role { get; set; }
    }
}
