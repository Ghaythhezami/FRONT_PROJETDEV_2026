namespace AgileAi.Api.Middleware
{
    using System;

    public static class DatabaseInitializationExtensions
    {
        public static bool IsWarmupExemptPath(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
            {
                return false;
            }

            return path.Equals("/health", StringComparison.OrdinalIgnoreCase) ||
                   path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase);
        }
    }
}
