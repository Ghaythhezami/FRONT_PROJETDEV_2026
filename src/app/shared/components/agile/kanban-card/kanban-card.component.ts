import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  Issue,
  IssueAssignee,
  ItemPriority,
  ItemStatus,
  ITEM_PRIORITY_BADGE,
  ITEM_PRIORITY_LABELS,
  KANBAN_COLUMN_UI,
} from '../../../models/domain.models';

const STATUS_TAG: Partial<Record<ItemStatus, { label: string; cls: string }>> = {
  [ItemStatus.Todo]: { label: 'Not started', cls: 'bg-violet-100 text-violet-700' },
  [ItemStatus.InProgress]: { label: 'In progress', cls: 'bg-amber-100 text-amber-800' },
  [ItemStatus.InReview]: { label: 'In review', cls: 'bg-sky-100 text-sky-800' },
  [ItemStatus.Done]: { label: 'Complete', cls: 'bg-emerald-100 text-emerald-800' },
};

@Component({
  selector: 'app-kanban-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <article
      draggable="true"
      class="group min-w-0 cursor-grab overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing dark:border-white/[0.08] dark:bg-gray-900"
      [class.opacity-60]="dragging"
      [class.scale-[0.98]]="dragging"
      (dragstart)="dragStart.emit($event)"
    >
      <div class="mb-3 flex items-start justify-between gap-2">
        @if (statusTag) {
          <span class="rounded-full px-2.5 py-0.5 text-[11px] font-medium" [ngClass]="statusTag.cls">
            {{ statusTag.label }}
          </span>
        }
      </div>

      <a
        [routerLink]="['/issues', issue.id]"
        [queryParams]="sprintId ? { sprintId: sprintId } : {}"
        [state]="{ issue: issue }"
        class="block truncate text-sm font-semibold leading-snug text-gray-900 hover:text-brand-600 dark:text-white/90"
        (click)="$event.stopPropagation()"
      >
        {{ issue.title }}
      </a>

      @if (issue.description) {
        <p class="mt-2 line-clamp-2 break-words text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {{ issue.description }}
        </p>
      }

      <div class="mt-4">
        <p class="mb-1.5 text-[11px] font-medium text-gray-500">Assignees</p>
        <div class="flex items-center">
          <div class="flex -space-x-2">
            @for (member of visibleAssignees; track member.userId) {
              <a
                [routerLink]="memberLink(member)"
                [title]="member.name"
                class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700 ring-2 ring-white transition hover:z-10 hover:scale-110 dark:ring-gray-900"
                (click)="$event.stopPropagation()"
              >
                {{ initials(member.name) }}
              </a>
            } @empty {
              <span class="text-xs text-gray-400">Unassigned</span>
            }
            @if (extraAssigneeCount > 0) {
              <span
                class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600 ring-2 ring-white dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-900"
                [title]="extraAssigneeNames"
              >
                +{{ extraAssigneeCount }}
              </span>
            }
          </div>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-white/[0.06]">
        <div class="flex items-center gap-3 text-[11px] text-gray-500">
          <span class="inline-flex items-center gap-1" title="Comments">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {{ issue.commentCount ?? 0 }}
          </span>
          <span class="inline-flex items-center gap-1" title="Subtasks">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            {{ subtaskLabel }}
          </span>
          <span class="inline-flex items-center gap-1" title="Progress">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ progress }}%
          </span>
        </div>
        @if (priorityLabel) {
          <span class="rounded-md px-2 py-0.5 text-[11px] font-semibold" [ngClass]="priorityClass">
            {{ priorityLabel }}
          </span>
        }
      </div>
    </article>
  `,
})
export class KanbanCardComponent {
  @Input({ required: true }) issue!: Issue;
  @Input() sprintId = '';
  @Input() projectId = '';
  @Input() dragging = false;

  @Output() dragStart = new EventEmitter<DragEvent>();

  private readonly maxVisibleAssignees = 3;

  get assigneeList(): IssueAssignee[] {
    if (this.issue.assignees?.length) {
      return this.issue.assignees;
    }
    if (this.issue.assigneeName) {
      return [{ userId: this.issue.assigneeId ?? '', name: this.issue.assigneeName }];
    }
    return [];
  }

  get visibleAssignees(): IssueAssignee[] {
    return this.assigneeList.slice(0, this.maxVisibleAssignees);
  }

  get extraAssigneeCount(): number {
    return Math.max(0, this.assigneeList.length - this.maxVisibleAssignees);
  }

  get extraAssigneeNames(): string {
    return this.assigneeList
      .slice(this.maxVisibleAssignees)
      .map((a) => a.name)
      .join(', ');
  }

  get subtaskLabel(): string {
    const total = this.issue.subtaskCount ?? 0;
    const done = this.issue.completedSubtaskCount ?? 0;
    if (!total) {
      return '0';
    }
    return `${done}/${total}`;
  }

  get progress(): number {
    return this.issue.progressPercent ?? 0;
  }

  get statusTag(): { label: string; cls: string } | null {
    const status = Number(this.issue.status) as ItemStatus;
    return STATUS_TAG[status] ?? {
      label: KANBAN_COLUMN_UI[status]?.label ?? 'Task',
      cls: 'bg-gray-100 text-gray-600',
    };
  }

  get priorityLabel(): string {
    const p = Number(this.issue.priority ?? ItemPriority.Medium) as ItemPriority;
    return ITEM_PRIORITY_LABELS[p] ?? '';
  }

  get priorityClass(): string {
    const p = Number(this.issue.priority ?? ItemPriority.Medium) as ItemPriority;
    return ITEM_PRIORITY_BADGE[p] ?? ITEM_PRIORITY_BADGE[ItemPriority.Medium];
  }

  memberLink(member: IssueAssignee): string[] {
    if (this.projectId) {
      return ['/projects', this.projectId];
    }
    return ['/my-tasks'];
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  }
}
