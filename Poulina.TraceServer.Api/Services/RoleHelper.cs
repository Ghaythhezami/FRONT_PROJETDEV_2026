using System;

namespace AgileAi.Api.Services
{
    public static class RoleHelper
    {
        public static bool IsStaffRole(string role)
        {
            if (string.IsNullOrWhiteSpace(role))
            {
                return false;
            }

            var normalized = role.Trim().ToLowerInvariant();
            return normalized is "admin"
                or "po"
                or "product owner"
                or "scrum master"
                or "scrum-master";
        }

        public static bool IsDeveloperRole(string role)
        {
            if (string.IsNullOrWhiteSpace(role))
            {
                return true;
            }

            return !IsStaffRole(role);
        }
    }
}
