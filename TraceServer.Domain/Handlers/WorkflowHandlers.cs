using MediatR;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AgileAi.Domain.Commands;
using AgileAi.Domain.Exceptions;
using AgileAi.Domain.Interfaces;
using AgileAi.Domain.Models;

namespace AgileAi.Domain.Handlers
{
    public class CreateProjectHandler : IRequestHandler<CreateProjectCommand, Project>
    {
        private readonly IGenericRepository<Project> _projectRepository;
        private readonly IGenericRepository<Epic> _epicRepository;

        public CreateProjectHandler(
            IGenericRepository<Project> projectRepository,
            IGenericRepository<Epic> epicRepository)
        {
            _projectRepository = projectRepository;
            _epicRepository = epicRepository;
        }

        public Task<Project> Handle(CreateProjectCommand request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.ProjectName))
                throw new BusinessValidationException("Project name is required.", "PROJECT_NAME_REQUIRED");

            if (string.IsNullOrWhiteSpace(request.Key))
                throw new BusinessValidationException("Project key is required.", "PROJECT_KEY_REQUIRED");

            if (request.OwnerId == Guid.Empty)
                throw new BusinessValidationException("Project owner is required.", "PROJECT_OWNER_REQUIRED");

            var existingProject = _projectRepository.Get(p => p.Key == request.Key);
            if (existingProject != null)
                throw new ResourceConflictException("Project key already exists.", "PROJECT_KEY_EXISTS");

            var project = _projectRepository.Add(new Project
            {
                ProjectId = Guid.NewGuid(),
                ProjectName = request.ProjectName,
                ProjectDescription = request.ProjectDescription,
                Key = request.Key,
                OwnerId = request.OwnerId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            _epicRepository.Add(new Epic
            {
                EpicId = Guid.NewGuid(),
                Title = "Main epic",
                Description = "Default epic for backlog items",
                ProjectId = project.ProjectId
            });

            return Task.FromResult(project);
        }
    }

    public class AddProjectMemberHandler : IRequestHandler<AddProjectMemberCommand, ProjectMember>
    {
        private readonly IGenericRepository<ProjectMember> _memberRepository;

        public AddProjectMemberHandler(IGenericRepository<ProjectMember> memberRepository)
        {
            _memberRepository = memberRepository;
        }

        public Task<ProjectMember> Handle(AddProjectMemberCommand request, CancellationToken cancellationToken)
        {
            if (request.ProjectId == Guid.Empty)
                throw new BusinessValidationException("Project is required.", "PROJECT_REQUIRED");

            if (request.MemberId == Guid.Empty)
                throw new BusinessValidationException("Member is required.", "MEMBER_REQUIRED");

            var existing = _memberRepository.Get(pm =>
                pm.ProjectId == request.ProjectId &&
                pm.MemberId == request.MemberId);

            if (existing != null)
                throw new ResourceConflictException("This user is already a member of the project.", "PROJECT_MEMBER_EXISTS");

            var member = new ProjectMember
            {
                ProjectMemberId = Guid.NewGuid(),
                ProjectId = request.ProjectId,
                MemberId = request.MemberId
            };

            return Task.FromResult(_memberRepository.Add(member));
        }
    }

    public class RemoveProjectMemberHandler : IRequestHandler<RemoveProjectMemberCommand, ProjectMember>
    {
        private readonly IGenericRepository<ProjectMember> _memberRepository;

        public RemoveProjectMemberHandler(IGenericRepository<ProjectMember> memberRepository)
        {
            _memberRepository = memberRepository;
        }

        public Task<ProjectMember> Handle(RemoveProjectMemberCommand request, CancellationToken cancellationToken)
        {
            var member = _memberRepository.Get(pm => pm.ProjectMemberId == request.ProjectMemberId);

            if (member == null)
                return Task.FromResult<ProjectMember>(null);

            member.isDeleted = true;
            return Task.FromResult(_memberRepository.Put(member));
        }
    }

    public class CreateSprintHandler : IRequestHandler<CreateSprintCommand, Sprint>
    {
        private readonly IGenericRepository<Sprint> _sprintRepository;

        public CreateSprintHandler(IGenericRepository<Sprint> sprintRepository)
        {
            _sprintRepository = sprintRepository;
        }

        public Task<Sprint> Handle(CreateSprintCommand request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new BusinessValidationException("Sprint name is required.", "SPRINT_NAME_REQUIRED");

            if (request.EndDate <= request.StartDate)
                throw new BusinessValidationException("Sprint end date must be after start date.", "INVALID_SPRINT_DATES");

            if (request.ProjectId == Guid.Empty)
                throw new BusinessValidationException("Project is required.", "PROJECT_REQUIRED");

            var sprint = new Sprint
            {
                SprintId = Guid.NewGuid(),
                Name = request.Name,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                ProjectId = request.ProjectId,
                Status = ItemStatus.Todo
            };

            return Task.FromResult(_sprintRepository.Add(sprint));
        }
    }

