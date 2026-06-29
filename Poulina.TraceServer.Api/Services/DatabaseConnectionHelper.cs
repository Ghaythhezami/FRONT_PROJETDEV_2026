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

            return Enrich(Normalize(raw));
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

        public static string Enrich(string connectionString)
        {
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                return connectionString;
            }

            var builder = connectionString;

            if (!builder.Contains("Timeout=", StringComparison.OrdinalIgnoreCase))
            {
                builder += ";Timeout=30";
            }

            if (!builder.Contains("Command Timeout=", StringComparison.OrdinalIgnoreCase))
            {
                builder += ";Command Timeout=60";
            }

            if (!builder.Contains("Pooling=", StringComparison.OrdinalIgnoreCase))
            {
                builder += ";Pooling=true;Minimum Pool Size=0;Maximum Pool Size=20";
            }

            if (!builder.Contains("Keepalive=", StringComparison.OrdinalIgnoreCase))
            {
                builder += ";Keepalive=30";
            }

            return builder;
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
