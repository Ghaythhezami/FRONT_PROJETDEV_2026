using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using AgileAi.Api.Hubs;
using AgileAi.Api.Services;
using System;
using System.Linq;
using System.Threading.Tasks;
using AgileAi.Data.Context;
using AgileAi.Domain.Commands;
using AgileAi.Domain.Dto;
using AgileAi.Domain.Handlers;
using AgileAi.Domain.Models;
using AgileAi.Domain.Queries;

namespace AgileAi.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class IssuesController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ICurrentUserService _currentUser;
        private readonly IProjectAuthorizationService _projectAuthorization;
        private readonly AppDbContext _context;
        private readonly IActivityService _activityService;
        private readonly IHubContext<BoardHub> _boardHub;

        public IssuesController(
            IMediator mediator,
            ICurrentUserService currentUser,
            IProjectAuthorizationService projectAuthorization,
            AppDbContext context,
            IActivityService activityService,
            IHubContext<BoardHub> boardHub)
        {
            _mediator = mediator;
            _currentUser = currentUser;
            _projectAuthorization = projectAuthorization;
            _context = context;
            _activityService = activityService;
            _boardHub = boardHub;
        }

        [HttpGet("board/{sprintId}")]
        public async Task<IActionResult> GetKanbanBoard(Guid sprintId)
        {
            if (!await _projectAuthorization.CanAccessSprint(sprintId))
                return Forbid();

            var query = new GetListGenericQuery<Issue>(i => i.UserStory.SprintId == sprintId);
            var result = await _mediator.Send(query);
            return Ok(result.Select(i => IssueMapper.ToResponse(i, _context)));
        }

        [HttpGet("my-tasks")]
        public async Task<IActionResult> GetMyTasks(
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10,
            [FromQuery] string search = null,
            [FromQuery] Guid? projectId = null,
            [FromQuery] int? status = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            if (page < 1) page = 1;
            if (limit < 1) limit = 10;
            if (limit > 10) limit = 10;

            var userId = _currentUser.UserId;
            if (userId == Guid.Empty)
            {
                return Ok(new PagedResponseDto<IssueResponseDto>
                {
                    Items = Array.Empty<IssueResponseDto>(),
                    Page = page,
                    Limit = limit,
                    Total = 0,
                    HasMore = false,
                });
            }

            var query = _context.Issues
                .Where(i => i.AssigneeId == userId);

            if (status.HasValue)
            {
                query = query.Where(i => (int)i.Status == status.Value);
            }

            if (projectId.HasValue && projectId.Value != Guid.Empty)
            {
                query = query.Where(i => i.UserStory.Epic.ProjectId == projectId.Value);
            }

            if (startDate.HasValue)
            {
                var start = DateTimeHelper.ToUtcDate(startDate.Value.Date) ?? startDate.Value.Date;
                query = query.Where(i =>
                    i.Comments.Any(c => c.CreatedAt >= start) ||
                    _context.ActivityLogs.Any(a =>
                        a.EntityId == i.IssueId &&
                        a.EntityType == nameof(Issue) &&
                        a.CreatedAt >= start));
            }

            if (endDate.HasValue)
            {
                var end = DateTimeHelper.ToUtcDate(endDate.Value.Date.AddDays(1).AddTicks(-1)) ??
                          endDate.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(i =>
                    i.Comments.Any(c => c.CreatedAt <= end) ||
                    _context.ActivityLogs.Any(a =>
                        a.EntityId == i.IssueId &&
                        a.EntityType == nameof(Issue) &&
                        a.CreatedAt <= end));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(i =>
                    i.Title.ToLower().Contains(term) ||
                    i.UserStory.Epic.Project.ProjectName.ToLower().Contains(term) ||
                    i.UserStory.Epic.Project.Key.ToLower().Contains(term));
            }

            var total = await query.CountAsync();
            var skip = (page - 1) * limit;

            var issues = await query
                .OrderByDescending(i => i.Order)
                .ThenBy(i => i.Title)
                .Skip(skip)
                .Take(limit)
                .ToListAsync();

            return Ok(new PagedResponseDto<IssueResponseDto>
            {
                Items = issues.Select(i => IssueMapper.ToResponse(i, _context)),
                Page = page,
                Limit = limit,
                Total = total,
                HasMore = skip + issues.Count < total
            });
        }

        [HttpGet("my-tasks/filters")]
        public async Task<IActionResult> GetMyTaskFilters()
        {
            var userId = _currentUser.UserId;
            var projects = await _context.Issues
                .Where(i => i.AssigneeId == userId)
                .Select(i => new
                {
                    i.UserStory.Epic.ProjectId,
                    i.UserStory.Epic.Project.ProjectName,
                    i.UserStory.Epic.Project.Key,
                })
                .Distinct()
                .OrderBy(p => p.ProjectName)
                .Select(p => new
                {
                    ProjectId = p.ProjectId,
                    ProjectName = p.ProjectName,
                    Key = p.Key,
                })
                .ToListAsync();

            return Ok(projects);
        }

        [HttpPost]
        public async Task<IActionResult> CreateIssue([FromBody] CreateIssueDto request)
        {
            if (request == null)
                return BadRequest();

            if (!await _projectAuthorization.CanAccessUserStory(request.UserStoryId))
                return Forbid();

            var result = await _mediator.Send(new CreateIssueCommand(
                request.Title,
                request.Order,
                request.UserStoryId,
                request.AssigneeId));

            await LogIssueActivity(result, "IssueCreated");
            await NotifyAssignee(result, "You were assigned to a new issue.");
            await _boardHub.Clients.Group(result.UserStoryId.ToString()).SendAsync("IssueChanged", IssueMapper.ToResponse(result, _context));

            return Ok(IssueMapper.ToResponse(result, _context));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateIssue(Guid id, [FromBody] UpdateIssueDto request)
        {
            if (request == null)
                return BadRequest();

            if (!await _projectAuthorization.CanAccessIssue(id))
                return Forbid();

            if (!await _projectAuthorization.CanAccessUserStory(request.UserStoryId))
                return Forbid();

            var existingIssue = await _mediator.Send(new GetGenericQuery<Issue>(i => i.IssueId == id));

            if (existingIssue == null)
                return NotFound();

            if (!Enum.IsDefined(typeof(ItemStatus), request.Status))
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Invalid issue status.",
                    Code = "INVALID_ISSUE_STATUS"
                });

            if (!WorkflowValidation.IsValidIssueStatusTransition(existingIssue.Status, request.Status))
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Invalid issue status transition.",
                    Code = "INVALID_ISSUE_STATUS_TRANSITION"
                });

            var issue = new Issue
            {
                IssueId = id,
                Title = request.Title,
                Status = request.Status,
                Order = request.Order,
                UserStoryId = request.UserStoryId,
                AssigneeId = request.AssigneeId
            };

            var result = await _mediator.Send(new PutGenericCommand<Issue>(id, issue));
            await LogIssueActivity(result, "IssueUpdated");
            await NotifyAssignee(result, "An issue assigned to you was updated.");
            await _boardHub.Clients.Group(result.UserStoryId.ToString()).SendAsync("IssueChanged", IssueMapper.ToResponse(result, _context));
            return Ok(IssueMapper.ToResponse(result, _context));
        }

        [HttpPatch("{id}/move")]
        public async Task<IActionResult> MoveIssue(Guid id, [FromBody] MoveIssueDto request)
        {
            if (request == null)
                return BadRequest();

            if (!await _projectAuthorization.CanAccessIssue(id))
                return Forbid();

            var existingIssue = await _mediator.Send(new GetGenericQuery<Issue>(i => i.IssueId == id));
            if (existingIssue == null)
                return NotFound();

            if (!Enum.IsDefined(typeof(ItemStatus), request.Status))
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Invalid issue status.",
                    Code = "INVALID_ISSUE_STATUS"
                });

            if (!WorkflowValidation.IsValidIssueStatusTransition(existingIssue.Status, request.Status))
                return BadRequest(new ApiErrorResponse
                {
                    Message = $"Cannot move this issue from {existingIssue.Status} to {request.Status}. Follow the workflow: To do → In progress → In review → Done.",
                    Code = "INVALID_ISSUE_STATUS_TRANSITION"
                });

            var result = await _mediator.Send(new MoveIssueStatusCommand(id, request.Status, request.Order));
            if (result != null)
            {
                var action = existingIssue.Status == ItemStatus.Review && request.Status == ItemStatus.Todo
                    ? "IssueMovedToTodoFromReview"
                    : "IssueMoved";
                await LogIssueActivity(result, action);
                await _boardHub.Clients.Group(result.UserStoryId.ToString()).SendAsync("IssueMoved", IssueMapper.ToResponse(result, _context));
            }
            return result != null ? Ok(IssueMapper.ToResponse(result, _context)) : NotFound();
        }

        [HttpPatch("{id}/assign")]
        public async Task<IActionResult> AssignIssue(Guid id, [FromBody] Guid? assigneeId)
        {
            if (!await _projectAuthorization.CanAccessIssue(id))
                return Forbid();

            var existing = await _context.Issues.FirstOrDefaultAsync(i => i.IssueId == id);
            if (existing == null)
                return NotFound();

            if (!_currentUser.IsAdmin)
            {
                if (assigneeId.HasValue && assigneeId.Value != _currentUser.UserId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiErrorResponse
                    {
                        Message = "Only admins can assign other team members. Use assign-me instead.",
                        Code = "ASSIGN_FORBIDDEN",
                    });
                }

                if (!assigneeId.HasValue && existing.AssigneeId != _currentUser.UserId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new ApiErrorResponse
                    {
                        Message = "You can only unassign yourself from this task.",
                        Code = "UNASSIGN_FORBIDDEN",
                    });
                }
            }

            var result = await _mediator.Send(new AssignIssueCommand(id, assigneeId));
            if (result != null)
            {
                await LogIssueActivity(result, "IssueAssigned");
                await NotifyAssignee(result, "You were assigned to an issue.");
                await _boardHub.Clients.Group(result.UserStoryId.ToString()).SendAsync("IssueChanged", IssueMapper.ToResponse(result, _context));
            }
            return result != null ? Ok(IssueMapper.ToResponse(result, _context)) : NotFound();
        }

        [HttpPost("{id}/assign-me")]
        public async Task<IActionResult> AssignMe(Guid id)
        {
            if (_currentUser.UserId == Guid.Empty)
                return Unauthorized();

            if (!await _projectAuthorization.CanAccessIssue(id))
                return Forbid();

            var result = await _mediator.Send(new AssignIssueCommand(id, _currentUser.UserId));
            if (result != null)
            {
                await LogIssueActivity(result, "IssueAssigned");
                await _boardHub.Clients.Group(result.UserStoryId.ToString()).SendAsync("IssueChanged", IssueMapper.ToResponse(result, _context));
            }
            return result != null ? Ok(IssueMapper.ToResponse(result, _context)) : NotFound();
        }

        [HttpPost("{id}/unassign-me")]
        public async Task<IActionResult> UnassignMe(Guid id)
        {
            if (_currentUser.UserId == Guid.Empty)
                return Unauthorized();

            if (!await _projectAuthorization.CanAccessIssue(id))
                return Forbid();

            var existing = await _context.Issues.FirstOrDefaultAsync(i => i.IssueId == id);
            if (existing == null)
                return NotFound();

            if (existing.AssigneeId != _currentUser.UserId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new ApiErrorResponse
                {
                    Message = "You are not assigned to this task.",
                    Code = "NOT_ASSIGNED",
                });
            }

            var result = await _mediator.Send(new AssignIssueCommand(id, null));
            if (result != null)
            {
                await LogIssueActivity(result, "IssueUnassigned");
                await _boardHub.Clients.Group(result.UserStoryId.ToString()).SendAsync("IssueChanged", IssueMapper.ToResponse(result, _context));
            }
            return result != null ? Ok(IssueMapper.ToResponse(result, _context)) : NotFound();
        }

        [HttpPost("{id}/auto-assign")]
        public async Task<IActionResult> AutoAssignIssue(Guid id)
        {
            if (!_currentUser.IsAdmin)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new ApiErrorResponse
                {
                    Message = "Auto-assign is available to admins only. Use assign-me to take this task.",
                    Code = "AUTO_ASSIGN_FORBIDDEN",
                });
            }

            if (!await _projectAuthorization.CanAccessIssue(id))
                return Forbid();

            var result = await _mediator.Send(new AutoAssignCommand(id));
            if (result != null)
            {
                await LogIssueActivity(result, "IssueAutoAssigned");
                await NotifyAssignee(result, "An issue was auto-assigned to you.");
                await _boardHub.Clients.Group(result.UserStoryId.ToString()).SendAsync("IssueChanged", IssueMapper.ToResponse(result, _context));
            }

            return result != null ? Ok(IssueMapper.ToResponse(result, _context)) : NotFound();
        }

        private async Task LogIssueActivity(Issue issue, string action)
        {
            var projectId = await _context.Issues
                .Where(i => i.IssueId == issue.IssueId)
                .Select(i => (Guid?)i.UserStory.Epic.ProjectId)
                .FirstOrDefaultAsync();

            if (projectId.HasValue)
                await _activityService.Log(projectId.Value, action, nameof(Issue), issue.IssueId);
        }

        private async Task NotifyAssignee(Issue issue, string message)
        {
            if (issue.AssigneeId.HasValue && issue.AssigneeId.Value != _currentUser.UserId)
                await _activityService.Notify(issue.AssigneeId.Value, message, $"/issues/{issue.IssueId}");
        }
    }
}
