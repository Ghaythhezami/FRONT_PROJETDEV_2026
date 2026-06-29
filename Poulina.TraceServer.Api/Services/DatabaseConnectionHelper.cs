using System;

namespace AgileAi.Api.Services
{
    public static class DatabaseConnectionHelper
    {
        public static string ResolveConnectionString(string configured, string databaseUrl)
        {
            var raw = !string.IsNullOrWhiteSpace(configured)
                ? configured.Trim()
                : !string.IsNullOrWhiteSpace(databaseUrl)
                    ? databaseUrl.Trim()
                    : null;

            if (raw == null)
            {
                return null;
            }

            return Normalize(raw);
        }

        public static string Normalize(string connectionString)
        {
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                return connectionString;
            }

            var trimmed = connectionString.Trim();

            if (!trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
                !trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
            {
                return trimmed;
            }

            return ConvertPostgresUri(trimmed);
        }

        private static string ConvertPostgresUri(string uri)
        {
            var parsed = new Uri(uri);
            var userInfo = parsed.UserInfo.Split(':', 2);
            var username = Uri.UnescapeDataString(userInfo[0]);
            var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
            var database = parsed.AbsolutePath.TrimStart('/');
            var port = parsed.Port > 0 ? parsed.Port : 5432;

            var query = parsed.Query.TrimStart('?');
            var sslMode = query.Contains("sslmode=disable", StringComparison.OrdinalIgnoreCase)
                ? "Disable"
                : query.Contains("sslmode=require", StringComparison.OrdinalIgnoreCase) ||
                  query.Contains("sslmode=verify-full", StringComparison.OrdinalIgnoreCase) ||
                  query.Contains("sslmode=verify-ca", StringComparison.OrdinalIgnoreCase)
                    ? "Require"
                    : "Prefer";

            return
                $"Host={parsed.Host};Port={port};Database={database};Username={username};Password={password};SSL Mode={sslMode};Trust Server Certificate=true";
        }
    }
}
