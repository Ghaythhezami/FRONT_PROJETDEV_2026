using System;

namespace AgileAi.Domain.Dto
{
    public class TestNotificationRequestDto
    {
        public Guid ReceiverId { get; set; }
        public string Description { get; set; }
    }

    public class SendNotificationRequestDto
    {
        public Guid ReceiverId { get; set; }
        public string Description { get; set; }
        public string Link { get; set; }
    }

    public class NotificationResponseDto
    {
        public Guid NotificationId { get; set; }
        public string Message { get; set; }
        public string Link { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
        public Guid? ReceiverId { get; set; }
    }

    public class ActivityLogResponseDto
    {
        public Guid ActivityLogId { get; set; }
        public Guid ProjectId { get; set; }
        public Guid? ActorId { get; set; }
        public string Action { get; set; }
        public string EntityType { get; set; }
        public Guid? EntityId { get; set; }
        public DateTime CreatedAt { get; set; }
        public string ActorName { get; set; }
        public string Description { get; set; }
    }
}
