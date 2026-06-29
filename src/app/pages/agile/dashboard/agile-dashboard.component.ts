import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppLogoLoaderComponent } from '../../../shared/components/common/app-logo-loader/app-logo-loader.component';
import { PageBreadcrumbComponent } from '../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { DashboardStatusPieComponent } from '../../../shared/components/agile/dashboard-status-pie/dashboard-status-pie.component';
import { FolderProjectCardComponent } from '../../../shared/components/agile/folder-project-card/folder-project-card.component';
import { LoadMoreFooterComponent } from '../../../shared/components/data/load-more-footer/load-more-footer.component';
import { SearchToolbarComponent } from '../../../shared/components/data/search-toolbar/search-toolbar.component';
import { InfiniteScrollDirective } from '../../../shared/directives/infinite-scroll.directive';
import { DashboardProjectSummary, HomeDashboardStats } from '../../../shared/models/domain.models';
import { AuthService } from '../../../shared/services/auth.service';
import { DashboardService } from '../../../shared/services/dashboard.service';
import { PaginatedListStore } from '../../../shared/stores/paginated-list.store';
import { AppAlertComponent } from '../../../shared/ui';

@Component({
  selector: 'app-agile-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PageBreadcrumbComponent,
    SearchToolbarComponent,
    LoadMoreFooterComponent,
    InfiniteScrollDirective,
    FolderProjectCardComponent,
    AppAlertComponent,
    AppLogoLoaderComponent,
    DashboardStatusPieComponent,
  ],
  templateUrl: './agile-dashboard.component.html',
})
export class AgileDashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);

  readonly store = new PaginatedListStore<DashboardProjectSummary>((query) =>
    this.dashboardService.getMyProjects(query),
  );

  stats = signal<HomeDashboardStats | null>(null);
  statsLoading = signal(true);

  readonly workloadPie = computed(() => {
    const s = this.stats();
    if (!s) return [];
    if (s.isGlobalView) {
      return [
        { label: 'Open', value: s.globalOpenTasks, color: '#465FFF' },
        { label: 'Completed', value: s.globalDoneTasks, color: '#12B76A' },
        { label: 'Active sprints', value: s.activeSprints, color: '#7A5AF8' },
      ];
    }
    return [
      { label: 'My open', value: s.myOpenTasks, color: '#465FFF' },
      { label: 'Completed', value: s.myDoneTasks, color: '#12B76A' },
      { label: 'Review returns', value: s.reviewFailures, color: '#F79009' },
    ];
  });

  readonly teamPie = computed(() => {
    const s = this.stats();
    if (!s?.sprintContributions?.length) return [];
    return s.sprintContributions.slice(0, 5).map((dev, i) => ({
      label: dev.developerName.split(' ')[0] || dev.developerName,
      value: dev.totalTasks,
      color: ['#465FFF', '#7A5AF8', '#12B76A', '#F79009', '#F04438'][i % 5],
    }));
  });

  get greeting(): string {
    const user = this.authService.currentUser();
    return user?.prenom ? `Welcome back, ${user.prenom}` : 'Welcome back';
  }

  ngOnInit(): void {
    this.store.loadFirst();
    this.dashboardService.getHomeStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.statsLoading.set(false);
      },
      error: () => this.statsLoading.set(false),
    });
  }

  onSearch(term: string): void {
    this.store.setSearch(term);
  }

  contributionHeight(done: number, total: number): number {
    if (!total) {
      return 8;
    }
    return Math.max(12, Math.round((done / total) * 100));
  }
}
