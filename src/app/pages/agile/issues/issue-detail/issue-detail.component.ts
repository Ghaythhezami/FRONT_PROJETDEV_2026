import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PageBreadcrumbComponent } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { LoadMoreFooterComponent } from '../../../../shared/components/data/load-more-footer/load-more-footer.component';
import { InfiniteScrollDirective } from '../../../../shared/directives/infinite-scroll.directive';
import {
  ITEM_STATUS_COLORS,
  ITEM_STATUS_LABELS,
  Issue,
  ItemStatus,
  Attachment,
  Comment,
  SubTask,
} from '../../../../shared/models/domain.models';
import { AiService } from '../../../../shared/services/ai.service';
import { AttachmentService } from '../../../../shared/services/attachment.service';
import { CommentService } from '../../../../shared/services/comment.service';
import { IssueService } from '../../../../shared/services/issue.service';
import { SubtaskService } from '../../../../shared/services/subtask.service';
import { PaginatedListStore } from '../../../../shared/stores/paginated-list.store';
import {
  AppAlertComponent,
  AppCardComponent,
  FormFieldComponent,
  FormTextareaComponent,
  ToastService,
  UiButtonComponent,
} from '../../../../shared/ui';

@Component({
  selector: 'app-issue-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PageBreadcrumbComponent,
    LoadMoreFooterComponent,
    InfiniteScrollDirective,
    AppCardComponent,
    AppAlertComponent,
    UiButtonComponent,
    FormFieldComponent,
    FormTextareaComponent,
  ],
  templateUrl: './issue-detail.component.html',
})
export class IssueDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly issueService = inject(IssueService);
  private readonly commentService = inject(CommentService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly subtaskService = inject(SubtaskService);
  private readonly aiService = inject(AiService);
  private readonly toast = inject(ToastService);

  issueId = '';
  issue = signal<Issue | null>(null);
  errorMessage = signal('');
  isSaving = signal(false);
  newComment = '';
  newSubtaskTitle = '';
  aiSubtasks = signal('');
  isAiLoading = signal(false);

  readonly statusLabels = ITEM_STATUS_LABELS;
  readonly statusColors = ITEM_STATUS_COLORS;
  readonly statuses = [
    ItemStatus.Todo,
    ItemStatus.InProgress,
    ItemStatus.InReview,
    ItemStatus.Done,
    ItemStatus.Closed,
  ];

  readonly commentStore = new PaginatedListStore<Comment>((q) =>
    this.commentService.getByIssue(this.issueId, q),
  );

  readonly attachmentStore = new PaginatedListStore<Attachment>((q) =>
    this.attachmentService.getByIssue(this.issueId, q),
  );

  subtasks = signal<SubTask[]>([]);

  ngOnInit(): void {
    this.issueId = this.route.snapshot.paramMap.get('issueId') ?? '';
    const stateIssue = history.state?.['issue'] as Issue | undefined;
    const sprintId = this.route.snapshot.queryParamMap.get('sprintId');

    if (stateIssue?.id) {
      this.issue.set(stateIssue);
      this.loadSubtasks();
      this.commentStore.loadFirst();
      this.attachmentStore.loadFirst();
      return;
    }

    this.issueService.resolveIssue(this.issueId, sprintId).subscribe({
      next: (resolved) => {
        if (resolved) {
          this.issue.set(resolved);
          this.loadSubtasks();
          this.commentStore.loadFirst();
          this.attachmentStore.loadFirst();
        } else {
          this.errorMessage.set('Issue not found. Open it from the sprint board or My tasks.');
        }
      },
      error: () => this.errorMessage.set('Unable to load this issue.'),
    });
  }

  private loadSubtasks(): void {
    if (!this.issueId) {
      return;
    }
    this.subtaskService.getByIssue(this.issueId).subscribe({
      next: (list) => this.subtasks.set(list),
    });
  }

  updateStatus(status: ItemStatus): void {
    const current = this.issue();
    if (!current) {
      return;
    }
    this.isSaving.set(true);
    this.issueService
      .move(current.id, { Status: status, Order: current.order })
      .subscribe({
        next: (updated) => {
          this.issue.set(updated);
          this.isSaving.set(false);
          this.toast.success(`Status updated to ${this.statusLabels[status]}.`);
        },
        error: () => this.isSaving.set(false),
      });
  }

  autoAssign(): void {
    const current = this.issue();
    if (!current) {
      return;
    }
    this.issueService.autoAssign(current.id).subscribe({
      next: (updated) => {
        this.issue.set(updated);
        this.toast.success('Issue auto-assigned (AI workload).');
      },
      error: (e) => this.toast.error(e?.error?.message ?? 'Auto-assign failed.'),
    });
  }

  postComment(): void {
    if (!this.newComment.trim()) {
      return;
    }
    this.commentService
      .create({ Content: this.newComment.trim(), IssueId: this.issueId })
      .subscribe({
        next: () => {
          this.newComment = '';
          this.commentStore.loadFirst();
          this.toast.success('Comment posted.');
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.attachmentService.upload(this.issueId, file).subscribe({
      next: () => {
        this.attachmentStore.loadFirst();
        input.value = '';
        this.toast.success('Attachment uploaded.');
      },
      error: (e) => this.toast.error(e?.error?.message ?? 'Upload failed.'),
    });
  }

  addSubtask(): void {
    if (!this.newSubtaskTitle.trim()) {
      return;
    }
    this.subtaskService
      .create({ Title: this.newSubtaskTitle.trim(), IssueId: this.issueId })
      .subscribe({
        next: (st) => {
          this.subtasks.update((list) => [...list, st]);
          this.newSubtaskTitle = '';
          this.toast.success('Subtask added.');
        },
      });
  }

  toggleSubtask(subtask: SubTask): void {
    this.subtaskService.toggle(subtask).subscribe({
      next: (updated) => {
        this.subtasks.update((list) =>
          list.map((s) => (s.id === updated.id ? updated : s)),
        );
      },
    });
  }

  generateAiSubtasks(): void {
    const current = this.issue();
    if (!current) {
      return;
    }
    this.isAiLoading.set(true);
    this.aiService
      .generateSubtasks({ Title: current.title, Description: '' })
      .subscribe({
        next: (text) => {
          this.aiSubtasks.set(text);
          this.isAiLoading.set(false);
          this.toast.info('AI subtask suggestions ready.');
        },
        error: () => this.isAiLoading.set(false),
      });
  }
}
