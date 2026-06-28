using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using AgileAi.Api.Hubs;
using AgileAi.Api.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
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
    public class CommentsController : ControllerBase
    {
        private static readonly Regex MentionRegex = new Regex(@"@\[(?<email>[^\]\s]+@[^\]\s]+)\]", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private readonly IMediator _mediator;
        private readonly ICurrentUserService _currentUser;
        private readonly IProjectAuthorizationService _projectAuthorization;
        private readonly AppDbContext _context;
        private readonly IActivityService _activityService;
        private readonly IHubContext<BoardHub> _boardHub;
        private readonly ICloudinaryStorageService _cloudinary;

        public CommentsController(
            IMediator mediator,
            ICurrentUserService currentUser,
            IProjectAuthorizationService projectAuthorization,
            AppDbContext context,
            IActivityService activityService,
            IHubContext<BoardHub> boardHub,
            ICloudinaryStorageService cloudinary)
        {
            _mediator = mediator;
            _currentUser = currentUser;
            _projectAuthorization = projectAuthorization;
            _context = context;
            _activityService = activityService;
            _boardHub = boardHub;
            _cloudinary = cloudinary;
        }

        [HttpGet("issue/{issueId}")]
        public async Task<IActionResult> GetCommentsForIssue(Guid issueId, [FromQuery] Guid? subTaskId = null)
        {
            if (!await _projectAuthorization.CanAccessIssue(issueId))
                return Forbid();

            var comments = await _context.Comments
                .Where(c => c.IssueId == issueId && !c.isDeleted &&
                    (subTaskId == null ? c.SubTaskId == null : c.SubTaskId == subTaskId))
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            var authorIds = comments
                .Where(c => c.AuthorId.HasValue && c.AuthorId.Value != Guid.Empty)
                .Select(c => c.AuthorId.Value)
                .Distinct()
                .ToList();

            var authors = await _context.Users
                .Where(u => authorIds.Contains(u.UserId))
                .Select(u => new { u.UserId, Name = (u.Prenom + " " + u.Nom).Trim() })
                .ToDictionaryAsync(u => u.UserId, u => u.Name);

            return Ok(comments.Select(comment =>
            {
                var authorName = ResolveAuthorName(comment.AuthorId, authors);
                return ToResponse(comment, null, authorName);
            }));
        }

        [HttpPost]
        public async Task<IActionResult> AddComment([FromBody] CreateCommentDto request)
        {
            if (request == null)
                return BadRequest();

            return await CreateCommentInternal(request.IssueId, request.Content, null, request.SubTaskId);
        }

        [HttpPost("with-attachment")]
        [RequestSizeLimit(25_000_000)]
        public async Task<IActionResult> AddCommentWithAttachment(
            [FromForm] Guid issueId,
            [FromForm] string content,
            [FromForm] IFormFile file,
            [FromForm] Guid? subTaskId = null)
        {
            if (issueId == Guid.Empty)
                return BadRequest(new ApiErrorResponse { Message = "IssueId is required.", Code = "ISSUE_REQUIRED" });

            if (file == null || file.Length == 0)
                return BadRequest(new ApiErrorResponse { Message = "A file is required.", Code = "FILE_REQUIRED" });

            var upload = await _cloudinary.UploadAsync(file);
            var attachmentNote = upload.ResourceType == "image"
                ? $"\n\n![{file.FileName}]({upload.Url})"
                : $"\n\n📎 [{file.FileName}]({upload.Url})";

            var mergedContent = string.IsNullOrWhiteSpace(content)
                ? attachmentNote.Trim()
                : $"{content.Trim()}{attachmentNote}";

            return await CreateCommentInternal(issueId, mergedContent, upload.Url, subTaskId);
        }

        private async Task<IActionResult> CreateCommentInternal(Guid issueId, string content, string mediaUrl, Guid? subTaskId = null)
        {
            if (string.IsNullOrWhiteSpace(content))
                return BadRequest(new ApiErrorResponse { Message = "Comment content is required.", Code = "CONTENT_REQUIRED" });

            if (!await _projectAuthorization.CanAccessIssue(issueId))
                return Forbid();

            if (_currentUser.UserId == Guid.Empty)
            {
                return Unauthorized(new ApiErrorResponse
                {
                    Message = "Could not resolve the signed-in user. Sign out and sign in again.",
                    Code = "USER_NOT_RESOLVED",
                });
            }

            var authorName = await ResolveCurrentAuthorNameAsync();

            var comment = new Comment
            {
                CommentId = Guid.NewGuid(),
                Content = content.Trim(),
                CreatedAt = DateTime.UtcNow,
                IssueId = issueId,
                SubTaskId = subTaskId,
                AuthorId = _currentUser.UserId,
            };

            var result = await _mediator.Send(new AddGenericCommand<Comment>(comment));
            var projectId = await GetProjectIdForIssue(result.IssueId);
            var mentionedUserIds = projectId.HasValue
                ? await ResolveMentionedUsers(projectId.Value, content)
                : new List<Guid>();

            await LogCommentActivity(result, projectId, authorName);
            await NotifyMentionedUsers(mentionedUserIds, result);

            var response = ToResponse(result, mentionedUserIds, authorName);
            if (!string.IsNullOrWhiteSpace(mediaUrl))
            {
                response.Content = content.Trim();
            }

            await _boardHub.Clients.Group(result.IssueId.ToString()).SendAsync("CommentAdded", response);
            return Ok(response);
        }

        private async Task<string> ResolveCurrentAuthorNameAsync()
        {
            var fromDb = await _context.Users
                .Where(u => u.UserId == _currentUser.UserId)
                .Select(u => (u.Prenom + " " + u.Nom).Trim())
                .FirstOrDefaultAsync();

            if (!string.IsNullOrWhiteSpace(fromDb))
                return fromDb;

            return _currentUser.DisplayName;
        }

        private static string ResolveAuthorName(Guid? authorId, Dictionary<Guid, string> authors)
        {
            if (authorId.HasValue && authorId.Value != Guid.Empty &&
                authors.TryGetValue(authorId.Value, out var name) &&
                !string.IsNullOrWhiteSpace(name))
            {
                return name;
            }

            return null;
        }

        private async Task<Guid?> GetProjectIdForIssue(Guid issueId)
        {
            return await _context.Issues
                .Where(i => i.IssueId == issueId)
                .Select(i => (Guid?)i.UserStory.Epic.ProjectId)
                .FirstOrDefaultAsync();
        }

        private async Task LogCommentActivity(Comment comment, Guid? projectId, string authorName)
        {
            if (projectId.HasValue)
            {
                var action = string.IsNullOrWhiteSpace(authorName)
                    ? "CommentAdded"
                    : $"CommentAdded by {authorName}";
                await _activityService.Log(projectId.Value, action, nameof(Comment), comment.CommentId);
            }
        }

        private async Task<List<Guid>> ResolveMentionedUsers(Guid projectId, string content)
        {
            var emails = MentionRegex.Matches(content ?? string.Empty)
                .Select(match => match.Groups["email"].Value.Trim())
                .Where(email => !string.IsNullOrWhiteSpace(email))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (!emails.Any())
                return new List<Guid>();

            return await _context.ProjectMembers
                .Where(pm => pm.ProjectId == projectId && emails.Contains(pm.Member.Email))
                .Select(pm => pm.MemberId)
                .Where(memberId => memberId != _currentUser.UserId)
                .Distinct()
                .ToListAsync();
        }

        private async Task NotifyMentionedUsers(IEnumerable<Guid> mentionedUserIds, Comment comment)
        {
            foreach (var userId in mentionedUserIds)
                await _activityService.Notify(userId, "You were mentioned in a comment.", $"/issues/{comment.IssueId}");
        }

        private static CommentResponseDto ToResponse(
            Comment comment,
            IEnumerable<Guid> mentionedUserIds = null,
            string authorName = null)
        {
            return new CommentResponseDto
            {
                CommentId = comment.CommentId,
                Content = comment.Content,
                CreatedAt = comment.CreatedAt,
                UpdatedAt = comment.UpdatedAt,
                IssueId = comment.IssueId,
                SubTaskId = comment.SubTaskId,
                AuthorId = comment.AuthorId,
                AuthorName = authorName,
                MentionedUserIds = mentionedUserIds ?? Array.Empty<Guid>()
            };
        }
    }

    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class SubTasksController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IProjectAuthorizationService _projectAuthorization;
        private readonly AppDbContext _context;
        private readonly IActivityService _activityService;
        private readonly IHubContext<BoardHub> _boardHub;

        public SubTasksController(
            IMediator mediator,
            IProjectAuthorizationService projectAuthorization,
            AppDbContext context,
            IActivityService activityService,
            IHubContext<BoardHub> boardHub)
        {
            _mediator = mediator;
            _projectAuthorization = projectAuthorization;
            _context = context;
            _activityService = activityService;
            _boardHub = boardHub;
        }

        [HttpGet("issue/{issueId}")]
        public async Task<IActionResult> GetByIssue(Guid issueId)
        {
            if (!await _projectAuthorization.CanAccessIssue(issueId))
                return Forbid();

            var subTasks = await _context.SubTasks
                .Where(st => st.IssueId == issueId)
                .OrderBy(st => st.Title)
                .ToListAsync();

            var assigneeIds = subTasks
                .Where(st => st.AssigneeId.HasValue)
                .Select(st => st.AssigneeId.Value)
                .Distinct()
                .ToList();

            var assignees = await _context.Users
                .Where(u => assigneeIds.Contains(u.UserId))
                .Select(u => new { u.UserId, Name = (u.Prenom + " " + u.Nom).Trim() })
                .ToDictionaryAsync(u => u.UserId, u => u.Name);

            return Ok(subTasks.Select(st => ToResponse(st, assignees)));
        }

        [HttpPost]
        public async Task<IActionResult> AddSubTask([FromBody] CreateSubTaskDto request)
        {
            if (request == null)
                return BadRequest();

            if (!await _projectAuthorization.CanAccessIssue(request.IssueId))
                return Forbid();

            var subTask = new SubTask
            {
                SubTaskId = Guid.NewGuid(),
                Title = request.Title,
                IssueId = request.IssueId,
                AssigneeId = request.AssigneeId,
                StartDate = DateTimeHelper.ToUtcDate(request.StartDate),
                DueDate = DateTimeHelper.ToUtcDate(request.DueDate),
                IsCompleted = false
            };

            var result = await _mediator.Send(new AddGenericCommand<SubTask>(subTask));
            await LogSubTaskActivity(result, "SubTaskCreated");
            var response = await ToResponseAsync(result);
            await _boardHub.Clients.Group(result.IssueId?.ToString() ?? string.Empty).SendAsync("SubTaskChanged", response);
            return Ok(response);
        }

        [HttpPut("{id}/toggle")]
        public async Task<IActionResult> ToggleSubTask(Guid id, [FromBody] UpdateSubTaskDto request)
        {
            if (request == null)
                return BadRequest();

            if (!await _projectAuthorization.CanAccessSubTask(id))
                return Forbid();

            var result = await _mediator.Send(new ToggleSubTaskCommand(
                id,
                request.Title,
                request.IsCompleted,
                request.IssueId,
                request.AssigneeId,
                DateTimeHelper.ToUtcDate(request.StartDate),
                DateTimeHelper.ToUtcDate(request.DueDate)));

            if (result != null)
            {
                await LogSubTaskActivity(result, "SubTaskUpdated");
                var response = await ToResponseAsync(result);
                await _boardHub.Clients.Group(result.IssueId?.ToString() ?? string.Empty).SendAsync("SubTaskChanged", response);
                return Ok(response);
            }

            return NotFound();
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSubTask(Guid id, [FromBody] UpdateSubTaskDto request)
        {
            if (request == null)
                return BadRequest();

            if (!await _projectAuthorization.CanAccessSubTask(id))
                return Forbid();

            var existing = await _context.SubTasks.FirstOrDefaultAsync(st => st.SubTaskId == id);
            if (existing == null)
                return NotFound();

            var result = await _mediator.Send(new ToggleSubTaskCommand(
                id,
                request.Title ?? existing.Title,
                request.IsCompleted,
                request.IssueId ?? existing.IssueId,
                request.AssigneeId,
                DateTimeHelper.ToUtcDate(request.StartDate),
                DateTimeHelper.ToUtcDate(request.DueDate)));

            if (result == null)
                return NotFound();

            await LogSubTaskActivity(result, "SubTaskUpdated");
            var response = await ToResponseAsync(result);
            await _boardHub.Clients.Group(result.IssueId?.ToString() ?? string.Empty).SendAsync("SubTaskChanged", response);
            return Ok(response);
        }

        private async Task LogSubTaskActivity(SubTask subTask, string action)
        {
            var projectId = await _context.SubTasks
                .Where(st => st.SubTaskId == subTask.SubTaskId && st.IssueId.HasValue)
                .Select(st => (Guid?)st.Issue.UserStory.Epic.ProjectId)
                .FirstOrDefaultAsync();

            if (projectId.HasValue)
                await _activityService.Log(projectId.Value, action, nameof(SubTask), subTask.SubTaskId);
        }

        private async Task<SubTaskResponseDto> ToResponseAsync(SubTask subTask)
        {
            string assigneeName = null;
            if (subTask.AssigneeId.HasValue)
            {
                assigneeName = await _context.Users
                    .Where(u => u.UserId == subTask.AssigneeId.Value)
                    .Select(u => (u.Prenom + " " + u.Nom).Trim())
                    .FirstOrDefaultAsync();
            }

            return ToResponse(subTask, null, assigneeName);
        }

        private static SubTaskResponseDto ToResponse(
            SubTask subTask,
            System.Collections.Generic.Dictionary<Guid, string> assignees = null,
            string assigneeName = null)
        {
            if (assigneeName == null && subTask.AssigneeId.HasValue && assignees != null)
            {
                assignees.TryGetValue(subTask.AssigneeId.Value, out assigneeName);
            }

            return new SubTaskResponseDto
            {
                SubTaskId = subTask.SubTaskId,
                Title = subTask.Title,
                IsCompleted = subTask.IsCompleted,
                IssueId = subTask.IssueId,
                AssigneeId = subTask.AssigneeId,
                AssigneeName = assigneeName,
                StartDate = subTask.StartDate,
                DueDate = subTask.DueDate,
            };
        }
    }
}
