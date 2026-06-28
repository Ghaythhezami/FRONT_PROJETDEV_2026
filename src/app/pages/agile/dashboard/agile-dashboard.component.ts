import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageBreadcrumbComponent } from '../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { LoadMoreFooterComponent } from '../../../shared/components/data/load-more-footer/load-more-footer.component';
import { SearchToolbarComponent } from '../../../shared/components/data/search-toolbar/search-toolbar.component';
import { InfiniteScrollDirective } from '../../../shared/directives/infinite-scroll.directive';
import { DashboardProjectSummary } from '../../../shared/models/domain.models';
import { AuthService } from '../../../shared/services/auth.service';
import { DashboardService } from '../../../shared/services/dashboard.service';
import { PaginatedListStore } from '../../../shared/stores/paginated-list.store';
import { AppAlertComponent, AppCardComponent } from '../../../shared/ui';

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
    AppCardComponent,
    AppAlertComponent,
  ],
  templateUrl: './agile-dashboard.component.html',
})
export class AgileDashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);

  readonly store = new PaginatedListStore<DashboardProjectSummary>((query) =>
    this.dashboardService.getMyProjects(query),
  );

  readonly kpiCards = computed(() => {
    const items = this.store.items();
    const total = this.store.total();
    const withActiveSprint = items.filter((p) => !!p.activeSprintName).length;
    const withoutSprint = Math.max(0, items.length - withActiveSprint);

    return [
      {
        label: 'Total projects',
        value: total,
        color: 'from-brand-500 to-brand-600',
        bar: 100,
      },
      {
        label: 'Active sprints',
        value: withActiveSprint,
        color: 'from-emerald-500 to-teal-600',
        bar: total ? Math.round((withActiveSprint / total) * 100) : 0,
      },
      {
        label: 'Needs planning',
        value: withoutSprint,
        color: 'from-amber-500 to-orange-500',
        bar: total ? Math.round((withoutSprint / total) * 100) : 0,
      },
      {
        label: 'Loaded page',
        value: items.length,
        color: 'from-violet-500 to-purple-600',
        bar: total ? Math.round((items.length / total) * 100) : 0,
      },
    ];
  });

  get greeting(): string {
    const user = this.authService.currentUser();
    return user?.prenom ? `Welcome back, ${user.prenom}` : 'Welcome back';
  }

  ngOnInit(): void {
    this.store.loadFirst();
  }

  onSearch(term: string): void {
    this.store.setSearch(term);
  }
}
