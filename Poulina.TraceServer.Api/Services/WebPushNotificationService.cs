using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using AgileAi.Data.Context;
using AgileAi.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using WebPush;

namespace AgileAi.Api.Services
{
    public interface IWebPushNotificationService
    {
        bool IsConfigured { get; }
        string? PublicKey { get; }
        Task SendToUserAsync(Guid userId, string title, string body, string? link);
    }

    public class WebPushNotificationService : IWebPushNotificationService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<WebPushNotificationService> _logger;
        private readonly VapidDetails? _vapidDetails;
        private readonly WebPushClient _client = new();

        public WebPushNotificationService(
            AppDbContext context,
            IConfiguration configuration,
            ILogger<WebPushNotificationService> logger)
        {
            _context = context;
            _logger = logger;

            var subject = configuration["Vapid:Subject"] ?? "mailto:admin@agileai.com";
            var publicKey = configuration["Vapid:PublicKey"];
            var privateKey = configuration["Vapid:PrivateKey"];

            if (!string.IsNullOrWhiteSpace(publicKey) && !string.IsNullOrWhiteSpace(privateKey))
            {
                _vapidDetails = new VapidDetails(subject, publicKey.Trim(), privateKey.Trim());
            }
        }

        public bool IsConfigured => _vapidDetails != null;

        public string? PublicKey => _vapidDetails?.PublicKey;

        public async Task SendToUserAsync(Guid userId, string title, string body, string? link)
        {
            if (_vapidDetails == null)
                return;

            var subscriptions = await _context.PushSubscriptions
                .Where(ps => ps.UserId == userId)
                .ToListAsync();

            if (subscriptions.Count == 0)
                return;

            var payload = JsonSerializer.Serialize(new
            {
                notification = new
                {
                    title,
                    body,
                    icon = "/icons/icon-192x192.png",
                    badge = "/icons/icon-128x128.png",
                    data = new { link = link ?? "/" },
                },
            });

            var stale = new List<Domain.Models.PushSubscription>();

            foreach (var row in subscriptions)
            {
                try
                {
                    var subscription = new WebPush.PushSubscription(row.Endpoint, row.P256dh, row.Auth);
                    await _client.SendNotificationAsync(subscription, payload, _vapidDetails);
                }
                catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone ||
                                                  ex.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    stale.Add(row);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Web push failed for user {UserId}", userId);
                }
            }

            if (stale.Count > 0)
            {
                _context.PushSubscriptions.RemoveRange(stale);
                await _context.SaveChangesAsync();
            }
        }
    }
}
