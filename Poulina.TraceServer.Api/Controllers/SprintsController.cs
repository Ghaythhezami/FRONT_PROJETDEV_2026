using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgileAi.Api.Services;
using System;
using System.Collections.Generic;
using System.Linq;
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
    public class SprintsController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IProjectAuthorizationService _projectAuthorization;
        private readonly AppDbContext _context;

        public SprintsController(
            IMediator mediator,
            IProjectAuthorizationService projectAuthorization,
            AppDbContext context)
        {
            _mediator = mediator;
            _projectAuthorization = projectAuthorization;
            _context = context;
        }

        [HttpGet("project/{projectId}")]
        public async Task<IActionResult> GetSprintsByProject(
            Guid projectId,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10,
            [FromQuery] string search = null)
        {
            if (!await _projectAuthorization.CanAccessProject(projectId))
                return Forbid();

            if (page < 1) page = 1;
            if (limit < 1) limit = 10;
            if (limit > 100) limit = 100;

            var query = _context.Sprints.Where(s => s.ProjectId == projectId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(s => s.Name.ToLower().Contains(term));
            }

            var total = await query.CountAsync();
            var skip = (page - 1) * limit;

            var sprints = await query
                .OrderByDescending(s => s.StartDate)
                .Skip(skip)
                .Take(limit)
                .ToListAsync();

            return Ok(new PagedResponseDto<SprintResponseDto>
            {
                Items = sprints.Select(ToResponse),
                Page = page,
                Limit = limit,
                Total = total,
                HasMore = skip + sprints.Count < total
            });
        }

        [HttpPost]
        public async Task<IActionResult> CreateSprint([FromBody] CreateSprintDto request)
        {
            if (request == null)
                return BadRequest();

            if (!await _projectAuthorization.CanManageProject(request.ProjectId))
                return Forbid();

            if (request.EndDate <= request.StartDate)
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Sprint end date must be after start date.",
                    Code = "INVALID_SPRINT_DATES"
                });

            var result = await _mediator.Send(new CreateSprintCommand(
                request.Name,
                request.StartDate,
                request.EndDate,
                request.ProjectId));

            return Ok(ToResponse(result));
        }

        [HttpPost("{id}/start")]
        public async Task<IActionResult> StartSprint(Guid id)
        {
            if (!await _projectAuthorization.CanAccessSprint(id))
                return Forbid();

            var result = await _mediator.Send(new StartSprintCommand(id));
            return result != null ? Ok(ToResponse(result)) : NotFound();
        }

        [HttpPost("{id}/close")]
        public async Task<IActionResult> CloseSprint(Guid id)
        {
            if (!await _projectAuthorization.CanAccessSprint(id))
                return Forbid();

            var result = await _mediator.Send(new CloseSprintCommand(id));
            return result != null ? Ok(ToResponse(result)) : NotFound();
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSprint(Guid id, [FromBody] UpdateSprintDto request)
        {
            if (request == null)
                return BadRequest();

            if (!await _projectAuthorization.CanManageProject(request.ProjectId))
                return Forbid();

            if (request.EndDate <= request.StartDate)
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Sprint end date must be after start date.",
                    Code = "INVALID_SPRINT_DATES"
                });

            if (!Enum.IsDefined(typeof(ItemStatus), request.Status))
                return BadRequest(new ApiErrorResponse
                {
                    Message = "Invalid sprint status.",
                    Code = "INVALID_SPRINT_STATUS"
                });

            var sprint = new Sprint
            {
                SprintId = id,
                Name = request.Name,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                ProjectId = request.ProjectId,
                Status = request.Status,
                CompletedPoints = request.CompletedPoints
            };

            var result = await _mediator.Send(new PutGenericCommand<Sprint>(id, sprint));
            return Ok(ToResponse(result));
        }

        private static SprintResponseDto ToResponse(Sprint sprint)
        {
            return new SprintResponseDto
            {
                SprintId = sprint.SprintId,
                Name = sprint.Name,
                StartDate = sprint.StartDate,
                EndDate = sprint.EndDate,
                Status = sprint.Status,
                ProjectId = sprint.ProjectId,
                CompletedPoints = sprint.CompletedPoints
            };
        }
    }
}
