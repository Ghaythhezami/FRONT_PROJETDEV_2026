import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  Issue,
  ItemPriority,
  ItemStatus,
  ITEM_PRIORITY_BADGE,
  ITEM_PRIORITY_LABELS,
} from '../../../models/domain.models';

@Component({
  selector: 'app-kanban-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <article
      draggable="true"
      class="cursor-grab rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md active:cursor-grabbing dark:border-white/[0.06] dark:bg-gray-900"
      [class.opacity-50]="dragging"
      (dragstart)="dragStart.emit($event)"
    >
      @if (priorityLabel) {
        <span
          class="mb-2 inline-block rounded-md px-2 py-0.5 text-xs font-medium"
          [ngClass]="priorityClass"
        >
          {{ priorityLabel }}
        </span>
      }

      <a
        [routerLink]="['/issues', issue.id]"
        [queryParams]="sprintId ? { sprintId: sprintId } : {}"
        [state]="{ issue: issue }"
        class="block text-sm font-semibold text-gray-900 hover:text-brand-600 dark:text-white/90"
        (click)="$event.stopPropagation()"
      >
        {{ issue.title }}
      </a>

      @if (issue.description) {
        <p class="mt-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
          {{ issue.description }}
        </p>
      }

      <div class="mt-4">
        <div class="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>Progress</span>
          <span>{{ progress }}%</span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            class="h-full rounded-full bg-teal-500 transition-all"
            [style.width.%]="progress"
          ></div>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between">
        <div class="flex -space-x-2">
          @if (issue.assigneeName) {
            <span
              class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700 ring-2 ring-white dark:ring-gray-900"
              [title]="issue.assigneeName"
            >
              {{ initials(issue.assigneeName) }}
            </span>
          } @else {
            <span class="text-xs text-gray-400">Unassigned</span>
          }
        </div>
        <div class="flex items-center gap-3 text-xs text-gray-400">
          <span class="inline-flex items-center gap-1" title="Attachments">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            {{ issue.attachmentCount ?? 0 }}
          </span>
          <span class="inline-flex items-center gap-1" title="Comments">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {{ issue.commentCount ?? 0 }}
          </span>
        </div>
      </div>
    </article>
  `,
})
export class KanbanCardComponent {
  @Input({ required: true }) issue!: Issue;
  @Input() sprintId = '';
  @Input() dragging = false;

  @Output() dragStart = new EventEmitter<DragEvent>();

  get progress(): number {
    return this.issue.progressPercent ?? 0;
  }

  get priorityLabel(): string {
    const p = Number(this.issue.priority ?? ItemPriority.Medium) as ItemPriority;
    return ITEM_PRIORITY_LABELS[p] ?? '';
  }

  get priorityClass(): string {
    const p = Number(this.issue.priority ?? ItemPriority.Medium) as ItemPriority;
    return ITEM_PRIORITY_BADGE[p] ?? ITEM_PRIORITY_BADGE[ItemPriority.Medium];
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  }
}
