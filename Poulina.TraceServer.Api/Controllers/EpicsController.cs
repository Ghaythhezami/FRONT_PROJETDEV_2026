using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgileAi.Api.Services;
using AgileAi.Data.Context;
using AgileAi.Domain.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace AgileAi.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class EpicsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IProjectAuthorizationService _projectAuthorization;

        public EpicsController(
            AppDbContext context,
            IProjectAuthorizationService projectAuthorization)
        {
            _context = context;
            _projectAuthorization = projectAuthorization;
        }

        [HttpGet("project/{projectId}")]
        public async Task<IActionResult> GetByProject(Guid projectId)
        {
            if (!await _projectAuthorization.CanAccessProject(projectId))
                return Forbid();

            var epics = await _context.Epics
                .Where(e => e.ProjectId == projectId)
                .Select(e => new
                {
                    e.EpicId,
                    e.Title,
                    e.Description,
                    e.ProjectId
                })
                .ToListAsync();

            return Ok(epics);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateEpicRequest request)
        {
            if (request == null || request.ProjectId == Guid.Empty || string.IsNullOrWhiteSpace(request.Title))
                return BadRequest();

            if (!await _projectAuthorization.CanManageProject(request.ProjectId))
                return Forbid();

            var epic = new Epic
            {
                EpicId = Guid.NewGuid(),
                Title = request.Title.Trim(),
                Description = request.Description?.Trim(),
                ProjectId = request.ProjectId
            };

            _context.Epics.Add(epic);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                epic.EpicId,
                epic.Title,
                epic.Description,
                epic.ProjectId
            });
        }

        public class CreateEpicRequest
        {
            public Guid ProjectId { get; set; }
            public string Title { get; set; }
            public string Description { get; set; }
        }
    }
}
