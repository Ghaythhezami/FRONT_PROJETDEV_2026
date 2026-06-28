using System;
using System.ComponentModel.DataAnnotations;

namespace AgileAi.Domain.Dto
{
    public class LoginRequestDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string MotDePasse { get; set; }
    }

    public class RegisterUserDto
    {
        [Required]
        public string Nom { get; set; }

        [Required]
        public string Prenom { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string MotDePasse { get; set; }

        public string Telephone { get; set; }

        [Required]
        public string Role { get; set; }

        public string Filiale { get; set; }
    }

    public class UserResponseDto
    {
        public Guid UserId { get; set; }
        public string Nom { get; set; }
        public string Prenom { get; set; }
        public string Email { get; set; }
        public string Telephone { get; set; }
        public string Role { get; set; }
        public string Filiale { get; set; }
        public string PhotoUrl { get; set; }
    }
}
