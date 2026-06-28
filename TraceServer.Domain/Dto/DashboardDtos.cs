using System;
using System.Collections.Generic;
using AgileAi.Domain.Models;

namespace AgileAi.Domain.Dto
{
    public class ActiveSprintSummaryDto
    {
        public Guid SprintId { get; set; }
        public string Name { get; set; }
        public Guid ProjectId { get; set; }
        public int TotalStories { get; set; }
        public int DoneStories { get; set; }
        public int TotalIssues { get; set; }
        public int DoneIssues { get; set; }
        public int CompletedPoints { get; set; }
    }

    public class BoardColumnDto
    {
        public ItemStatus Status { get; set; }
        public IEnumerable<IssueResponseDto> Issues { get; set; }
    }

    public class TeamWorkloadDto
    {
        public Guid MemberId { get; set; }
        public string MemberName { get; set; }
        public int OpenIssueCount { get; set; }
    }

    public class ChartPointDto
    {
        public string Label { get; set; }
        public int Value { get; set; }
    }

    public class BlockedOrOverdueIssueDto
    {
        public Guid IssueId { get; set; }
        public string Title { get; set; }
        public ItemStatus Status { get; set; }
        public Guid? AssigneeId { get; set; }
        public Guid UserStoryId { get; set; }
    }

    public class HomeDashboardDto
    {
        public bool IsGlobalView { get; set; }
        public int MyOpenTasks { get; set; }
        public int MyDoneTasks { get; set; }
        public int GlobalOpenTasks { get; set; }
        public int GlobalDoneTasks { get; set; }
        public int ActiveSprints { get; set; }
        public int TotalProjects { get; set; }
        public int TeamMembers { get; set; }
        public int ReviewFailures { get; set; }
        public int ContributorCount { get; set; }
        public IEnumerable<string> ContributorNames { get; set; }
        public IEnumerable<DeveloperSprintStatsDto> SprintContributions { get; set; }
        public IEnumerable<RecentIssueDto> RecentTasks { get; set; }
        public IEnumerable<RecentProjectDto> RecentProjects { get; set; }
        public string AiRecommendation { get; set; }
    }

    public class DeveloperSprintStatsDto
    {
        public string DeveloperName { get; set; }
        public int TotalTasks { get; set; }
        public int DoneTasks { get; set; }
    }

    public class RecentIssueDto
    {
        public Guid IssueId { get; set; }
        public string Title { get; set; }
        public string ProjectName { get; set; }
        public string ProjectKey { get; set; }
        public ItemStatus Status { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class RecentProjectDto
    {
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; }
        public string Key { get; set; }
        public string ActiveSprintName { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
