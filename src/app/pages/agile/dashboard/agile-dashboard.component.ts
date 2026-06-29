import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppLogoLoaderComponent } from '../../../shared/components/common/app-logo-loader/app-logo-loader.component';
import { PageBreadcrumbComponent } from '../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
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
