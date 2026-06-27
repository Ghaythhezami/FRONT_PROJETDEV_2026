/** ItemStatus — backend enum 1..5 */
export enum ItemStatus {
  Todo = 1,
  InProgress = 2,
  InReview = 3,
  Done = 4,
  Closed = 5,
}

/** Active sprint summary from GET /api/Dashboard/active-sprint/{projectId} */
export interface ActiveSprintSummary {
  sprintId: string;
  name: string;
  projectId: string;
  totalStories: number;
  doneStories: number;
  totalIssues: number;
  doneIssues: number;
  completedPoints: number;
}

export enum ItemPriority {
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4,
}

export enum MoSCoW {
  Must = 1,
  Should = 2,
  Could = 3,
  Wont = 4,
}

export enum SprintStatus {
  Planned = 1,
  Active = 2,
  Completed = 3,
  Cancelled = 4,
}

export interface Project {
  id: string;
  projectName: string;
  projectDescription: string;
  key: string;
  memberCount?: number;
  activeSprintName?: string;
  defaultEpicId?: string;
}

export interface Epic {
  id: string;
  title: string;
  projectId?: string;
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  projectId: string;
  status: ItemStatus | SprintStatus | number;
  completedPoints?: number;
}

export interface UserStory {
  id: string;
  title: string;
  description: string;
  storyPoints: number;
  priority: ItemPriority | number;
  moSCoW: MoSCoW | number;
  epicId: string;
  sprintId?: string | null;
  status: SprintStatus | number;
  projectId?: string;
}

export interface Issue {
  id: string;
  title: string;
  status: ItemStatus | number;
  order: number;
  userStoryId: string;
  assigneeId?: string | null;
  assigneeName?: string;
  assigneeAvatar?: string;
  sprintId?: string;
  description?: string;
  priority?: ItemPriority | number;
  commentCount?: number;
  attachmentCount?: number;
  progressPercent?: number;
}

export interface BoardColumn {
  status: ItemStatus;
  label: string;
  issues: Issue[];
}

export interface SprintBoard {
  sprintId: string;
  sprintName: string;
  columns: BoardColumn[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  memberId: string;
  memberName?: string;
  memberEmail?: string;
  role?: string;
}

export interface ActivityItem {
  id: string;
  description: string;
  createdAt: string;
  actorName?: string;
  type?: string;
}

export interface Comment {
  id: string;
  content: string;
  issueId: string;
  authorName?: string;
  createdAt?: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  url?: string;
  issueId: string;
  uploadedAt?: string;
  sizeBytes?: number;
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
  issueId: string;
}

export interface DashboardProjectSummary extends Project {
  openIssues?: number;
  sprintProgress?: number;
}

export interface BurndownPoint {
  date: string;
  remaining: number;
  ideal: number;
}

export interface VelocityPoint {
  sprintName: string;
  completedPoints: number;
}

export interface TeamWorkloadMember {
  memberId: string;
  memberName: string;
  assignedIssues: number;
  completedIssues: number;
}

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  [ItemStatus.Todo]: 'To Do',
  [ItemStatus.InProgress]: 'In Progress',
  [ItemStatus.InReview]: 'In Review',
  [ItemStatus.Done]: 'Done',
  [ItemStatus.Closed]: 'Closed',
};

export const ITEM_STATUS_COLORS: Record<ItemStatus, string> = {
  [ItemStatus.Todo]: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  [ItemStatus.InProgress]: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  [ItemStatus.InReview]: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300',
  [ItemStatus.Done]: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300',
  [ItemStatus.Closed]: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-300',
};

/** Main board columns (matches design reference — 4 columns). */
export const KANBAN_COLUMNS: ItemStatus[] = [
  ItemStatus.Todo,
  ItemStatus.InProgress,
  ItemStatus.InReview,
  ItemStatus.Done,
];

export const KANBAN_COLUMN_UI: Record<
  ItemStatus,
  { label: string; columnBg: string; dot: string }
> = {
  [ItemStatus.Todo]: {
    label: 'To Do',
    columnBg: 'bg-[#fce7f3]',
    dot: 'bg-pink-400',
  },
  [ItemStatus.InProgress]: {
    label: 'In Progress',
    columnBg: 'bg-[#ffedd5]',
    dot: 'bg-orange-400',
  },
  [ItemStatus.InReview]: {
    label: 'In Review',
    columnBg: 'bg-[#dbeafe]',
    dot: 'bg-blue-400',
  },
  [ItemStatus.Done]: {
    label: 'Completed',
    columnBg: 'bg-[#ede9fe]',
    dot: 'bg-violet-400',
  },
  [ItemStatus.Closed]: {
    label: 'Closed',
    columnBg: 'bg-red-50',
    dot: 'bg-red-400',
  },
};

export const ITEM_PRIORITY_LABELS: Record<ItemPriority, string> = {
  [ItemPriority.Low]: 'Low',
  [ItemPriority.Medium]: 'Medium',
  [ItemPriority.High]: 'High',
  [ItemPriority.Critical]: 'High',
};

export const ITEM_PRIORITY_BADGE: Record<ItemPriority, string> = {
  [ItemPriority.Low]: 'bg-green-100 text-green-700',
  [ItemPriority.Medium]: 'bg-amber-100 text-amber-700',
  [ItemPriority.High]: 'bg-red-100 text-red-700',
  [ItemPriority.Critical]: 'bg-red-100 text-red-700',
};
