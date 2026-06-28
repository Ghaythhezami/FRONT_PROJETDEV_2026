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
  canTransitionIssue,
  issueTransitionError,
} from '../../../../shared/utils/issue-workflow.util';
import { extractApiErrorMessage } from '../../../../shared/utils/api-error.util';
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
  private refreshTimer?: ReturnType<typeof setTimeout>;
  private boardLoaded = false;
  private suppressRefreshUntil = 0;

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
    this.hubSub = this.boardSignalr.boardChanged$.subscribe(() => {
      if (Date.now() < this.suppressRefreshUntil) {
        return;
      }
      this.scheduleSilentRefresh();
    });
    this.loadBoard(true);
    this.loadSprintStories();
  }

  ngOnDestroy(): void {
    this.hubSub?.unsubscribe();
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }

  loadBoard(showSpinner = false): void {
    if (showSpinner || !this.boardLoaded) {
      this.isLoading.set(true);
    }
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
        this.boardLoaded = true;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(extractApiErrorMessage(error, 'Unable to load board.'));
        this.isLoading.set(false);
      },
    });
  }

  private scheduleSilentRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = setTimeout(() => this.loadBoard(false), 400);
  }

  private loadSprintStories(): void {
    this.userStoryService.getBySprint(this.sprintId, { page: 1, limit: 10 }).subscribe({
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
        next: (created) => {
          this.newIssueTitle = '';
          this.toast.success('Task created.');
          this.applyLocalMove(created.id, Number(created.status) as ItemStatus, created);
        },
        error: (e) =>
          this.toast.error(extractApiErrorMessage(e, 'Could not create task.')),
      });
  }

  moveIssue(issue: Issue, newStatus: ItemStatus): void {
    if (Number(issue.status) === newStatus || !isUuid(issue.id)) {
      return;
    }

    if (!canTransitionIssue(issue.status, newStatus)) {
      this.toast.error(issueTransitionError(issue.status, newStatus));
      return;
    }

    const previousColumns = this.columns();
    this.applyLocalMove(issue.id, newStatus);
    this.movingIssueId.set(issue.id);
    this.suppressRefreshUntil = Date.now() + 2500;

    this.issueService.move(issue.id, { Status: newStatus, Order: issue.order }).subscribe({
      next: () => {
        this.movingIssueId.set(null);
      },
      error: (e) => {
        this.movingIssueId.set(null);
        this.suppressRefreshUntil = 0;
        this.columns.set(previousColumns);
        this.toast.error(extractApiErrorMessage(e, 'Could not move this task.'));
      },
    });
  }

  private applyLocalMove(issueId: string, newStatus: ItemStatus, replacement?: Issue): void {
    let movedIssue: Issue | undefined = replacement;

    const without = this.columns().map((col) => ({
      ...col,
      issues: col.issues.filter((i) => {
        if (i.id === issueId) {
          movedIssue = replacement ?? { ...i, status: newStatus };
          return false;
        }
        return true;
      }),
    }));

    if (!movedIssue) {
      return;
    }

    this.columns.set(
      without.map((col) =>
        col.status === newStatus
          ? { ...col, issues: [...col.issues, { ...movedIssue!, status: newStatus }] }
          : col,
      ),
    );
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
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDragStart(event: DragEvent, issue: Issue): void {
    event.dataTransfer?.setData('issueId', issue.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }
}
