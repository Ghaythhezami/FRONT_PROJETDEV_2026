using System;
using System.Collections.Generic;
using System.Linq;
using AgileAi.Data.Context;
using AgileAi.Domain.Dto;
using AgileAi.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace AgileAi.Api.Services
{
    public static class IssueMapper
    {
        public static IssueResponseDto ToResponse(Issue issue, AppDbContext context)
        {
            var commentCount = context.Comments.Count(c => c.IssueId == issue.IssueId && !c.isDeleted);
            var attachmentCount = context.Attachments.Count(a => a.IssueId == issue.IssueId && !a.isDeleted);
            var subtasks = context.SubTasks
                .Where(st => st.IssueId == issue.IssueId && !st.isDeleted)
                .Select(st => new { st.IsCompleted })
                .ToList();
            var subtaskCount = subtasks.Count;
            var completedSubtasks = subtasks.Count(st => st.IsCompleted);
            var progressPercent = subtaskCount > 0
                ? (int)Math.Round(completedSubtasks * 100.0 / subtaskCount)
                : ProgressFromStatus(issue.Status);

            string assigneeName = null;
            string assigneePhotoUrl = null;
            var assignees = new List<IssueAssigneeDto>();

            if (issue.AssigneeId.HasValue)
            {
                var assignee = context.Users
                    .AsNoTracking()
                    .Where(u => u.UserId == issue.AssigneeId.Value)
                    .Select(u => new { u.UserId, Name = u.Prenom + " " + u.Nom, u.PhotoUrl })
                    .FirstOrDefault();
                if (assignee != null)
                {
                    assigneeName = assignee.Name?.Trim();
                    assigneePhotoUrl = assignee.PhotoUrl;
                    assignees.Add(new IssueAssigneeDto
                    {
                        UserId = assignee.UserId,
                        Name = assigneeName,
                        PhotoUrl = assignee.PhotoUrl,
                    });
                }
            }

            var commentAuthorIds = context.Comments
                .AsNoTracking()
                .Where(c => c.IssueId == issue.IssueId && !c.isDeleted && c.AuthorId != null)
                .Select(c => c.AuthorId.Value)
                .Distinct()
                .Take(5)
                .ToList();

            foreach (var authorId in commentAuthorIds)
            {
                if (assignees.Any(a => a.UserId == authorId))
                {
                    continue;
                }

                var author = context.Users
                    .AsNoTracking()
                    .Where(u => u.UserId == authorId)
                    .Select(u => new { u.UserId, Name = u.Prenom + " " + u.Nom, u.PhotoUrl })
                    .FirstOrDefault();
                if (author != null)
                {
                    assignees.Add(new IssueAssigneeDto
                    {
                        UserId = author.UserId,
                        Name = author.Name?.Trim(),
                        PhotoUrl = author.PhotoUrl,
                    });
                }
            }

            Guid? projectId = null;
            string projectName = null;
            string projectKey = null;
            Guid? sprintId = null;
            string sprintName = null;

            var storyMeta = context.UserStories
                .AsNoTracking()
                .Where(us => us.UserStoryId == issue.UserStoryId)
                .Select(us => new
                {
                    us.SprintId,
                    SprintName = us.Sprint != null ? us.Sprint.Name : null,
                    ProjectId = (Guid?)us.Epic.ProjectId,
                    ProjectName = us.Epic.Project.ProjectName,
                    ProjectKey = us.Epic.Project.Key,
                })
                .FirstOrDefault();

            if (storyMeta != null)
            {
                projectId = storyMeta.ProjectId;
                projectName = storyMeta.ProjectName;
                projectKey = storyMeta.ProjectKey;
                sprintId = storyMeta.SprintId;
                sprintName = storyMeta.SprintName;
            }

            return new IssueResponseDto
            {
                IssueId = issue.IssueId,
                Title = issue.Title,
                Status = issue.Status,
                Order = issue.Order,
                UserStoryId = issue.UserStoryId,
                AssigneeId = issue.AssigneeId,
                AssigneeName = assigneeName,
                AssigneePhotoUrl = assigneePhotoUrl,
                ProjectId = projectId,
                ProjectName = projectName,
                ProjectKey = projectKey,
                SprintId = sprintId,
                SprintName = sprintName,
                CommentCount = commentCount,
                AttachmentCount = attachmentCount,
                SubtaskCount = subtaskCount,
                CompletedSubtaskCount = completedSubtasks,
                ProgressPercent = progressPercent,
                Assignees = assignees,
            };
        }

        private static int ProgressFromStatus(ItemStatus status)
        {
            return status switch
            {
                ItemStatus.InProgress => 60,
                ItemStatus.Review => 80,
                ItemStatus.Done => 100,
                ItemStatus.Closed => 100,
                _ => 0,
            };
        }
    }

}
