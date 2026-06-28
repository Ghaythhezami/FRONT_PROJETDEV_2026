using MediatR;
using System;
using AgileAi.Domain.Models;

namespace AgileAi.Domain.Commands
{
    public class CreateProjectCommand : IRequest<Project>
    {
        public CreateProjectCommand(string projectName, string projectDescription, string key, Guid ownerId)
        {
            ProjectName = projectName;
            ProjectDescription = projectDescription;
            Key = key;
            OwnerId = ownerId;
        }

        public string ProjectName { get; }
        public string ProjectDescription { get; }
        public string Key { get; }
        public Guid OwnerId { get; }
    }

    public class AddProjectMemberCommand : IRequest<ProjectMember>
    {
        public AddProjectMemberCommand(Guid projectId, Guid memberId)
        {
            ProjectId = projectId;
            MemberId = memberId;
        }

        public Guid ProjectId { get; }
        public Guid MemberId { get; }
    }

    public class RemoveProjectMemberCommand : IRequest<ProjectMember>
    {
        public RemoveProjectMemberCommand(Guid projectMemberId)
        {
            ProjectMemberId = projectMemberId;
        }

        public Guid ProjectMemberId { get; }
    }

    public class CreateSprintCommand : IRequest<Sprint>
    {
        public CreateSprintCommand(string name, DateTime startDate, DateTime endDate, Guid projectId)
        {
            Name = name;
            StartDate = startDate;
            EndDate = endDate;
            ProjectId = projectId;
        }

        public string Name { get; }
        public DateTime StartDate { get; }
        public DateTime EndDate { get; }
        public Guid ProjectId { get; }
    }

    public class StartSprintCommand : IRequest<Sprint>
    {
        public StartSprintCommand(Guid sprintId)
        {
            SprintId = sprintId;
        }

        public Guid SprintId { get; }
    }

    public class CloseSprintCommand : IRequest<Sprint>
    {
        public CloseSprintCommand(Guid sprintId)
        {
            SprintId = sprintId;
        }

        public Guid SprintId { get; }
    }

    public class CreateUserStoryCommand : IRequest<UserStory>
    {
        public CreateUserStoryCommand(
            string title,
            string description,
            int storyPoints,
            ItemPriority priority,
            MoSCoW moSCoW,
            Guid epicId,
            Guid? sprintId,
            SprintStatus status)
        {
            Title = title;
            Description = description;
            StoryPoints = storyPoints;
            Priority = priority;
            MoSCoW = moSCoW;
            EpicId = epicId;
            SprintId = sprintId;
            Status = status;
        }

        public string Title { get; }
        public string Description { get; }
        public int StoryPoints { get; }
        public ItemPriority Priority { get; }
        public MoSCoW MoSCoW { get; }
        public Guid EpicId { get; }
        public Guid? SprintId { get; }
        public SprintStatus Status { get; }
    }

    public class AssignUserStoryToSprintCommand : IRequest<UserStory>
    {
        public AssignUserStoryToSprintCommand(Guid userStoryId, Guid? sprintId)
        {
            UserStoryId = userStoryId;
            SprintId = sprintId;
        }

        public Guid UserStoryId { get; }
        public Guid? SprintId { get; }
    }

    public class CreateIssueCommand : IRequest<Issue>
    {
        public CreateIssueCommand(string title, int order, Guid userStoryId, Guid? assigneeId)
        {
            Title = title;
            Order = order;
            UserStoryId = userStoryId;
            AssigneeId = assigneeId;
        }

        public string Title { get; }
        public int Order { get; }
        public Guid UserStoryId { get; }
        public Guid? AssigneeId { get; }
    }

    public class AssignIssueCommand : IRequest<Issue>
    {
        public AssignIssueCommand(Guid issueId, Guid? assigneeId)
        {
            IssueId = issueId;
            AssigneeId = assigneeId;
        }

        public Guid IssueId { get; }
        public Guid? AssigneeId { get; }
    }

    public class MoveIssueStatusCommand : IRequest<Issue>
    {
        public MoveIssueStatusCommand(Guid issueId, ItemStatus status, int order)
        {
            IssueId = issueId;
            Status = status;
            Order = order;
        }

        public Guid IssueId { get; }
        public ItemStatus Status { get; }
        public int Order { get; }
    }

    public class ToggleSubTaskCommand : IRequest<SubTask>
    {
        public ToggleSubTaskCommand(
            Guid subTaskId,
            string title,
            bool isCompleted,
            Guid? issueId,
            Guid? assigneeId = null,
            DateTime? startDate = null,
            DateTime? dueDate = null)
        {
            SubTaskId = subTaskId;
            Title = title;
            IsCompleted = isCompleted;
            IssueId = issueId;
            AssigneeId = assigneeId;
            StartDate = startDate;
            DueDate = dueDate;
        }

        public Guid SubTaskId { get; }
        public string Title { get; }
        public bool IsCompleted { get; }
        public Guid? IssueId { get; }
        public Guid? AssigneeId { get; }
        public DateTime? StartDate { get; }
        public DateTime? DueDate { get; }
    }
}
