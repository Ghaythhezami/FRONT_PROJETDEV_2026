import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PageBreadcrumbComponent } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { LoadMoreFooterComponent } from '../../../../shared/components/data/load-more-footer/load-more-footer.component';
import { InfiniteScrollDirective } from '../../../../shared/directives/infinite-scroll.directive';
import { DatePickerComponent } from '../../../../shared/components/form/date-picker/date-picker.component';
import {
  ITEM_STATUS_COLORS,
  ITEM_STATUS_LABELS,
  Issue,
  ItemStatus,
  Comment,
  SubTask,
} from '../../../../shared/models/domain.models';
import { AiService } from '../../../../shared/services/ai.service';
import { AttachmentService } from '../../../../shared/services/attachment.service';
import { CommentService } from '../../../../shared/services/comment.service';
import { IssueService } from '../../../../shared/services/issue.service';
import { ProjectMemberService } from '../../../../shared/services/project-member.service';
import { SubtaskService } from '../../../../shared/services/subtask.service';
import { PaginatedListStore } from '../../../../shared/stores/paginated-list.store';
import {
  InfiniteSelectComponent,
  SelectOption,
} from '../../../../shared/components/data/infinite-select/infinite-select.component';
import { ProjectMember } from '../../../../shared/models/domain.models';
import {
  canTransitionIssue,
  issueTransitionError,
} from '../../../../shared/utils/issue-workflow.util';
import { extractApiErrorMessage } from '../../../../shared/utils/api-error.util';
import { AuthService } from '../../../../shared/services/auth.service';
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
    InfiniteSelectComponent,
    DatePickerComponent,
  ],
  templateUrl: './issue-detail.component.html',
})
export class IssueDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly issueService = inject(IssueService);
  private readonly commentService = inject(CommentService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly subtaskService = inject(SubtaskService);
  private readonly memberService = inject(ProjectMemberService);
  private readonly aiService = inject(AiService);
  private readonly toast = inject(ToastService);
  readonly authService = inject(AuthService);

  issueId = '';
  issue = signal<Issue | null>(null);
  errorMessage = signal('');
  isSaving = signal(false);
  isAssigning = signal(false);
  newComment = '';
  newSubtaskTitle = '';
  aiSubtasks = signal('');
  isAiLoading = signal(false);
  commentFileUploading = signal(false);
  commentPreviewUrl = signal<string | null>(null);
  pendingAttachmentUploads = signal<
    { id: string; previewUrl?: string; fileName: string; loading: boolean; uploaderName: string; url?: string; isImage: boolean }[]
  >([]);
  assigneePickerProjectId = signal('');
  assigneeSelectOptions = signal<SelectOption[]>([]);
  assigneeSelectLoading = signal(false);
  selectedAssigneeId = '';

  private assigneePickerStore: PaginatedListStore<ProjectMember> | null = null;

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

  subtasks = signal<SubTask[]>([]);
  subtaskComments = signal<Record<string, Comment[]>>({});
  subtaskCommentDrafts: Record<string, string> = {};
  subtaskAssigneeDrafts: Record<string, string> = {};
  subtaskStartDrafts: Record<string, string> = {};
  subtaskDueDrafts: Record<string, string> = {};
  expandedSubtaskId = signal<string | null>(null);

  readonly assigneePickerHasMore = computed(
    () => this.assigneePickerStore?.hasMore() ?? false,
  );

  readonly isAdmin = computed(() => this.authService.isAdmin());
  readonly currentUserId = computed(() => this.authService.currentUser()?.userId ?? '');
  readonly isAssignedToMe = computed(() => {
    const iss = this.issue();
    const uid = this.currentUserId();
    return !!iss?.assigneeId && iss.assigneeId === uid;
  });

  commentAuthorName(comment: Comment): string {
    if (comment.authorName?.trim()) {
      return comment.authorName.trim();
    }
    const user = this.authService.currentUser();
    if (user && comment.authorId && comment.authorId === user.userId) {
      return `${user.prenom} ${user.nom}`.trim() || user.email;
    }
    return user ? `${user.prenom} ${user.nom}`.trim() || 'You' : 'Unknown';
  }

  commentPlainText(content: string): string {
    return content
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/📎\s*\[[^\]]+\]\([^)]+\)/g, '')
      .trim();
  }

  commentImageUrl(content: string): string | null {
    const match = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
    return match?.[1] ?? null;
  }

  isImageAttachment(fileName: string, fileType?: string): boolean {
    const type = fileType ?? '';
    return type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName);
  }

  assignMe(): void {
    const current = this.issue();
    if (!current) {
      return;
    }
    this.isAssigning.set(true);
    this.issueService.assignMe(current.id).subscribe({
      next: (updated) => {
        this.issue.set(updated);
        this.selectedAssigneeId = updated.assigneeId ?? '';
        this.isAssigning.set(false);
        this.toast.success('You are now assigned to this task.');
      },
      error: (e) => {
        this.isAssigning.set(false);
        this.toast.error(extractApiErrorMessage(e, 'Could not assign yourself.'));
      },
    });
  }

  unassignMe(): void {
    const current = this.issue();
    if (!current) {
      return;
    }
    this.isAssigning.set(true);
    this.issueService.unassignMe(current.id).subscribe({
      next: (updated) => {
        this.issue.set(updated);
        this.selectedAssigneeId = '';
        this.isAssigning.set(false);
        this.toast.success('You were unassigned from this task.');
      },
      error: (e) => {
        this.isAssigning.set(false);
        this.toast.error(extractApiErrorMessage(e, 'Could not unassign.'));
      },
    });
  }

  ngOnInit(): void {
    this.issueId = this.route.snapshot.paramMap.get('issueId') ?? '';
    const stateIssue = history.state?.['issue'] as Issue | undefined;
    const sprintId = this.route.snapshot.queryParamMap.get('sprintId');

    if (stateIssue?.id) {
      this.issue.set(stateIssue);
      this.bootstrapIssue(stateIssue);
      return;
    }

    this.issueService.resolveIssue(this.issueId, sprintId).subscribe({
      next: (resolved) => {
        if (resolved) {
          this.issue.set(resolved);
          this.bootstrapIssue(resolved);
        } else {
          this.errorMessage.set('Issue not found. Open it from the sprint board or My tasks.');
        }
      },
      error: () => this.errorMessage.set('Unable to load this issue.'),
    });
  }

  private bootstrapIssue(issue: Issue): void {
    this.selectedAssigneeId = issue.assigneeId ?? '';
    this.loadSubtasks();
    this.commentStore.loadFirst();
    if (issue.projectId) {
      this.initAssigneePicker(issue.projectId);
    }
  }

  private initAssigneePicker(projectId: string): void {
    if (this.assigneePickerProjectId() === projectId && this.assigneePickerStore) {
      return;
    }
    this.assigneePickerProjectId.set(projectId);
    this.assigneePickerStore = new PaginatedListStore<ProjectMember>((query) =>
      this.memberService.getByProject(projectId, query),
    );
    this.onAssigneeSearch('');
  }

  onAssigneeSearch(search: string): void {
    if (!this.assigneePickerStore) {
      return;
    }
    this.assigneeSelectLoading.set(true);
    this.assigneePickerStore.loadFirst(search);
    this.waitForAssigneePicker(() => {
      this.syncAssigneeOptions();
      this.assigneeSelectLoading.set(false);
    });
  }

  onAssigneeLoadMore(): void {
    if (!this.assigneePickerStore) {
      return;
    }
    this.assigneePickerStore.loadMore();
    this.waitForAssigneePicker(() => this.syncAssigneeOptions());
  }

  private waitForAssigneePicker(done: () => void): void {
    const poll = () => {
      if (
        this.assigneePickerStore?.loading() ||
        this.assigneePickerStore?.loadingMore()
      ) {
        requestAnimationFrame(poll);
        return;
      }
      done();
    };
    requestAnimationFrame(poll);
  }

  private syncAssigneeOptions(): void {
    this.assigneeSelectOptions.set(
      (this.assigneePickerStore?.items() ?? []).map((m) => ({
        value: m.memberId,
        label: m.memberName || m.memberEmail || m.memberId,
        sublabel: m.memberEmail,
      })),
    );
  }

  assignSelectedMember(): void {
    const current = this.issue();
    if (!current || !this.selectedAssigneeId) {
      return;
    }
    this.isAssigning.set(true);
    this.issueService.assign(current.id, this.selectedAssigneeId).subscribe({
      next: (updated) => {
        this.issue.set(updated);
        this.isAssigning.set(false);
        this.toast.success('Assignee updated.');
      },
      error: (e) => {
        this.isAssigning.set(false);
        this.toast.error(extractApiErrorMessage(e, 'Could not assign issue.'));
      },
    });
  }

  clearAssignee(): void {
    if (this.isAdmin()) {
      const current = this.issue();
      if (!current) {
        return;
      }
      this.isAssigning.set(true);
      this.issueService.assign(current.id, null).subscribe({
        next: (updated) => {
          this.issue.set(updated);
          this.selectedAssigneeId = '';
          this.isAssigning.set(false);
          this.toast.success('Issue unassigned.');
        },
        error: (e) => {
          this.isAssigning.set(false);
          this.toast.error(extractApiErrorMessage(e, 'Could not unassign issue.'));
        },
      });
      return;
    }
    this.unassignMe();
  }

  onCommentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const user = this.authService.currentUser();
    const uploaderName = user ? `${user.prenom} ${user.nom}`.trim() || user.email : 'You';
    const isImage = file.type.startsWith('image/');
    const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
    const pendingId = crypto.randomUUID();

    this.pendingAttachmentUploads.update((list) => [
      { id: pendingId, previewUrl, fileName: file.name, loading: true, uploaderName, isImage },
      ...list,
    ]);

    const finalizeSuccess = (url?: string) => {
      this.pendingAttachmentUploads.update((list) =>
        list.map((item) =>
          item.id === pendingId ? { ...item, loading: false, url: url ?? item.previewUrl } : item,
        ),
      );
      this.commentStore.loadFirst();
      input.value = '';
    };

    const finalizeError = (message: string) => {
      this.pendingAttachmentUploads.update((list) => list.filter((item) => item.id !== pendingId));
      this.toast.error(message);
      input.value = '';
    };

    if (isImage && !this.newComment.trim()) {
      this.commentService.createWithAttachment(this.issueId, '', file).subscribe({
        next: (comment) => finalizeSuccess(this.commentImageUrl(comment.content) ?? undefined),
        error: (e) => finalizeError(e?.error?.message ?? 'Upload failed.'),
      });
      return;
    }

    this.attachmentService.upload(this.issueId, file).subscribe({
      next: (attachment) => finalizeSuccess(attachment.url),
      error: (e) => finalizeError(e?.error?.message ?? 'Upload failed.'),
    });
  }

  onSubtaskToggleOpen(subtask: SubTask, open: boolean): void {
    if (open) {
      this.expandedSubtaskId.set(subtask.id);
      this.subtaskAssigneeDrafts[subtask.id] = subtask.assigneeId ?? '';
      this.subtaskStartDrafts[subtask.id] = subtask.startDate?.slice(0, 10) ?? '';
      this.subtaskDueDrafts[subtask.id] = subtask.dueDate?.slice(0, 10) ?? '';
      this.loadSubtaskComments(subtask.id);
      return;
    }
    if (this.expandedSubtaskId() === subtask.id) {
      this.expandedSubtaskId.set(null);
    }
  }

  loadSubtaskComments(subtaskId: string): void {
    this.commentService.getByIssue(this.issueId, { page: 1, limit: 50 }, subtaskId).subscribe({
      next: (result) => {
        this.subtaskComments.update((map) => ({ ...map, [subtaskId]: result.items }));
      },
    });
  }

  saveSubtask(subtask: SubTask): void {
    this.subtaskService
      .update(subtask.id, {
        Title: subtask.title,
        IsCompleted: subtask.isCompleted,
        IssueId: subtask.issueId,
        AssigneeId: this.subtaskAssigneeDrafts[subtask.id] || null,
        StartDate: this.subtaskStartDrafts[subtask.id] || null,
        DueDate: this.subtaskDueDrafts[subtask.id] || null,
      })
      .subscribe({
        next: (updated) => {
          this.subtasks.update((list) => list.map((s) => (s.id === updated.id ? updated : s)));
          this.toast.success('Subtask updated.');
        },
        error: (e) => this.toast.error(extractApiErrorMessage(e, 'Could not update subtask.')),
      });
  }

  postSubtaskComment(subtask: SubTask): void {
    const content = this.subtaskCommentDrafts[subtask.id]?.trim();
    if (!content) {
      return;
    }
    this.commentService
      .create({ Content: content, IssueId: this.issueId, SubTaskId: subtask.id })
      .subscribe({
        next: () => {
          this.subtaskCommentDrafts[subtask.id] = '';
          this.loadSubtaskComments(subtask.id);
          this.toast.success('Subtask comment posted.');
        },
      });
  }

  onSubtaskFileSelected(subtask: SubTask, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const isImage = file.type.startsWith('image/');
    const draft = this.subtaskCommentDrafts[subtask.id]?.trim() ?? '';

    if (isImage && !draft) {
      this.commentService.createWithAttachment(this.issueId, '', file, subtask.id).subscribe({
        next: () => {
          this.loadSubtaskComments(subtask.id);
          input.value = '';
          this.toast.success('Photo uploaded to subtask.');
        },
        error: (e) => this.toast.error(e?.error?.message ?? 'Upload failed.'),
      });
      return;
    }

    this.attachmentService.upload(this.issueId, file, subtask.id).subscribe({
      next: () => {
        this.loadSubtaskComments(subtask.id);
        input.value = '';
        this.toast.success('File attached to subtask.');
      },
      error: (e) => this.toast.error(e?.error?.message ?? 'Upload failed.'),
    });
  }

  onSubtaskStartDateChange(subtaskId: string, event: { dateStr?: string }): void {
    this.subtaskStartDrafts[subtaskId] = event.dateStr ?? '';
  }

  onSubtaskDueDateChange(subtaskId: string, event: { dateStr?: string }): void {
    this.subtaskDueDrafts[subtaskId] = event.dateStr ?? '';
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
    if (!canTransitionIssue(current.status, status)) {
      this.toast.error(issueTransitionError(current.status, status));
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
        error: (e) => {
          this.isSaving.set(false);
          this.toast.error(extractApiErrorMessage(e, 'Could not update status.'));
        },
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
        next: (comment) => {
          this.newComment = '';
          this.commentStore.loadFirst();
          this.toast.success(`Comment posted by ${this.commentAuthorName(comment)}.`);
        },
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
        next: (result) => {
          this.aiSubtasks.set(result.displayText);
          this.isAiLoading.set(false);
          this.toast.info('AI subtask suggestions ready.');
        },
        error: () => this.isAiLoading.set(false),
      });
  }
}
