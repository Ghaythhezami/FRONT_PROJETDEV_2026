import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PageBreadcrumbComponent } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { LoadMoreFooterComponent } from '../../../../shared/components/data/load-more-footer/load-more-footer.component';
import { SearchToolbarComponent } from '../../../../shared/components/data/search-toolbar/search-toolbar.component';
import { InfiniteScrollDirective } from '../../../../shared/directives/infinite-scroll.directive';
import {
  ActiveSprintSummary,
  ActivityItem,
  BurndownPoint,
  Issue,
  Project,
  ProjectMember,
  Sprint,
  TeamWorkloadMember,
  VelocityPoint,
} from '../../../../shared/models/domain.models';
import { ActivityService } from '../../../../shared/services/activity.service';
import { AiService } from '../../../../shared/services/ai.service';
import { DashboardService } from '../../../../shared/services/dashboard.service';
import { ProjectExecutionService } from '../../../../shared/services/project-execution.service';
import { ProjectMemberService } from '../../../../shared/services/project-member.service';
import { ProjectService } from '../../../../shared/services/project.service';
import { SprintService, CreateSprintPayload } from '../../../../shared/services/sprint.service';
import { PaginatedListStore } from '../../../../shared/stores/paginated-list.store';
import { AuthService } from '../../../../shared/services/auth.service';
import { InfiniteSelectComponent, SelectOption } from '../../../../shared/components/data/infinite-select/infinite-select.component';
import { UserDirectoryService } from '../../../../shared/services/user-directory.service';
import { isUuid } from '../../../../shared/utils/id.util';
import {
  canCloseSprint,
  canStartSprint,
  isSprintClosed,
  sprintStatusLabel,
} from '../../../../shared/utils/sprint-status.util';
import { extractApiErrorMessage } from '../../../../shared/utils/api-error.util';
import {
  AppAlertComponent,
  AppCardComponent,
  AppModalComponent,
  DialogService,
  FormFieldComponent,
  ToastService,
  UiButtonComponent,
} from '../../../../shared/ui';

