using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgileAi.Api.Services;
using System;
using System.Linq;
using System.Threading.Tasks;
using AgileAi.Data.Context;
using AgileAi.Domain.Dto;

namespace AgileAi.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ActivityController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IProjectAuthorizationService _projectAuthorization;

        public ActivityController(AppDbContext context, IProjectAuthorizationService projectAuthorization)
        {
            _context = context;
            _projectAuthorization = projectAuthorization;
        }

        [HttpGet("project/{projectId}")]
        public async Task<IActionResult> GetProjectActivity(
            Guid projectId,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10,
            [FromQuery] string search = null)
        {
            if (!await _projectAuthorization.CanAccessProject(projectId))
                return Forbid();

            if (page < 1) page = 1;
            if (limit < 1) limit = 10;
            if (limit > 10) limit = 10;

            var query = _context.ActivityLogs.Where(a => a.ProjectId == projectId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(a => a.Action.ToLower().Contains(term) || a.EntityType.ToLower().Contains(term));
            }

            var total = await query.CountAsync();
            var skip = (page - 1) * limit;

            var activity = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip(skip)
                .Take(limit)
                .Select(a => new ActivityLogResponseDto
                {
                    ActivityLogId = a.ActivityLogId,
                    ProjectId = a.ProjectId,
                    ActorId = a.ActorId,
                    Action = a.Action,
                    EntityType = a.EntityType,
                    EntityId = a.EntityId,
                    CreatedAt = a.CreatedAt,
                    ActorName = a.ActorId.HasValue
                        ? _context.Users
                            .Where(u => u.UserId == a.ActorId.Value)
                            .Select(u => u.Prenom + " " + u.Nom)
                            .FirstOrDefault()
                        : null,
                    Description = a.Action,
                })
                .ToListAsync();

            return Ok(new PagedResponseDto<ActivityLogResponseDto>
            {
                Items = activity,
                Page = page,
                Limit = limit,
                Total = total,
                HasMore = skip + activity.Count < total,
            });
        }
    }
}
