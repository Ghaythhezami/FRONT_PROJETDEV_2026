using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgileAi.Api.Services;
using System;
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
    public class ProjectMembersController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IProjectAuthorizationService _projectAuthorization;
        private readonly AppDbContext _context;

        public ProjectMembersController(
            IMediator mediator,
            IProjectAuthorizationService projectAuthorization,
            AppDbContext context)
        {
            _mediator = mediator;
            _projectAuthorization = projectAuthorization;
            _context = context;
        }

        [HttpGet("project/{projectId}")]
        public async Task<IActionResult> GetProjectStaff(
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

            var query = _context.ProjectMembers
                .Include(pm => pm.Member)
                .Where(pm => pm.ProjectId == projectId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(pm =>
                    pm.Member.Nom.ToLower().Contains(term) ||
                    pm.Member.Prenom.ToLower().Contains(term) ||
                    pm.Member.Email.ToLower().Contains(term));
            }

            var total = await query.CountAsync();
            var skip = (page - 1) * limit;

            var members = await query
                .OrderBy(pm => pm.Member.Nom)
                .Skip(skip)
                .Take(limit)
                .ToListAsync();

            return Ok(new PagedResponseDto<ProjectMemberResponseDto>
            {
                Items = members.Select(ToResponse),
                Page = page,
                Limit = limit,
                Total = total,
                HasMore = skip + members.Count < total
            });
        }

        [HttpPost]
        public async Task<IActionResult> AddStaff([FromBody] CreateProjectMemberDto request)
        {
            if (request == null)
                return BadRequest();

            if (!await _projectAuthorization.CanManageProject(request.ProjectId))
                return Forbid();

            var result = await _mediator.Send(new AddProjectMemberCommand(request.ProjectId, request.MemberId));
            var loaded = await _context.ProjectMembers
                .Include(pm => pm.Member)
                .FirstOrDefaultAsync(pm => pm.ProjectMemberId == result.ProjectMemberId);
            return Ok(ToResponse(loaded ?? result));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> RemoveStaff(Guid id)
        {
            var member = await _context.ProjectMembers.FirstOrDefaultAsync(pm => pm.ProjectMemberId == id);

            if (member == null)
                return NotFound();

            if (!await _projectAuthorization.CanManageProject(member.ProjectId))
                return Forbid();

            var result = await _mediator.Send(new RemoveProjectMemberCommand(id));
            return result != null ? Ok(ToResponse(result)) : NotFound();
        }

        private static ProjectMemberResponseDto ToResponse(ProjectMember member)
        {
            var displayName = member.Member != null
                ? $"{member.Member.Prenom} {member.Member.Nom}".Trim()
                : string.Empty;

            return new ProjectMemberResponseDto
            {
                ProjectMemberId = member.ProjectMemberId,
                ProjectId = member.ProjectId,
                MemberId = member.MemberId,
                MemberName = displayName,
                MemberEmail = member.Member?.Email,
                Role = member.Member?.Role
            };
        }
    }
}
