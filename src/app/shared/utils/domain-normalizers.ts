import {
  ActivityItem,
  ActiveSprintSummary,
  BurndownPoint,
  Issue,
  ItemStatus,
  Project,
  ProjectMember,
  Sprint,
  SprintBoard,
  TeamWorkloadMember,
  UserStory,
  VelocityPoint,
  KANBAN_COLUMNS,
  ITEM_STATUS_LABELS,
} from '../models/domain.models';
import { pickDto } from './api.util';
import { extractUuid } from './id.util';
import { API_BASE_URL } from '../config/api.config';

type Raw = Record<string, unknown>;

/** Maps backend Closed(5) to Done column for kanban display. */
export function normalizeIssueStatus(status: number): number {
  if (status === ItemStatus.Closed) {
    return ItemStatus.Done;
  }
  return status;
}

export function normalizeProject(raw: Raw): Project {
  const project = pickDto<Project>(raw, {
    id: ['projectId', 'ProjectId', 'id', 'Id'],
    projectName: ['projectName', 'ProjectName', 'name', 'Name'],
    projectDescription: ['projectDescription', 'ProjectDescription', 'description', 'Description'],
    key: ['key', 'Key'],
    memberCount: ['memberCount', 'MemberCount'],
    activeSprintName: ['activeSprintName', 'ActiveSprintName'],
    openIssueCount: ['openIssueCount', 'OpenIssueCount', 'openIssues', 'OpenIssues'],
    isFinished: ['isFinished', 'IsFinished'],
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
  sprint.projectId = extractUuid(raw, ['projectId', 'ProjectId']) || sprint.projectId;
  return sprint;
}

export function normalizeActiveSprintSummary(raw: Raw): ActiveSprintSummary {
  const summary = pickDto<ActiveSprintSummary>(raw, {
    sprintId: ['sprintId', 'SprintId'],
    name: ['name', 'Name'],
    projectId: ['projectId', 'ProjectId'],
    totalStories: ['totalStories', 'TotalStories'],
    doneStories: ['doneStories', 'DoneStories'],
    totalIssues: ['totalIssues', 'TotalIssues'],
    doneIssues: ['doneIssues', 'DoneIssues'],
    completedPoints: ['completedPoints', 'CompletedPoints'],
  });
  summary.sprintId = extractUuid(raw, ['sprintId', 'SprintId']) || summary.sprintId;
  summary.projectId = extractUuid(raw, ['projectId', 'ProjectId']) || summary.projectId;
  return summary;
}

export function normalizeUserStory(raw: Raw): UserStory {
  const story = pickDto<UserStory>(raw, {
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
  story.id = extractUuid(raw, ['userStoryId', 'UserStoryId', 'id', 'Id']) || story.id;
  story.epicId = extractUuid(raw, ['epicId', 'EpicId']) || story.epicId;
  return story;
}

export function normalizeIssue(raw: Raw): Issue {
  const rawStatus = Number(raw['status'] ?? raw['Status'] ?? ItemStatus.Todo);
  const issue = pickDto<Issue>(raw, {
    id: ['issueId', 'IssueId', 'id', 'Id'],
    title: ['title', 'Title'],
    status: ['status', 'Status'],
    order: ['order', 'Order'],
    userStoryId: ['userStoryId', 'UserStoryId'],
    assigneeId: ['assigneeId', 'AssigneeId'],
    assigneeName: ['assigneeName', 'AssigneeName'],
    assigneeAvatar: ['assigneePhotoUrl', 'AssigneePhotoUrl', 'assigneeAvatar', 'AssigneeAvatar'],
    assignees: ['assignees', 'Assignees'],
    sprintId: ['sprintId', 'SprintId'],
    projectId: ['projectId', 'ProjectId'],
    description: ['description', 'Description', 'note', 'Note'],
    priority: ['priority', 'Priority'],
    commentCount: ['commentCount', 'CommentCount', 'commentsCount', 'CommentsCount'],
    attachmentCount: [
      'attachmentCount',
      'AttachmentCount',
      'attachmentsCount',
      'AttachmentsCount',
    ],
    subtaskCount: ['subtaskCount', 'SubtaskCount'],
    completedSubtaskCount: ['completedSubtaskCount', 'CompletedSubtaskCount'],
    progressPercent: ['progressPercent', 'ProgressPercent', 'progress', 'Progress'],
    projectName: ['projectName', 'ProjectName'],
    projectKey: ['projectKey', 'ProjectKey'],
    sprintName: ['sprintName', 'SprintName'],
  });
  issue.id = extractUuid(raw, ['issueId', 'IssueId', 'id', 'Id']) || issue.id;
  issue.userStoryId = extractUuid(raw, ['userStoryId', 'UserStoryId']) || issue.userStoryId;
  issue.projectId = extractUuid(raw, ['projectId', 'ProjectId']) || issue.projectId;
  issue.sprintId = extractUuid(raw, ['sprintId', 'SprintId']) || issue.sprintId;
  issue.status = normalizeIssueStatus(rawStatus);

  const rawAssignees = raw['assignees'] ?? raw['Assignees'];
  if (Array.isArray(rawAssignees)) {
    issue.assignees = rawAssignees.map((a) => {
      const item = a as Raw;
      return {
        userId: extractUuid(item, ['userId', 'UserId']) || '',
        name: String(item['name'] ?? item['Name'] ?? '').trim(),
        photoUrl: String(item['photoUrl'] ?? item['PhotoUrl'] ?? '').trim() || undefined,
      };
    }).filter((a) => a.name || a.userId);
  } else if (issue.assigneeName && issue.assigneeId) {
    issue.assignees = [{
      userId: issue.assigneeId,
      name: issue.assigneeName,
      photoUrl: issue.assigneeAvatar,
    }];
  }

  if (issue.assigneeAvatar && issue.assignees?.length) {
    issue.assignees[0].photoUrl = issue.assignees[0].photoUrl || issue.assigneeAvatar;
  }

  if (issue.progressPercent === undefined) {
    issue.progressPercent = progressFromStatus(Number(issue.status));
  }
  return issue;
}

function progressFromStatus(status: number): number {
  switch (status) {
    case ItemStatus.InProgress:
      return 60;
    case ItemStatus.InReview:
      return 80;
    case ItemStatus.Done:
      return 100;
    default:
      return 0;
  }
}

export function normalizeProjectMember(raw: Raw): ProjectMember {
  const member = pickDto<ProjectMember>(raw, {
    id: ['id', 'Id', 'projectMemberId', 'ProjectMemberId'],
    projectId: ['projectId', 'ProjectId'],
    memberId: ['memberId', 'MemberId'],
    memberName: ['memberName', 'MemberName', 'nom', 'Nom'],
    memberEmail: ['memberEmail', 'MemberEmail', 'email', 'Email'],
    role: ['role', 'Role'],
  });
  member.id =
    extractUuid(raw, ['projectMemberId', 'ProjectMemberId', 'id', 'Id']) || member.id;
  if (!member.memberName) {
    const prenom = String(raw['prenom'] ?? raw['Prenom'] ?? '').trim();
    const nom = String(raw['nom'] ?? raw['Nom'] ?? '').trim();
    const combined = `${prenom} ${nom}`.trim();
    if (combined) {
      member.memberName = combined;
    }
  }
  return member;
}

export function normalizeActivity(raw: Raw): ActivityItem {
  const action = String(raw['action'] ?? raw['Action'] ?? '');
  const entityType = String(raw['entityType'] ?? raw['EntityType'] ?? '');
  const description =
    String(raw['description'] ?? raw['Description'] ?? raw['message'] ?? raw['Message'] ?? '') ||
    String(raw['action'] ?? raw['Action'] ?? '') ||
    [action, entityType].filter(Boolean).join(' · ');

  return {
    id: extractUuid(raw, ['activityLogId', 'ActivityLogId', 'id', 'Id']) || '',
    description,
    createdAt: String(raw['createdAt'] ?? raw['CreatedAt'] ?? ''),
    actorName: String(raw['actorName'] ?? raw['ActorName'] ?? raw['userName'] ?? raw['UserName'] ?? ''),
    type: entityType || action,
  };
}

export function normalizeTeamWorkload(raw: Raw): TeamWorkloadMember {
  const open = Number(raw['openIssueCount'] ?? raw['OpenIssueCount'] ?? 0);
  return {
    memberId: extractUuid(raw, ['memberId', 'MemberId']) || '',
    memberName: String(raw['memberName'] ?? raw['MemberName'] ?? 'Member'),
    assignedIssues: open,
    completedIssues: Number(raw['completedIssues'] ?? raw['CompletedIssues'] ?? 0),
  };
}

export function normalizeBurndownPoints(rawList: Raw[]): BurndownPoint[] {
  const remaining = rawList.find(
    (p) => String(p['label'] ?? p['Label']).toLowerCase() === 'remaining',
  );
  const done = rawList.find((p) => String(p['label'] ?? p['Label']).toLowerCase() === 'done');
  const remVal = Number(remaining?.['value'] ?? remaining?.['Value'] ?? 0);
  const doneVal = Number(done?.['value'] ?? done?.['Value'] ?? 0);
  const total = remVal + doneVal;

  return [
    { date: 'Start', remaining: total, ideal: total },
    { date: 'Now', remaining: remVal, ideal: Math.round(total / 2) },
  ];
}

export function normalizeVelocityPoints(rawList: Raw[]): VelocityPoint[] {
  return rawList.map((raw) => ({
    sprintName: String(raw['label'] ?? raw['Label'] ?? ''),
    completedPoints: Number(raw['value'] ?? raw['Value'] ?? 0),
  }));
}

export function normalizeAttachment(raw: Raw): import('../models/domain.models').Attachment {
  const blobUrl = String(raw['blobUrl'] ?? raw['BlobUrl'] ?? '');
  const resolvedUrl =
    blobUrl.startsWith('http') ? blobUrl : blobUrl ? `${API_BASE_URL}${blobUrl}` : undefined;

  const attachment = pickDto<import('../models/domain.models').Attachment>(raw, {
    id: ['attachmentId', 'AttachmentId', 'id', 'Id'],
    fileName: ['fileName', 'FileName', 'name', 'Name'],
    url: ['url', 'Url', 'fileUrl', 'FileUrl'],
    fileType: ['fileType', 'FileType'],
    issueId: ['issueId', 'IssueId'],
    uploaderId: ['uploaderId', 'UploaderId'],
    uploaderName: ['uploaderName', 'UploaderName'],
    uploadedAt: ['uploadedAt', 'UploadedAt', 'createdAt', 'CreatedAt'],
    sizeBytes: ['fileSize', 'FileSize', 'sizeBytes', 'SizeBytes'],
  });
  attachment.id =
    extractUuid(raw, ['attachmentId', 'AttachmentId', 'id', 'Id']) || attachment.id;
  if (!attachment.url && resolvedUrl) {
    attachment.url = resolvedUrl;
  }
  return attachment;
}

export function normalizeSprintBoard(raw: unknown, sprintId: string): SprintBoard {
  const mapColumns = (columnsRaw: Raw[]) =>
    columnsRaw.map((col) => ({
      status: normalizeIssueStatus(Number(col['status'] ?? col['Status'])) as ItemStatus,
      label: String(
        col['label'] ??
          col['Label'] ??
          ITEM_STATUS_LABELS[
            normalizeIssueStatus(Number(col['status'] ?? col['Status'])) as ItemStatus
          ] ??
          'Column',
      ),
      issues: ((col['issues'] ?? col['Issues'] ?? []) as Raw[]).map(normalizeIssue),
    }));

  if (Array.isArray(raw)) {
    return {
      sprintId,
      sprintName: '',
      columns: mapColumns(raw as Raw[]),
    };
  }

  const record = (raw ?? {}) as Raw;
  const projectId = extractUuid(record, ['projectId', 'ProjectId']);
  const columnsRaw = (record['columns'] ?? record['Columns']) as Raw[] | undefined;

  if (Array.isArray(columnsRaw) && columnsRaw.length > 0) {
    return {
      sprintId,
      sprintName: String(record['sprintName'] ?? record['SprintName'] ?? ''),
      projectId: projectId || undefined,
      columns: mapColumns(columnsRaw),
    };
  }

  const issues = ((record['issues'] ?? record['Issues'] ?? []) as Raw[]).map(normalizeIssue);
  return {
    sprintId,
    sprintName: String(record['sprintName'] ?? record['SprintName'] ?? ''),
    projectId: projectId || undefined,
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
