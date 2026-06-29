import { ItemStatus, Sprint } from '../models/domain.models';

export function isSprintClosed(sprint: Sprint): boolean {
  return Number(sprint.status) === ItemStatus.Closed;
}

export function isSprintActive(sprint: Sprint): boolean {
  return Number(sprint.status) === ItemStatus.InProgress;
}

export function canStartSprint(sprint: Sprint): boolean {
  return !isSprintActive(sprint) && !isSprintClosed(sprint);
}

export function canCloseSprint(sprint: Sprint): boolean {
  return isSprintActive(sprint);
}

export function sprintStatusLabel(sprint: Sprint): string {
  const status = Number(sprint.status);
  if (status === ItemStatus.InProgress) {
    return 'Active';
  }
  if (status === ItemStatus.Closed) {
    return 'Closed';
  }
  return 'Planned';
}
