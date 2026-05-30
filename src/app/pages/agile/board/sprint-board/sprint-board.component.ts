import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PageBreadcrumbComponent } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { KanbanCardComponent } from '../../../../shared/components/agile/kanban-card/kanban-card.component';
import { IssueService } from '../../../../shared/services/issue.service';
import { UserStoryService } from '../../../../shared/services/user-story.service';
import { CommentService } from '../../../../shared/services/comment.service';
import { AttachmentService } from '../../../../shared/services/attachment.service';
import { isUuid } from '../../../../shared/utils/id.util';
import { Issue, ItemStatus, KANBAN_COLUMNS, KANBAN_COLUMN_UI, UserStory } from '../../../../shared/models/domain.models';

@Component({
  selector: 'app-sprint-board',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageBreadcrumbComponent, KanbanCardComponent],
  templateUrl: './sprint-board.component.html',
})
export class SprintBoardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly issueService = inject(IssueService);
  private readonly userStoryService = inject(UserStoryService);
  private readonly commentService = inject(CommentService);
  private readonly attachmentService = inject(AttachmentService);

  sprintId = '';
  sprintName = signal('');
  columns = signal<{ status: ItemStatus; issues: Issue[] }[]>([]);
  sprintStories = signal<UserStory[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  actionMessage = signal('');
  movingIssueId = signal<string | null>(null);

  newIssueTitle = '';
  newIssueStoryId = '';

  readonly boardColumns = KANBAN_COLUMNS;
  readonly columnUi = KANBAN_COLUMN_UI;

  ngOnInit(): void {
    this.sprintId = this.route.snapshot.paramMap.get('sprintId') ?? '';
    if (!isUuid(this.sprintId)) {
      this.errorMessage.set('Invalid sprint id in URL.');
      this.isLoading.set(false);
      return;
    }
    this.loadBoard();
  }

  loadBoard(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      issues: this.loadAllBoardIssues(),
      stories: this.loadAllSprintStories(),
    })
      .pipe(
        switchMap(({ issues, stories }) => {
          this.sprintStories.set(stories);
          const storyMap = new Map(stories.map((s) => [s.id, s]));
          const enriched = issues.map((issue) => this.enrichIssue(issue, storyMap.get(issue.userStoryId)));
          return this.enrichCounts(enriched);
        }),
      )
      .subscribe({
        next: (issues) => {
          this.columns.set(
            KANBAN_COLUMNS.map((status) => ({
              status,
              issues: issues.filter((i) => Number(i.status) === status),
            })),
          );
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message ?? error?.message ?? 'Unable to load board.');
          this.isLoading.set(false);
        },
      });
  }

  createIssue(): void {
    if (!this.newIssueTitle.trim() || !this.newIssueStoryId) {
      this.actionMessage.set('Select a user story and enter a task title.');
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
          this.actionMessage.set('Task created.');
          this.loadBoard();
        },
        error: (e) =>
          this.actionMessage.set(e?.error?.message ?? e?.message ?? 'Could not create task.'),
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
        this.actionMessage.set(e?.error?.message ?? 'Move failed.');
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

  assignStoryToSprint(story: UserStory): void {
    this.userStoryService.assignToSprint(story.id, this.sprintId).subscribe({
      next: () => {
        this.actionMessage.set(`"${story.title}" added to sprint.`);
        this.loadBoard();
      },
      error: (e) => this.actionMessage.set(e?.error?.message ?? 'Could not assign story.'),
    });
  }

  private loadAllBoardIssues(): Observable<Issue[]> {
    return this.fetchAllPages((page) =>
      this.issueService.getBoard(this.sprintId, { page, limit: 10 }),
    );
  }

  private loadAllSprintStories(): Observable<UserStory[]> {
    return this.fetchAllPages((page) =>
      this.userStoryService.getBySprint(this.sprintId, { page, limit: 10 }),
    );
  }

  private fetchAllPages<T>(
    fetchPage: (page: number) => Observable<{ items: T[]; hasMore: boolean }>,
  ): Observable<T[]> {
    const loadPage = (page: number, collected: T[]): Observable<T[]> =>
      fetchPage(page).pipe(
        switchMap((result) => {
          const next = [...collected, ...result.items];
          return result.hasMore ? loadPage(page + 1, next) : of(next);
        }),
      );
    return loadPage(1, []);
  }

  private enrichIssue(issue: Issue, story?: UserStory): Issue {
    return {
      ...issue,
      description: issue.description || story?.description || '',
      priority: issue.priority ?? story?.priority,
      progressPercent: issue.progressPercent ?? this.progressFromStatus(Number(issue.status)),
    };
  }

  private progressFromStatus(status: number): number {
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

  private enrichCounts(issues: Issue[]) {
    if (!issues.length) {
      return of([]);
    }
    return forkJoin(
      issues.map((issue) =>
        forkJoin({
          comments: this.commentService
            .getByIssue(issue.id, { page: 1, limit: 1 })
            .pipe(catchError(() => of({ total: 0, items: [] }))),
          attachments: this.attachmentService
            .getByIssue(issue.id, { page: 1, limit: 1 })
            .pipe(catchError(() => of({ total: 0, items: [] }))),
        }).pipe(
          map(({ comments, attachments }) => ({
            ...issue,
            commentCount: comments.total,
            attachmentCount: attachments.total,
          })),
        ),
      ),
    );
  }
}
