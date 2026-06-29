using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgileAi.Api.Services;
using System;
using System.Linq;
using System.Threading.Tasks;
using AgileAi.Data.Context;
using AgileAi.Domain.Dto;
using AgileAi.Domain.Models;

namespace AgileAi.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IActivityService _activityService;
        private readonly IWebPushNotificationService _webPush;

        public NotificationsController(
            AppDbContext context,
            ICurrentUserService currentUser,
            IActivityService activityService,
            IWebPushNotificationService webPush)
        {
            _context = context;
            _currentUser = currentUser;
            _activityService = activityService;
            _webPush = webPush;
        }

        [AllowAnonymous]
        [HttpGet("vapid-public-key")]
        public IActionResult GetVapidPublicKey()
        {
            if (!_webPush.IsConfigured || string.IsNullOrWhiteSpace(_webPush.PublicKey))
                return Ok(new VapidPublicKeyResponseDto { PublicKey = null });

            return Ok(new VapidPublicKeyResponseDto { PublicKey = _webPush.PublicKey });
        }

        [HttpPost("push-subscribe")]
        public async Task<IActionResult> PushSubscribe([FromBody] PushSubscriptionRequestDto request)
        {
            if (request == null ||
                string.IsNullOrWhiteSpace(request.Endpoint) ||
                string.IsNullOrWhiteSpace(request.P256dh) ||
                string.IsNullOrWhiteSpace(request.Auth))
            {
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Endpoint, P256dh, and Auth are required.",
                    Code = "PUSH_SUBSCRIPTION_INVALID",
                });
            }

            var userId = _currentUser.UserId;
            var endpoint = request.Endpoint.Trim();
            var existing = await _context.PushSubscriptions
                .FirstOrDefaultAsync(ps => ps.UserId == userId && ps.Endpoint == endpoint);

            if (existing == null)
            {
                _context.PushSubscriptions.Add(new Domain.Models.PushSubscription
                {
                    PushSubscriptionId = Guid.NewGuid(),
                    UserId = userId,
                    Endpoint = endpoint,
                    P256dh = request.P256dh.Trim(),
                    Auth = request.Auth.Trim(),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
            }
            else
            {
                existing.P256dh = request.P256dh.Trim();
                existing.Auth = request.Auth.Trim();
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpDelete("push-subscribe")]
        public async Task<IActionResult> PushUnsubscribe([FromBody] PushSubscriptionRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Endpoint))
                return BadRequest();

            var userId = _currentUser.UserId;
            var endpoint = request.Endpoint.Trim();
            var rows = await _context.PushSubscriptions
                .Where(ps => ps.UserId == userId && ps.Endpoint == endpoint)
                .ToListAsync();

            if (rows.Count == 0)
                return NotFound();

            _context.PushSubscriptions.RemoveRange(rows);
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpGet("mine")]
        public async Task<IActionResult> GetMine()
        {
            var userId = _currentUser.UserId;
            var notifications = await _context.Notifications
                .Where(n => n.ReceiverId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new NotificationResponseDto
                {
                    NotificationId = n.NotificationId,
                    Message = n.Message,
                    Link = n.Link,
                    IsRead = n.IsRead,
                    CreatedAt = n.CreatedAt,
                    ReceiverId = n.ReceiverId
                })
                .ToListAsync();

            return Ok(notifications);
        }

        [HttpPost("TTest")]
        public async Task<IActionResult> TTest([FromBody] TestNotificationRequestDto request)
        {
            if (request == null || request.ReceiverId == Guid.Empty)
                return BadRequest(new ApiErrorResponse
                {
                    Message = "ReceiverId is required.",
                    Code = "RECEIVER_ID_REQUIRED"
                });

            var receiverExists = await _context.Users.AnyAsync(u => u.UserId == request.ReceiverId);

            if (!receiverExists)
                return NotFound(new ApiErrorResponse
                {
                    Message = "Receiver user was not found.",
                    Code = "RECEIVER_NOT_FOUND"
                });

            var description = string.IsNullOrWhiteSpace(request.Description)
                ? "TEST"
                : request.Description.Trim();

            await _activityService.Notify(request.ReceiverId, description, "/notifications/test");

            return Ok(new
            {
                receiverId = request.ReceiverId,
                message = description,
                link = "/notifications/test"
            });
        }

        [HttpPost("Send")]
        public async Task<IActionResult> Send([FromBody] SendNotificationRequestDto request)
        {
            if (request == null || request.ReceiverId == Guid.Empty)
                return BadRequest(new ApiErrorResponse
                {
                    Message = "ReceiverId is required.",
                    Code = "RECEIVER_ID_REQUIRED"
                });

            if (string.IsNullOrWhiteSpace(request.Description))
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Description is required.",
                    Code = "DESCRIPTION_REQUIRED"
                });

            var receiverExists = await _context.Users.AnyAsync(u => u.UserId == request.ReceiverId);

            if (!receiverExists)
                return NotFound(new ApiErrorResponse
                {
                    Message = "Receiver user was not found.",
                    Code = "RECEIVER_NOT_FOUND"
                });

            var description = request.Description.Trim();
            var link = string.IsNullOrWhiteSpace(request.Link)
                ? "/notifications"
                : request.Link.Trim();

            await _activityService.Notify(request.ReceiverId, description, link);

            return Ok(new
            {
                receiverId = request.ReceiverId,
                message = description,
                link
            });
        }

        [HttpPatch("{id}/read")]
        public async Task<IActionResult> MarkRead(Guid id)
        {
            var userId = _currentUser.UserId;
            var notification = await _context.Notifications.FirstOrDefaultAsync(n => n.NotificationId == id && n.ReceiverId == userId);

            if (notification == null)
                return NotFound();

            notification.IsRead = true;
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}