type Tab = 'overview' | 'sprints' | 'members' | 'activity' | 'ai';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PageBreadcrumbComponent,
    SearchToolbarComponent,
    LoadMoreFooterComponent,
    InfiniteScrollDirective,
    InfiniteSelectComponent,
    AppCardComponent,
    AppAlertComponent,
    AppModalComponent,
    UiButtonComponent,
    FormFieldComponent,
  ],
  templateUrl: './project-detail.component.html',
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly sprintService = inject(SprintService);
  private readonly dashboardService = inject(DashboardService);
  private readonly activityService = inject(ActivityService);
  private readonly memberService = inject(ProjectMemberService);
  private readonly aiService = inject(AiService);
  private readonly executionService = inject(ProjectExecutionService);
  private readonly userDirectory = inject(UserDirectoryService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  readonly authService = inject(AuthService);

  project = signal<Project | null>(null);
  isLoadingProject = signal(true);
  projectError = signal('');
  activeTab = signal<Tab>('overview');
  activeSprint = signal<ActiveSprintSummary | null>(null);
  workload = signal<TeamWorkloadMember[]>([]);
  velocity = signal<VelocityPoint[]>([]);
  blockedItems = signal<Issue[]>([]);
  burndown = signal<BurndownPoint[]>([]);
  readonly burndownMax = computed(() => {
    const points = this.burndown();
    if (!points.length) {
      return 1;
    }
    return Math.max(1, ...points.map((p) => Math.max(p.remaining, p.ideal)));
  });
  aiOutput = signal('');
  isAiLoading = signal(false);
  showSprintModal = signal(false);
  isCreatingSprint = signal(false);

  projectId = '';
  newMemberId = '';
  memberActionError = signal('');
  userSelectOptions = signal<SelectOption[]>([]);
  userSelectLoading = signal(false);
  userDirectoryHint = signal('');

  newSprint: CreateSprintPayload = {
    Name: '',
    StartDate: new Date().toISOString().slice(0, 16),
    EndDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16),
    ProjectId: '',
  };

  readonly sprintStore = new PaginatedListStore<Sprint>((query) =>
    this.sprintService.getByProject(this.projectId, query),
  );

  readonly memberStore = new PaginatedListStore<ProjectMember>((query) =>
    this.memberService.getByProject(this.projectId, query),
  );

  readonly activityStore = new PaginatedListStore<ActivityItem>((query) =>
    this.activityService.getByProject(this.projectId, query),
  );

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
    this.newSprint.ProjectId = this.projectId;
    if (!this.projectId) {
      return;
    }
    this.loadProject();
    this.sprintStore.loadFirst();
    this.loadOverview();
  }

  burndownBarHeight(value: number): number {
    return Math.round((value / this.burndownMax()) * 100);
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (tab === 'members') {
      if (!this.memberStore.items().length) {
        this.memberStore.loadFirst();
      }
      if (!this.userSelectOptions().length && !this.userSelectLoading()) {
        this.loadUserOptions('');
      }
    }
    if (tab === 'activity' && !this.activityStore.items().length) {
      this.activityStore.loadFirst();
    }
  }

  private loadProject(): void {
    this.projectService.getById(this.projectId).subscribe({
      next: (project) => {
        this.project.set(project);
        this.isLoadingProject.set(false);
      },
      error: (error) => {
        this.projectError.set(error?.error?.message ?? error?.message ?? 'Project not found.');
        this.isLoadingProject.set(false);
      },
    });
  }

  loadOverview(): void {
    this.dashboardService.getActiveSprint(this.projectId).subscribe({
      next: (s) => {
        this.activeSprint.set(s);
        if (s?.sprintId) {
          this.dashboardService.getBurndown(s.sprintId).subscribe({
            next: (points) => this.burndown.set(points),
          });
        } else {
          this.burndown.set([]);
        }
      },
    });
    this.dashboardService
      .getTeamWorkload(this.projectId, { page: 1, limit: 10 })
      .subscribe({ next: (r) => this.workload.set(r.items) });
    this.dashboardService
      .getVelocity(this.projectId, { page: 1, limit: 10 })
      .subscribe({ next: (r) => this.velocity.set(r.items) });
    this.dashboardService
      .getBlockedOverdue(this.projectId, { page: 1, limit: 10 })
      .subscribe({ next: (r) => this.blockedItems.set(r.items) });
  }

  onSprintSearch(term: string): void {
    this.sprintStore.setSearch(term);
  }

  sprintActionError = signal('');

  readonly canStartSprint = canStartSprint;
  readonly canCloseSprint = canCloseSprint;
  readonly isSprintClosed = isSprintClosed;
  readonly sprintStatusLabel = sprintStatusLabel;

  startSprint(sprint: Sprint, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!canStartSprint(sprint)) {
      this.toast.warning(
        isSprintClosed(sprint)
          ? 'This sprint is closed and cannot be started again.'
          : 'This sprint is already active.',
      );
      return;
    }
    this.sprintActionError.set('');
    this.sprintService.start(sprint).subscribe({
      next: () => {
        this.sprintStore.loadFirst();
        this.loadOverview();
        this.toast.success(`Sprint "${sprint.name}" is now active. Open the board to track progress.`);
      },
      error: (e) =>
        this.sprintActionError.set(extractApiErrorMessage(e, 'Could not start sprint.')),
    });
  }

  closeSprint(sprint: Sprint, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!canCloseSprint(sprint)) {
      this.toast.warning('Only an active sprint can be closed.');
      return;
    }
    this.sprintActionError.set('');
    this.sprintService.close(sprint).subscribe({
      next: () => {
        this.sprintStore.loadFirst();
        this.loadOverview();
        this.toast.success(`Sprint "${sprint.name}" closed. Completed work has been recorded.`);
      },
      error: (e) =>
        this.sprintActionError.set(extractApiErrorMessage(e, 'Could not close sprint.')),
    });
  }

  openSprintModal(): void {
    this.showSprintModal.set(true);
  }

  createSprint(): void {
    if (!this.newSprint.Name.trim()) {
      return;
    }
    this.isCreatingSprint.set(true);
    const payload: CreateSprintPayload = {
      ...this.newSprint,
      StartDate: new Date(this.newSprint.StartDate).toISOString(),
      EndDate: new Date(this.newSprint.EndDate).toISOString(),
    };
    this.sprintService.create(payload).subscribe({
      next: () => {
        this.newSprint.Name = '';
        this.isCreatingSprint.set(false);
        this.showSprintModal.set(false);
        this.sprintStore.loadFirst();
        this.toast.success('Sprint created.');
      },
      error: (e) => {
        this.isCreatingSprint.set(false);
        this.sprintActionError.set(e?.error?.message ?? 'Could not create sprint.');
      },
    });
  }

  addMember(): void {
    const userId = this.newMemberId.trim();
    if (!userId) {
      return;
    }
    if (!isUuid(userId)) {
      this.memberActionError.set('Select a user from the list.');
      return;
    }
    this.memberActionError.set('');
    this.memberService.add(this.projectId, userId).subscribe({
      next: () => {
        this.newMemberId = '';
        this.memberStore.loadFirst();
        this.toast.success('Member added to project.');
      },
      error: (e) =>
        this.memberActionError.set(e?.error?.message ?? e?.message ?? 'Could not add member.'),
    });
  }

  addSelfAsMember(): void {
    const userId = this.authService.currentUser()?.userId;
    if (!userId) {
      this.memberActionError.set('Sign in to add yourself to the project.');
      return;
    }
    this.newMemberId = userId;
    this.addMember();
  }

  async removeMember(member: ProjectMember): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'Remove team member',
      message: `Remove ${member.memberName || member.memberId} from this project?`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.memberService.remove(member.id).subscribe({
      next: () => {
        this.memberStore.loadFirst();
        this.toast.success('Member removed.');
      },
    });
  }

  loadUserOptions(search: string): void {
    this.userSelectLoading.set(true);
    this.userDirectoryHint.set(
      this.authService.isAdmin()
        ? 'Search users by name or email.'
        : 'Search team members to add to this project.',
    );
    this.userDirectory.searchUsers({ page: 1, limit: 10, search }).subscribe({
      next: (result) => {
        this.userSelectOptions.set(
          result.items.map((u) => ({
            value: u.userId,
            label: `${u.prenom} ${u.nom}`.trim() || u.email || u.userId,
            sublabel: u.email,
          })),
        );
        this.userSelectLoading.set(false);
      },
      error: () => this.userSelectLoading.set(false),
    });
  }

  runAi(action: 'standup' | 'release' | 'risk'): void {
    this.isAiLoading.set(true);
    this.aiOutput.set('');
    let req;
    if (action === 'standup') {
      req = this.aiService.getDailyStandup(this.projectId);
    } else if (action === 'release') {
      req = this.aiService.getReleaseNotes(this.projectId);
    } else {
      const sprintId = this.activeSprint()?.sprintId;
      if (!sprintId) {
        this.aiOutput.set('No active sprint for risk analysis.');
        this.isAiLoading.set(false);
        return;
      }
      req = this.aiService.getSprintRisk(sprintId);
    }
    req.subscribe({
      next: (text) => {
        this.aiOutput.set(text);
        this.isAiLoading.set(false);
        this.toast.info('AI analysis complete.');
      },
      error: (e) => {
        this.aiOutput.set(e?.message ?? 'AI request failed.');
        this.isAiLoading.set(false);
      },
    });
  }

  async finalizeProject(): Promise<void> {
    const confirmed = await this.dialog.confirm({
      title: 'Finalize project',
      message: 'Finalize this project execution? Completed points will be tallied.',
      confirmLabel: 'Finalize',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.executionService.finalize(this.projectId).subscribe({
      next: () => this.toast.success('Project finalized successfully.'),
      error: (e) => this.toast.error(e?.error?.message ?? e?.message ?? 'Finalize failed.'),
    });
  }
}
