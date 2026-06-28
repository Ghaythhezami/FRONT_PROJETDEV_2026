using Microsoft.Extensions.Configuration;
using System;
using System.Text;

namespace AgileAi.Api.Services
{
    public static class ConnectionStringHelper
    {
        public static string Resolve(IConfiguration configuration)
        {
            var fromConfig = configuration.GetConnectionString("Connection");
            if (!string.IsNullOrWhiteSpace(fromConfig))
            {
                return fromConfig;
            }

            var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL")
                ?? Environment.GetEnvironmentVariable("NEON_DATABASE_URL");

            if (!string.IsNullOrWhiteSpace(databaseUrl))
            {
                return ConvertDatabaseUrl(databaseUrl);
            }

            return null;
        }

        /// <summary>
        /// Converts Neon/Render postgres:// or postgresql:// URI to Npgsql connection string.
        /// </summary>
        public static string ConvertDatabaseUrl(string databaseUrl)
        {
            if (string.IsNullOrWhiteSpace(databaseUrl))
            {
                return databaseUrl;
            }

            if (!databaseUrl.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
                !databaseUrl.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
            {
                return databaseUrl;
            }

            var uri = new Uri(databaseUrl);
            var userInfo = uri.UserInfo.Split(':', 2);
            var user = Uri.UnescapeDataString(userInfo[0]);
            var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
            var database = uri.AbsolutePath.TrimStart('/');
            var host = uri.Host;
            var port = uri.Port > 0 ? uri.Port : 5432;

            var builder = new StringBuilder();
            builder.Append($"Host={host};Port={port};Database={database};Username={user};Password={password}");
            builder.Append(";SSL Mode=Require;Trust Server Certificate=true");
            return builder.ToString();
        }
    }
}