    public class StartSprintHandler : IRequestHandler<StartSprintCommand, Sprint>
    {
        private readonly IGenericRepository<Sprint> _sprintRepository;

        public StartSprintHandler(IGenericRepository<Sprint> sprintRepository)
        {
            _sprintRepository = sprintRepository;
        }

        public Task<Sprint> Handle(StartSprintCommand request, CancellationToken cancellationToken)
        {
            var sprint = _sprintRepository.Get(s => s.SprintId == request.SprintId);

            if (sprint == null)
                return Task.FromResult<Sprint>(null);

            if (sprint.Status == ItemStatus.Closed)
                throw new BusinessValidationException("Closed sprints cannot be started.", "SPRINT_ALREADY_CLOSED");

            sprint.Status = ItemStatus.InProgress;
            return Task.FromResult(_sprintRepository.Put(sprint));
        }
    }

    public class CloseSprintHandler : IRequestHandler<CloseSprintCommand, Sprint>
    {
        private readonly IGenericRepository<Sprint> _sprintRepository;
        private readonly IGenericRepository<UserStory> _storyRepository;

        public CloseSprintHandler(
            IGenericRepository<Sprint> sprintRepository,
            IGenericRepository<UserStory> storyRepository)
        {
            _sprintRepository = sprintRepository;
            _storyRepository = storyRepository;
        }

        public Task<Sprint> Handle(CloseSprintCommand request, CancellationToken cancellationToken)
        {
            var sprint = _sprintRepository.Get(s => s.SprintId == request.SprintId);

            if (sprint == null)
                return Task.FromResult<Sprint>(null);

            if (sprint.Status == ItemStatus.Closed)
                throw new BusinessValidationException("Sprint is already closed.", "SPRINT_ALREADY_CLOSED");

            var doneStories = _storyRepository.GetList(us =>
                us.SprintId == request.SprintId &&
                us.Status == SprintStatus.Done);

            sprint.CompletedPoints = doneStories.Sum(us => us.StoryPoints);
            sprint.Status = ItemStatus.Closed;

            return Task.FromResult(_sprintRepository.Put(sprint));
        }
    }

    public class CreateUserStoryHandler : IRequestHandler<CreateUserStoryCommand, UserStory>
    {
        private readonly IGenericRepository<UserStory> _storyRepository;

        public CreateUserStoryHandler(IGenericRepository<UserStory> storyRepository)
        {
            _storyRepository = storyRepository;
        }

        public Task<UserStory> Handle(CreateUserStoryCommand request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new BusinessValidationException("User story title is required.", "USER_STORY_TITLE_REQUIRED");

            if (request.StoryPoints <= 0)
                throw new BusinessValidationException("Story points must be greater than zero.", "INVALID_STORY_POINTS");

            if (request.EpicId == Guid.Empty)
                throw new BusinessValidationException("Epic is required.", "EPIC_REQUIRED");

            if (!Enum.IsDefined(typeof(ItemPriority), request.Priority))
                throw new BusinessValidationException("Invalid user story priority.", "INVALID_USER_STORY_PRIORITY");

            if (!Enum.IsDefined(typeof(MoSCoW), request.MoSCoW))
                throw new BusinessValidationException("Invalid MoSCoW value.", "INVALID_MOSCOW");

            if (!Enum.IsDefined(typeof(SprintStatus), request.Status))
                throw new BusinessValidationException("Invalid user story status.", "INVALID_USER_STORY_STATUS");

            var story = new UserStory
            {
                UserStoryId = Guid.NewGuid(),
                Title = request.Title,
                Description = request.Description,
                StoryPoints = request.StoryPoints,
                Priority = request.Priority,
                MoSCoW = request.MoSCoW,
                EpicId = request.EpicId,
                SprintId = request.SprintId,
                Status = request.Status
            };

            return Task.FromResult(_storyRepository.Add(story));
        }
    }

    public class AssignUserStoryToSprintHandler : IRequestHandler<AssignUserStoryToSprintCommand, UserStory>
    {
        private readonly IGenericRepository<UserStory> _storyRepository;

        public AssignUserStoryToSprintHandler(IGenericRepository<UserStory> storyRepository)
        {
            _storyRepository = storyRepository;
        }

        public Task<UserStory> Handle(AssignUserStoryToSprintCommand request, CancellationToken cancellationToken)
        {
            var story = _storyRepository.Get(us => us.UserStoryId == request.UserStoryId);

            if (story == null)
                return Task.FromResult<UserStory>(null);

            if (story.Status == SprintStatus.Done && request.SprintId == null)
                throw new BusinessValidationException("Completed user stories must belong to a sprint.", "DONE_STORY_REQUIRES_SPRINT");

            story.SprintId = request.SprintId;
            return Task.FromResult(_storyRepository.Put(story));
        }
    }

    public class CreateIssueHandler : IRequestHandler<CreateIssueCommand, Issue>
    {
        private readonly IGenericRepository<Issue> _issueRepository;

        public CreateIssueHandler(IGenericRepository<Issue> issueRepository)
        {
            _issueRepository = issueRepository;
        }

