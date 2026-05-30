import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PageBreadcrumbComponent } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { LoadMoreFooterComponent } from '../../../../shared/components/data/load-more-footer/load-more-footer.component';
import { SearchToolbarComponent } from '../../../../shared/components/data/search-toolbar/search-toolbar.component';
import { InfiniteScrollDirective } from '../../../../shared/directives/infinite-scroll.directive';
import {
  ActivityItem,
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
import { UserManagementService } from '../../../../shared/services/user-management.service';

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
  private readonly userService = inject(UserManagementService);
  readonly authService = inject(AuthService);

  project = signal<Project | null>(null);
  isLoadingProject = signal(true);
  projectError = signal('');
  activeTab = signal<Tab>('overview');
  activeSprint = signal<Sprint | null>(null);
  workload = signal<TeamWorkloadMember[]>([]);
  velocity = signal<VelocityPoint[]>([]);
  blockedItems = signal<Record<string, unknown>[]>([]);
  aiOutput = signal('');
  isAiLoading = signal(false);
  finalizeMessage = signal('');

  projectId = '';
  newMemberId = '';
  userSelectOptions = signal<SelectOption[]>([]);
  userSelectLoading = signal(false);

  newSprint: CreateSprintPayload = {
    Name: '',
    StartDate: new Date().toISOString(),
    EndDate: new Date(Date.now() + 14 * 86400000).toISOString(),
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
    this.loadUserOptions('');
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (tab === 'members' && !this.memberStore.items().length) {
      this.memberStore.loadFirst();
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
      next: (s) => this.activeSprint.set(s),
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

  startSprint(sprint: Sprint, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.sprintActionError.set('');
    this.sprintService.start(sprint).subscribe({
      next: () => this.sprintStore.loadFirst(),
      error: (e) =>
        this.sprintActionError.set(
          e?.error?.message ?? e?.message ?? 'Could not start sprint.',
        ),
    });
  }

  closeSprint(sprint: Sprint, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.sprintActionError.set('');
    this.sprintService.close(sprint).subscribe({
      next: () => this.sprintStore.loadFirst(),
      error: (e) =>
        this.sprintActionError.set(
          e?.error?.message ?? e?.message ?? 'Could not close sprint.',
        ),
    });
  }

  createSprint(): void {
    if (!this.newSprint.Name.trim()) {
      return;
    }
    const payload: CreateSprintPayload = {
      ...this.newSprint,
      StartDate: new Date(this.newSprint.StartDate).toISOString(),
      EndDate: new Date(this.newSprint.EndDate).toISOString(),
    };
    this.sprintService.create(payload).subscribe({
      next: () => {
        this.newSprint.Name = '';
        this.sprintStore.loadFirst();
      },
    });
  }

  addMember(): void {
    if (!this.newMemberId) {
      return;
    }
    this.memberService.add(this.projectId, this.newMemberId).subscribe({
      next: () => {
        this.newMemberId = '';
        this.memberStore.loadFirst();
      },
    });
  }

  removeMember(member: ProjectMember): void {
    this.memberService.remove(member.id).subscribe({
      next: () => this.memberStore.loadFirst(),
    });
  }

  loadUserOptions(search: string): void {
    this.userSelectLoading.set(true);
    this.userService.getUsersPaged({ page: 1, limit: 10, search }).subscribe({
      next: (result) => {
        this.userSelectOptions.set(
          result.items.map((u) => ({
            value: u.userId,
            label: `${u.prenom} ${u.nom}`,
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
      const sprintId = this.activeSprint()?.id;
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
      },
      error: (e) => {
        this.aiOutput.set(e?.message ?? 'AI request failed.');
        this.isAiLoading.set(false);
      },
    });
  }

  finalizeProject(): void {
    if (!confirm('Finalize this project execution?')) {
      return;
    }
    this.executionService.finalize(this.projectId).subscribe({
      next: () => this.finalizeMessage.set('Project finalized successfully.'),
      error: (e) =>
        this.finalizeMessage.set(e?.error?.message ?? e?.message ?? 'Finalize failed.'),
    });
  }
}
