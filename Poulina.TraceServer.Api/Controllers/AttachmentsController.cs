using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using AgileAi.Api.Hubs;
using AgileAi.Api.Services;
using AgileAi.Data.Context;
using AgileAi.Domain.Commands;
using AgileAi.Domain.Dto;
using AgileAi.Domain.Models;
using AgileAi.Domain.Queries;

namespace AgileAi.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AttachmentsController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ICurrentUserService _currentUser;
        private readonly IProjectAuthorizationService _projectAuthorization;
        private readonly IActivityService _activityService;
        private readonly IHubContext<BoardHub> _boardHub;
        private readonly ICloudinaryStorageService _cloudinary;
        private readonly AppDbContext _context;

        public AttachmentsController(
            IMediator mediator,
            ICurrentUserService currentUser,
            IProjectAuthorizationService projectAuthorization,
            IActivityService activityService,
            IHubContext<BoardHub> boardHub,
            ICloudinaryStorageService cloudinary,
            AppDbContext context)
        {
            _mediator = mediator;
            _currentUser = currentUser;
            _projectAuthorization = projectAuthorization;
            _activityService = activityService;
            _boardHub = boardHub;
            _cloudinary = cloudinary;
            _context = context;
        }

        [HttpGet("issue/{issueId}")]
        public async Task<IActionResult> GetForIssue(Guid issueId, [FromQuery] Guid? subTaskId = null)
        {
            if (!await _projectAuthorization.CanAccessIssue(issueId))
                return Forbid();

            var attachments = await _mediator.Send(new GetListGenericQuery<Attachment>(a =>
                a.IssueId == issueId && !a.isDeleted &&
                (subTaskId == null ? a.SubTaskId == null : a.SubTaskId == subTaskId)));
            var uploaderIds = attachments
                .Where(a => a.UploaderId.HasValue)
                .Select(a => a.UploaderId.Value)
                .Distinct()
                .ToList();

            var uploaders = await _context.Users
                .Where(u => uploaderIds.Contains(u.UserId))
                .Select(u => new { u.UserId, Name = (u.Prenom + " " + u.Nom).Trim() })
                .ToDictionaryAsync(u => u.UserId, u => u.Name);

            return Ok(attachments.Select(a => ToResponse(a, ResolveUploaderName(a.UploaderId, uploaders))));
        }

        [HttpPost("issue/{issueId}")]
        [RequestSizeLimit(25_000_000)]
        public async Task<IActionResult> Upload(Guid issueId, [FromForm] IFormFile file, [FromForm] Guid? subTaskId = null)
        {
            if (!await _projectAuthorization.CanAccessIssue(issueId))
                return Forbid();

            if (file == null || file.Length == 0)
                return BadRequest(new ApiErrorResponse
                {
                    Message = "A file is required.",
                    Code = "FILE_REQUIRED"
                });

            if (_currentUser.UserId == Guid.Empty)
            {
                return Unauthorized(new ApiErrorResponse
                {
                    Message = "Could not resolve the signed-in user. Sign out and sign in again.",
                    Code = "USER_NOT_RESOLVED",
                });
            }

            var upload = await _cloudinary.UploadAsync(file);
            var uploaderName = await ResolveCurrentUploaderNameAsync();

            var attachment = new Attachment
            {
                AttachmentId = Guid.NewGuid(),
                FileName = file.FileName,
                BlobUrl = upload.Url,
                FileType = file.ContentType,
                FileSize = upload.Bytes,
                IssueId = issueId,
                SubTaskId = subTaskId,
                UploaderId = _currentUser.UserId,
            };

            var result = await _mediator.Send(new AddGenericCommand<Attachment>(attachment));
            var projectId = await ResolveProjectId(issueId);
            if (projectId.HasValue)
            {
                var action = string.IsNullOrWhiteSpace(uploaderName)
                    ? "AttachmentUploaded"
                    : $"AttachmentUploaded by {uploaderName}";
                await _activityService.Log(projectId.Value, action, nameof(Attachment), result.AttachmentId);
            }

            var response = ToResponse(result, uploaderName);
            await _boardHub.Clients.Group(issueId.ToString()).SendAsync("AttachmentAdded", response);

            return Ok(response);
        }

        private async Task<string> ResolveCurrentUploaderNameAsync()
        {
            var fromDb = await _context.Users
                .Where(u => u.UserId == _currentUser.UserId)
                .Select(u => (u.Prenom + " " + u.Nom).Trim())
                .FirstOrDefaultAsync();

            if (!string.IsNullOrWhiteSpace(fromDb))
                return fromDb;

            return _currentUser.DisplayName;
        }

        private static string ResolveUploaderName(Guid? uploaderId, System.Collections.Generic.Dictionary<Guid, string> uploaders)
        {
            if (uploaderId.HasValue && uploaders.TryGetValue(uploaderId.Value, out var name))
                return name;
            return null;
        }

        private async Task<Guid?> ResolveProjectId(Guid issueId)
        {
            return await _context.Issues
                .Where(i => i.IssueId == issueId)
                .Select(i => (Guid?)i.UserStory.Epic.ProjectId)
                .FirstOrDefaultAsync();
        }

        private static AttachmentResponseDto ToResponse(Attachment attachment, string uploaderName = null)
        {
            return new AttachmentResponseDto
            {
                AttachmentId = attachment.AttachmentId,
                FileName = attachment.FileName,
                BlobUrl = attachment.BlobUrl,
                FileType = attachment.FileType,
                FileSize = attachment.FileSize,
                IssueId = attachment.IssueId,
                SubTaskId = attachment.SubTaskId,
                UploaderId = attachment.UploaderId,
                UploaderName = uploaderName,
            };
        }
    }
}
