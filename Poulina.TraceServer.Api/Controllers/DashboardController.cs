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
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IProjectAuthorizationService _projectAuthorization;

        public DashboardController(
            AppDbContext context,
            ICurrentUserService currentUser,
            IProjectAuthorizationService projectAuthorization)
        {
            _context = context;
            _currentUser = currentUser;
            _projectAuthorization = projectAuthorization;
        }

        [HttpGet("my-projects")]
        public async Task<IActionResult> GetMyProjects(
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10,
            [FromQuery] string search = null)
        {
            if (page < 1) page = 1;
            if (limit < 1) limit = 10;
            if (limit > 10) limit = 10;

            var userId = _currentUser.UserId;

            var query = _context.Projects
                .Where(p => _currentUser.IsAdmin || p.OwnerId == userId || p.Members.Any(m => m.MemberId == userId));

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(p =>
                    p.ProjectName.ToLower().Contains(term) ||
                    p.Key.ToLower().Contains(term) ||
                    (p.ProjectDescription != null && p.ProjectDescription.ToLower().Contains(term)));
            }

            var total = await query.CountAsync();
            var skip = (page - 1) * limit;

            var projects = await query
                .OrderByDescending(p => p.UpdatedAt)
                .Skip(skip)
                .Take(limit)
                .Select(p => new ProjectResponseDto
                {
                    ProjectId = p.ProjectId,
                    ProjectName = p.ProjectName,
                    ProjectDescription = p.ProjectDescription,
                    Key = p.Key,
                    OwnerId = p.OwnerId,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt,
                    IsFinished = p.IsFinished,
                    FinishedAt = p.FinishedAt,
                    TotalCompletedPoints = p.TotalCompletedPoints,
                    ActiveSprintName = p.Sprints
                        .Where(s => s.Status == ItemStatus.InProgress)
                        .OrderByDescending(s => s.StartDate)
                        .Select(s => s.Name)
                        .FirstOrDefault(),
                    OpenIssueCount = _context.Issues.Count(i =>
                        i.UserStory.Epic.ProjectId == p.ProjectId &&
                        i.Status != ItemStatus.Done &&
                        i.Status != ItemStatus.Closed),
                })
                .ToListAsync();

            return Ok(new PagedResponseDto<ProjectResponseDto>
            {
                Items = projects,
                Page = page,
                Limit = limit,
                Total = total,
                HasMore = skip + projects.Count < total
            });
        }

        [HttpGet("active-sprint/{projectId}")]
        public async Task<IActionResult> GetActiveSprintSummary(Guid projectId)
        {
            if (!await _projectAuthorization.CanAccessProject(projectId))
                return Forbid();

            var sprint = await _context.Sprints
                .Where(s => s.ProjectId == projectId && s.Status == ItemStatus.InProgress)
                .OrderByDescending(s => s.StartDate)
                .FirstOrDefaultAsync();

            if (sprint == null)
                return Ok((ActiveSprintSummaryDto)null);

            var stories = _context.UserStories.Where(us => us.SprintId == sprint.SprintId);
            var issues = _context.Issues.Where(i => i.UserStory.SprintId == sprint.SprintId);

            return Ok(new ActiveSprintSummaryDto
            {
                SprintId = sprint.SprintId,
                Name = sprint.Name,
                ProjectId = sprint.ProjectId,
                TotalStories = await stories.CountAsync(),
                DoneStories = await stories.CountAsync(us => us.Status == SprintStatus.Done),
                TotalIssues = await issues.CountAsync(),
                DoneIssues = await issues.CountAsync(i => i.Status == ItemStatus.Done || i.Status == ItemStatus.Closed),
                CompletedPoints = sprint.CompletedPoints
            });
        }

        [HttpGet("sprint-board/{sprintId}")]
        public async Task<IActionResult> GetSprintBoard(Guid sprintId)
        {
            if (!await _projectAuthorization.CanAccessSprint(sprintId))
                return Forbid();

            var sprint = await _context.Sprints
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SprintId == sprintId);

            var issueEntities = await _context.Issues
                .AsNoTracking()
                .Where(i => i.UserStory.SprintId == sprintId && !i.isDeleted)
                .OrderBy(i => i.Order)
                .ToListAsync();

            var issues = issueEntities
                .Select(i => IssueMapper.ToResponse(i, _context))
                .ToList();

            var board = issues
                .GroupBy(i => i.Status)
                .Select(group => new BoardColumnDto
                {
                    Status = group.Key,
                    Issues = group.OrderBy(i => i.Order).ToList()
                });

            return Ok(new
            {
                SprintName = sprint?.Name ?? string.Empty,
                ProjectId = sprint?.ProjectId,
                Columns = board
            });
        }

        [HttpGet("team-workload/{projectId}")]
        public async Task<IActionResult> GetTeamWorkload(Guid projectId)
        {
            if (!await _projectAuthorization.CanAccessProject(projectId))
                return Forbid();

            var members = await _context.ProjectMembers
                .Where(pm => pm.ProjectId == projectId)
                .Select(pm => new TeamWorkloadDto
                {
                    MemberId = pm.MemberId,
                    MemberName = pm.Member.Nom + " " + pm.Member.Prenom,
                    OpenIssueCount = _context.Issues.Count(i =>
                        i.AssigneeId == pm.MemberId &&
                        i.UserStory.Epic.ProjectId == projectId &&
                        i.Status != ItemStatus.Done &&
                        i.Status != ItemStatus.Closed)
                })
                .ToListAsync();

            return Ok(members);
        }

        [HttpGet("burndown/{sprintId}")]
        public async Task<IActionResult> GetBurndown(Guid sprintId)
        {
            if (!await _projectAuthorization.CanAccessSprint(sprintId))
                return Forbid();

            var totalPoints = await _context.UserStories
                .Where(us => us.SprintId == sprintId)
                .SumAsync(us => us.StoryPoints);

            var donePoints = await _context.UserStories
                .Where(us => us.SprintId == sprintId && us.Status == SprintStatus.Done)
                .SumAsync(us => us.StoryPoints);

            return Ok(new[]
            {
                new ChartPointDto { Label = "Remaining", Value = totalPoints - donePoints },
                new ChartPointDto { Label = "Done", Value = donePoints }
            });
        }

        [HttpGet("velocity/{projectId}")]
        public async Task<IActionResult> GetVelocity(Guid projectId)
        {
            if (!await _projectAuthorization.CanAccessProject(projectId))
                return Forbid();

            var points = await _context.Sprints
                .Where(s => s.ProjectId == projectId && s.Status == ItemStatus.Closed)
                .OrderBy(s => s.EndDate)
                .Select(s => new ChartPointDto
                {
                    Label = s.Name,
                    Value = s.CompletedPoints
                })
                .ToListAsync();

            return Ok(points);
        }

        [HttpGet("blocked-overdue/{projectId}")]
        public async Task<IActionResult> GetBlockedOrOverdueIssues(Guid projectId)
        {
            if (!await _projectAuthorization.CanAccessProject(projectId))
                return Forbid();

            var issues = await _context.Issues
                .Where(i => i.UserStory.Epic.ProjectId == projectId && i.Status == ItemStatus.Review)
                .Select(i => new BlockedOrOverdueIssueDto
                {
                    IssueId = i.IssueId,
                    Title = i.Title,
                    Status = i.Status,
                    AssigneeId = i.AssigneeId,
                    UserStoryId = i.UserStoryId
                })
                .ToListAsync();

            return Ok(issues);
        }

        [HttpGet("home-stats")]
        public async Task<IActionResult> GetHomeStats()
        {
            var userId = _currentUser.UserId;
            var isGlobalView = _currentUser.IsAdmin;

            var accessibleProjectIds = _context.Projects
                .Where(p => _currentUser.IsAdmin || p.OwnerId == userId || p.Members.Any(m => m.MemberId == userId))
                .Select(p => p.ProjectId);

            var myIssues = _context.Issues.Where(i => i.AssigneeId == userId);
            var myOpenTasks = await myIssues.CountAsync(i => i.Status != ItemStatus.Done && i.Status != ItemStatus.Closed);
            var myDoneTasks = await myIssues.CountAsync(i => i.Status == ItemStatus.Done || i.Status == ItemStatus.Closed);

            var globalIssues = _context.Issues.Where(i => accessibleProjectIds.Contains(i.UserStory.Epic.ProjectId));
            var globalOpenTasks = await globalIssues.CountAsync(i => i.Status != ItemStatus.Done && i.Status != ItemStatus.Closed);
            var globalDoneTasks = await globalIssues.CountAsync(i => i.Status == ItemStatus.Done || i.Status == ItemStatus.Closed);
            var totalProjects = await accessibleProjectIds.CountAsync();
            var activeSprints = await _context.Sprints
                .CountAsync(s => accessibleProjectIds.Contains(s.ProjectId) && s.Status == ItemStatus.InProgress);
            var teamMembers = await _context.ProjectMembers
                .Where(pm => accessibleProjectIds.Contains(pm.ProjectId))
                .Select(pm => pm.MemberId)
                .Distinct()
                .CountAsync();

            var activeSprintIds = await _context.Sprints
                .Where(s => accessibleProjectIds.Contains(s.ProjectId) && s.Status == ItemStatus.InProgress)
                .Select(s => s.SprintId)
                .ToListAsync();

            var sprintIssues = _context.Issues.Where(i =>
                i.UserStory.SprintId.HasValue && activeSprintIds.Contains(i.UserStory.SprintId.Value));

            var sprintContributions = await sprintIssues
                .Where(i => i.AssigneeId.HasValue)
                .GroupBy(i => i.AssigneeId.Value)
                .Select(g => new DeveloperSprintStatsDto
                {
                    DeveloperName = _context.Users
                        .Where(u => u.UserId == g.Key)
                        .Select(u => u.Prenom + " " + u.Nom)
                        .FirstOrDefault(),
                    TotalTasks = g.Count(),
                    DoneTasks = g.Count(i => i.Status == ItemStatus.Done || i.Status == ItemStatus.Closed),
                })
                .OrderByDescending(x => x.DoneTasks)
                .Take(10)
                .ToListAsync();

            var contributorNames = sprintContributions
                .Select(c => c.DeveloperName)
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .Distinct()
                .ToList();

            var reviewFailures = await _context.ActivityLogs
                .Where(a =>
                    accessibleProjectIds.Contains(a.ProjectId) &&
                    a.Action == "IssueMovedToTodoFromReview")
                .CountAsync();

            var recentTasksQuery = isGlobalView
                ? globalIssues.OrderByDescending(i => i.Order).Take(3)
                : myIssues.OrderByDescending(i => i.Order).Take(3);

            var recentTasks = await recentTasksQuery
                .Select(i => new RecentIssueDto
                {
                    IssueId = i.IssueId,
                    Title = i.Title,
                    ProjectName = i.UserStory.Epic.Project.ProjectName,
                    ProjectKey = i.UserStory.Epic.Project.Key,
                    Status = i.Status,
                    UpdatedAt = DateTime.UtcNow,
                })
                .ToListAsync();

            var recentProjects = await _context.Projects
                .Where(p => accessibleProjectIds.Contains(p.ProjectId))
                .OrderByDescending(p => p.UpdatedAt)
                .Take(3)
                .Select(p => new RecentProjectDto
                {
                    ProjectId = p.ProjectId,
                    ProjectName = p.ProjectName,
                    Key = p.Key,
                    ActiveSprintName = p.Sprints
                        .Where(s => s.Status == ItemStatus.InProgress)
                        .OrderByDescending(s => s.StartDate)
                        .Select(s => s.Name)
                        .FirstOrDefault(),
                    UpdatedAt = p.UpdatedAt,
                })
                .ToListAsync();

            string aiRecommendation;
            if (isGlobalView)
            {
                aiRecommendation = globalOpenTasks > 20
                    ? $"Portfolio has {globalOpenTasks} open tasks across {totalProjects} projects. Review blocked items and rebalance sprint workloads."
                    : activeSprints > 0
                        ? $"{activeSprints} active sprint(s) with {teamMembers} contributors. Velocity looks healthy — keep daily stand-ups focused on review returns."
                        : "No active sprints detected. Plan the next sprint or groom the backlog.";
            }
            else
            {
                aiRecommendation = myOpenTasks > 5
                    ? $"You have {myOpenTasks} open tasks. Prioritize review items and close finished work to reduce sprint risk."
                    : myOpenTasks > 0
                        ? "Your workload looks balanced. Focus on in-progress tasks before picking up new ones."
                        : "No open tasks assigned. Check the sprint board or backlog for new work.";
            }

            return Ok(new HomeDashboardDto
            {
                IsGlobalView = isGlobalView,
                MyOpenTasks = myOpenTasks,
                MyDoneTasks = myDoneTasks,
                GlobalOpenTasks = globalOpenTasks,
                GlobalDoneTasks = globalDoneTasks,
                ActiveSprints = activeSprints,
                TotalProjects = totalProjects,
                TeamMembers = teamMembers,
                ReviewFailures = reviewFailures,
                ContributorCount = contributorNames.Count,
                ContributorNames = contributorNames,
                SprintContributions = sprintContributions,
                RecentTasks = recentTasks,
                RecentProjects = recentProjects,
                AiRecommendation = aiRecommendation,
            });
        }
    }
}