        public Task<Issue> Handle(CreateIssueCommand request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new BusinessValidationException("Issue title is required.", "ISSUE_TITLE_REQUIRED");

            if (request.Order < 0)
                throw new BusinessValidationException("Issue order cannot be negative.", "INVALID_ISSUE_ORDER");

            if (request.UserStoryId == Guid.Empty)
                throw new BusinessValidationException("User story is required.", "USER_STORY_REQUIRED");

            var issue = new Issue
            {
                IssueId = Guid.NewGuid(),
                Title = request.Title,
                Order = request.Order,
                UserStoryId = request.UserStoryId,
                AssigneeId = request.AssigneeId,
                Status = ItemStatus.Todo
            };

            return Task.FromResult(_issueRepository.Add(issue));
        }
    }

    public class AssignIssueHandler : IRequestHandler<AssignIssueCommand, Issue>
    {
        private readonly IGenericRepository<Issue> _issueRepository;

        public AssignIssueHandler(IGenericRepository<Issue> issueRepository)
        {
            _issueRepository = issueRepository;
        }

        public Task<Issue> Handle(AssignIssueCommand request, CancellationToken cancellationToken)
        {
            var issue = _issueRepository.Get(i => i.IssueId == request.IssueId);

            if (issue == null)
                return Task.FromResult<Issue>(null);

            issue.AssigneeId = request.AssigneeId;
            return Task.FromResult(_issueRepository.Put(issue));
        }
    }

    public class MoveIssueStatusHandler : IRequestHandler<MoveIssueStatusCommand, Issue>
    {
        private readonly IGenericRepository<Issue> _issueRepository;

        public MoveIssueStatusHandler(IGenericRepository<Issue> issueRepository)
        {
            _issueRepository = issueRepository;
        }

        public Task<Issue> Handle(MoveIssueStatusCommand request, CancellationToken cancellationToken)
        {
            var issue = _issueRepository.Get(i => i.IssueId == request.IssueId);

            if (issue == null)
                return Task.FromResult<Issue>(null);

            if (!Enum.IsDefined(typeof(ItemStatus), request.Status))
                throw new BusinessValidationException("Invalid issue status.", "INVALID_ISSUE_STATUS");

            if (!WorkflowValidation.IsValidIssueStatusTransition(issue.Status, request.Status))
                throw new BusinessValidationException("Invalid issue status transition.", "INVALID_ISSUE_STATUS_TRANSITION");

            if (request.Order < 0)
                throw new BusinessValidationException("Issue order cannot be negative.", "INVALID_ISSUE_ORDER");

            issue.Status = request.Status;
            issue.Order = request.Order;

            return Task.FromResult(_issueRepository.Put(issue));
        }
    }

    public class ToggleSubTaskHandler : IRequestHandler<ToggleSubTaskCommand, SubTask>
    {
        private readonly IGenericRepository<SubTask> _subTaskRepository;

        public ToggleSubTaskHandler(IGenericRepository<SubTask> subTaskRepository)
        {
            _subTaskRepository = subTaskRepository;
        }

        public Task<SubTask> Handle(ToggleSubTaskCommand request, CancellationToken cancellationToken)
        {
            var subTask = _subTaskRepository.Get(st => st.SubTaskId == request.SubTaskId);

            if (subTask == null)
                return Task.FromResult<SubTask>(null);

            if (string.IsNullOrWhiteSpace(request.Title))
                throw new BusinessValidationException("Subtask title is required.", "SUBTASK_TITLE_REQUIRED");

            subTask.Title = request.Title;
            subTask.IsCompleted = request.IsCompleted;
            subTask.IssueId = request.IssueId;
            subTask.AssigneeId = request.AssigneeId;
            subTask.StartDate = NormalizeUtc(request.StartDate);
            subTask.DueDate = NormalizeUtc(request.DueDate);

            return Task.FromResult(_subTaskRepository.Put(subTask));
        }

        private static DateTime? NormalizeUtc(DateTime? value)
        {
            if (!value.HasValue)
            {
                return null;
            }

            var date = value.Value;
            return date.Kind == DateTimeKind.Utc
                ? date
                : DateTime.SpecifyKind(date, DateTimeKind.Utc);
        }
    }

    public static class WorkflowValidation
    {
        public static bool IsValidIssueStatusTransition(ItemStatus currentStatus, ItemStatus nextStatus)
        {
            if (currentStatus == nextStatus)
                return true;

            switch (currentStatus)
            {
                case ItemStatus.Todo:
                    return nextStatus == ItemStatus.InProgress;
                case ItemStatus.InProgress:
                    return nextStatus == ItemStatus.Todo || nextStatus == ItemStatus.Review;
                case ItemStatus.Review:
                    return nextStatus == ItemStatus.InProgress || nextStatus == ItemStatus.Done;
                case ItemStatus.Done:
                    return nextStatus == ItemStatus.Review || nextStatus == ItemStatus.Closed;
                default:
                    return false;
            }
        }
    }
}
