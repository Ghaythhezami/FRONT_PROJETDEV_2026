import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageBreadcrumbComponent } from '../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { LoadMoreFooterComponent } from '../../../shared/components/data/load-more-footer/load-more-footer.component';
import { SearchToolbarComponent } from '../../../shared/components/data/search-toolbar/search-toolbar.component';
import { InfiniteScrollDirective } from '../../../shared/directives/infinite-scroll.directive';
import { DashboardProjectSummary } from '../../../shared/models/domain.models';
import { AuthService } from '../../../shared/services/auth.service';
import { DashboardService } from '../../../shared/services/dashboard.service';
import { PaginatedListStore } from '../../../shared/stores/paginated-list.store';

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
  ],
  templateUrl: './agile-dashboard.component.html',
})
export class AgileDashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);

  readonly store = new PaginatedListStore<DashboardProjectSummary>((query) =>
    this.dashboardService.getMyProjects(query),
  );

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
