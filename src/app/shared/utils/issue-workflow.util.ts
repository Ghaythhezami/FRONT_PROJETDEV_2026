import { ItemStatus } from '../models/domain.models';

const ALLOWED: Record<ItemStatus, ItemStatus[]> = {
  [ItemStatus.Todo]: [ItemStatus.InProgress],
  [ItemStatus.InProgress]: [ItemStatus.Todo, ItemStatus.InReview],
  [ItemStatus.InReview]: [ItemStatus.InProgress, ItemStatus.Done],
  [ItemStatus.Done]: [ItemStatus.InReview, ItemStatus.Closed],
  [ItemStatus.Closed]: [],
};

/** Backend workflow rules — keep in sync with WorkflowValidation.IsValidIssueStatusTransition */
export function canTransitionIssue(from: ItemStatus | number, to: ItemStatus): boolean {
  const current = Number(from) as ItemStatus;
  if (current === to) {
    return true;
  }
  return ALLOWED[current]?.includes(to) ?? false;
}

export function issueTransitionError(from: ItemStatus | number, to: ItemStatus): string {
  const current = Number(from) as ItemStatus;
  const labels: Record<ItemStatus, string> = {
    [ItemStatus.Todo]: 'To do',
    [ItemStatus.InProgress]: 'In progress',
    [ItemStatus.InReview]: 'In review',
    [ItemStatus.Done]: 'Done',
    [ItemStatus.Closed]: 'Closed',
  };
  return `Cannot move from "${labels[current] ?? 'Unknown'}" to "${labels[to]}". Use the allowed workflow steps.`;
}
