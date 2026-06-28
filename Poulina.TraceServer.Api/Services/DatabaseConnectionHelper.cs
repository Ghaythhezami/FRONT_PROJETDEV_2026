using System;

namespace AgileAi.Api.Services
{
    public static class DatabaseConnectionHelper
    {
        public static string ResolveConnectionString(string configured, string databaseUrl)
        {
            if (!string.IsNullOrWhiteSpace(configured))
            {
                return configured.Trim();
            }

            if (string.IsNullOrWhiteSpace(databaseUrl))
            {
                return null;
            }

            return TryConvertPostgresUri(databaseUrl.Trim());
        }

        private static string TryConvertPostgresUri(string uri)
        {
            if (!uri.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
                !uri.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
            {
                return uri;
            }

            var parsed = new Uri(uri);
            var userInfo = parsed.UserInfo.Split(':', 2);
            var username = Uri.UnescapeDataString(userInfo[0]);
            var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
            var database = parsed.AbsolutePath.TrimStart('/');
            var sslMode = parsed.Query.Contains("sslmode=require", StringComparison.OrdinalIgnoreCase)
                ? "Require"
                : "Prefer";

            return $"Host={parsed.Host};Port={parsed.Port};Database={database};Username={username};Password={password};SSL Mode={sslMode};Trust Server Certificate=true";
        }
    }
}
