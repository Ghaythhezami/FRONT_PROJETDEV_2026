import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { PageBreadcrumbComponent } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { KanbanCardComponent } from '../../../../shared/components/agile/kanban-card/kanban-card.component';
import { IssueService } from '../../../../shared/services/issue.service';
import { UserStoryService } from '../../../../shared/services/user-story.service';
import { DashboardService } from '../../../../shared/services/dashboard.service';
import { BoardSignalrService } from '../../../../shared/services/board-signalr.service';
import { isUuid } from '../../../../shared/utils/id.util';
import {
  Issue,
  ItemStatus,
  KANBAN_COLUMNS,
  KANBAN_COLUMN_UI,
  UserStory,
} from '../../../../shared/models/domain.models';
import {
  AppAlertComponent,
  AppCardComponent,
  FormFieldComponent,
  FormSelectComponent,
  SelectOption,
  ToastService,
  UiButtonComponent,
} from '../../../../shared/ui';

@Component({
  selector: 'app-sprint-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PageBreadcrumbComponent,
    KanbanCardComponent,
    AppCardComponent,
    AppAlertComponent,
    UiButtonComponent,
    FormFieldComponent,
    FormSelectComponent,
  ],
  templateUrl: './sprint-board.component.html',
})
export class SprintBoardComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly issueService = inject(IssueService);
  private readonly userStoryService = inject(UserStoryService);
  private readonly dashboardService = inject(DashboardService);
  private readonly boardSignalr = inject(BoardSignalrService);
  private readonly toast = inject(ToastService);
  private hubSub?: Subscription;

  sprintId = '';
  sprintName = signal('');
  columns = signal<{ status: ItemStatus; issues: Issue[] }[]>([]);
  sprintStories = signal<UserStory[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  movingIssueId = signal<string | null>(null);

  newIssueTitle = '';
  newIssueStoryId = '';

  readonly boardColumns = KANBAN_COLUMNS;
  readonly columnUi = KANBAN_COLUMN_UI;

  get storyOptions(): SelectOption[] {
    return [
      { value: '', label: 'Select user story…' },
      ...this.sprintStories().map((s) => ({ value: s.id, label: s.title })),
    ];
  }

  ngOnInit(): void {
    this.sprintId = this.route.snapshot.paramMap.get('sprintId') ?? '';
    if (!isUuid(this.sprintId)) {
      this.errorMessage.set('Invalid sprint id in URL.');
      this.isLoading.set(false);
      return;
    }
    void this.boardSignalr.start();
    this.hubSub = this.boardSignalr.boardChanged$.subscribe(() => this.loadBoard());
    this.loadBoard();
    this.loadSprintStories();
  }

  ngOnDestroy(): void {
    this.hubSub?.unsubscribe();
  }

  loadBoard(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.dashboardService.getSprintBoard(this.sprintId).subscribe({
      next: (board) => {
        this.sprintName.set(board.sprintName);
        const columnMap = new Map(board.columns.map((c) => [c.status, c.issues]));
        this.columns.set(
          KANBAN_COLUMNS.map((status) => ({
            status,
            issues: columnMap.get(status) ?? [],
          })),
        );
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(
          error?.error?.message ?? error?.message ?? 'Unable to load board.',
        );
        this.isLoading.set(false);
      },
    });
  }

  private loadSprintStories(): void {
    this.userStoryService.getBySprint(this.sprintId, { page: 1, limit: 100 }).subscribe({
      next: (r) => this.sprintStories.set(r.items),
    });
  }

  createIssue(): void {
    if (!this.newIssueTitle.trim() || !this.newIssueStoryId) {
      this.toast.warning('Select a user story and enter a task title.');
      return;
    }
    this.issueService
      .create({
        Title: this.newIssueTitle.trim(),
        UserStoryId: this.newIssueStoryId,
        Order: 0,
      })
      .subscribe({
        next: () => {
          this.newIssueTitle = '';
          this.toast.success('Task created.');
          this.loadBoard();
        },
        error: (e) =>
          this.toast.error(e?.error?.message ?? e?.message ?? 'Could not create task.'),
      });
  }

  moveIssue(issue: Issue, newStatus: ItemStatus): void {
    if (Number(issue.status) === newStatus || !isUuid(issue.id)) {
      return;
    }
    this.movingIssueId.set(issue.id);
    this.issueService.move(issue.id, { Status: newStatus, Order: issue.order }).subscribe({
      next: () => {
        this.movingIssueId.set(null);
        this.loadBoard();
      },
      error: (e) => {
        this.movingIssueId.set(null);
        this.toast.error(e?.error?.message ?? 'Move failed.');
      },
    });
  }

  onDrop(event: DragEvent, status: ItemStatus): void {
    event.preventDefault();
    const issueId = event.dataTransfer?.getData('issueId');
    if (!issueId) {
      return;
    }
    const issue = this.columns()
      .flatMap((c) => c.issues)
      .find((i) => i.id === issueId);
    if (issue) {
      this.moveIssue(issue, status);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDragStart(event: DragEvent, issue: Issue): void {
    event.dataTransfer?.setData('issueId', issue.id);
  }
}
