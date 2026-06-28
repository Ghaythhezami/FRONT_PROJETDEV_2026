using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AgileAi.Domain.Models
{
    public class User
    {
        [Key]
        public Guid UserId { get; set; }
        public string Nom { get; set; }
        public string Prenom { get; set; }
        public string Email { get; set; }
        public string MotDePasse { get; set; }
        public string Telephone { get; set; }
        public string Role { get; set; }
        public string Filiale { get; set; }
        public string PhotoUrl { get; set; }
        public string? RefreshToken { get; set; }
        public DateTime RefreshTokenExpiryTime { get; set; }
        public string? Token { get; set; }
        public bool isDeleted { get; set; } = false;
        public ICollection<ProjectMember> ProjectMemberships { get; set; }
    }
}
