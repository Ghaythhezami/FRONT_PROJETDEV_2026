import {
  ActivityItem,
  Issue,
  Project,
  ProjectMember,
  Sprint,
  SprintBoard,
  UserStory,
  ItemStatus,
  KANBAN_COLUMNS,
  ITEM_STATUS_LABELS,
} from '../models/domain.models';
import { pickDto } from './api.util';
import { extractUuid } from './id.util';

type Raw = Record<string, unknown>;

export function normalizeProject(raw: Raw): Project {
  const project = pickDto<Project>(raw, {
    id: ['projectId', 'ProjectId', 'id', 'Id'],
    projectName: ['projectName', 'ProjectName', 'name', 'Name'],
    projectDescription: ['projectDescription', 'ProjectDescription', 'description', 'Description'],
    key: ['key', 'Key'],
    memberCount: ['memberCount', 'MemberCount'],
    activeSprintName: ['activeSprintName', 'ActiveSprintName'],
  });
  project.id = extractUuid(raw, ['projectId', 'ProjectId', 'id', 'Id']) || project.id;
  project.defaultEpicId = extractUuid(raw, ['epicId', 'EpicId', 'defaultEpicId', 'DefaultEpicId']);
  return project;
}

export function normalizeSprint(raw: Raw): Sprint {
  const sprint = pickDto<Sprint>(raw, {
    id: ['sprintId', 'SprintId', 'id', 'Id'],
    name: ['name', 'Name'],
    startDate: ['startDate', 'StartDate'],
    endDate: ['endDate', 'EndDate'],
    projectId: ['projectId', 'ProjectId'],
    status: ['status', 'Status'],
    completedPoints: ['completedPoints', 'CompletedPoints'],
  });
  sprint.id = extractUuid(raw, ['sprintId', 'SprintId', 'id', 'Id']) || sprint.id;
  sprint.projectId =
    extractUuid(raw, ['projectId', 'ProjectId']) || sprint.projectId;
  return sprint;
}

export function normalizeUserStory(raw: Raw): UserStory {
  return pickDto<UserStory>(raw, {
    id: ['id', 'Id', 'userStoryId', 'UserStoryId'],
    title: ['title', 'Title'],
    description: ['description', 'Description'],
    storyPoints: ['storyPoints', 'StoryPoints'],
    priority: ['priority', 'Priority'],
    moSCoW: ['moSCoW', 'MoSCoW', 'moscow'],
    epicId: ['epicId', 'EpicId'],
    sprintId: ['sprintId', 'SprintId'],
    status: ['status', 'Status'],
    projectId: ['projectId', 'ProjectId'],
  });
}

export function normalizeIssue(raw: Raw): Issue {
  const issue = pickDto<Issue>(raw, {
    id: ['issueId', 'IssueId', 'id', 'Id'],
    title: ['title', 'Title'],
    status: ['status', 'Status'],
    order: ['order', 'Order'],
    userStoryId: ['userStoryId', 'UserStoryId'],
    assigneeId: ['assigneeId', 'AssigneeId'],
    assigneeName: ['assigneeName', 'AssigneeName'],
    sprintId: ['sprintId', 'SprintId'],
    description: ['description', 'Description', 'note', 'Note'],
    priority: ['priority', 'Priority'],
    commentCount: ['commentCount', 'CommentCount', 'commentsCount', 'CommentsCount'],
    attachmentCount: [
      'attachmentCount',
      'AttachmentCount',
      'attachmentsCount',
      'AttachmentsCount',
    ],
    progressPercent: ['progressPercent', 'ProgressPercent', 'progress', 'Progress'],
  });
  issue.id = extractUuid(raw, ['issueId', 'IssueId', 'id', 'Id']) || issue.id;
  issue.userStoryId =
    extractUuid(raw, ['userStoryId', 'UserStoryId']) || issue.userStoryId;
  if (issue.progressPercent === undefined) {
    issue.progressPercent = progressFromStatus(Number(issue.status));
  }
  return issue;
}

function progressFromStatus(status: number): number {
  switch (status) {
    case 2:
      return 60;
    case 3:
      return 80;
    case 4:
      return 100;
    default:
      return 0;
  }
}

export function normalizeProjectMember(raw: Raw): ProjectMember {
  return pickDto<ProjectMember>(raw, {
    id: ['id', 'Id', 'projectMemberId', 'ProjectMemberId'],
    projectId: ['projectId', 'ProjectId'],
    memberId: ['memberId', 'MemberId'],
    memberName: ['memberName', 'MemberName', 'nom', 'Nom'],
    memberEmail: ['memberEmail', 'MemberEmail', 'email', 'Email'],
    role: ['role', 'Role'],
  });
}

export function normalizeActivity(raw: Raw): ActivityItem {
  return pickDto<ActivityItem>(raw, {
    id: ['id', 'Id', 'activityId', 'ActivityId'],
    description: ['description', 'Description', 'message', 'Message'],
    createdAt: ['createdAt', 'CreatedAt'],
    actorName: ['actorName', 'ActorName', 'userName', 'UserName'],
    type: ['type', 'Type'],
  });
}

export function normalizeSprintBoard(raw: Raw, sprintId: string): SprintBoard {
  const columnsRaw = (raw['columns'] ?? raw['Columns'] ?? raw['board'] ?? raw['Board']) as
    | Raw[]
    | undefined;

  if (Array.isArray(columnsRaw) && columnsRaw.length > 0) {
    return {
      sprintId,
      sprintName: String(raw['sprintName'] ?? raw['SprintName'] ?? ''),
      columns: columnsRaw.map((col) => ({
        status: Number(col['status'] ?? col['Status']) as ItemStatus,
        label: String(
          col['label'] ??
            col['Label'] ??
            ITEM_STATUS_LABELS[Number(col['status'] ?? col['Status']) as ItemStatus] ??
            'Column',
        ),
        issues: ((col['issues'] ?? col['Issues'] ?? []) as Raw[]).map(normalizeIssue),
      })),
    };
  }

  const issues = ((raw['issues'] ?? raw['Issues'] ?? []) as Raw[]).map(normalizeIssue);

  return {
    sprintId,
    sprintName: String(raw['sprintName'] ?? raw['SprintName'] ?? ''),
    columns: KANBAN_COLUMNS.map((status) => ({
      status,
      label: ITEM_STATUS_LABELS[status],
      issues: issues.filter((issue) => Number(issue.status) === status),
    })),
  };
}

export function normalizeArray<T>(body: unknown, normalizer: (raw: Raw) => T): T[] {
  if (!Array.isArray(body)) {
    return [];
  }
  return body.map((item) => normalizer(item as Raw));
}
