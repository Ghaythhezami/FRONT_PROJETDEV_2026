import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Component, OnInit, inject } from '@angular/core';
import { PageBreadcrumbComponent } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { LoadMoreFooterComponent } from '../../../../shared/components/data/load-more-footer/load-more-footer.component';
import { SearchToolbarComponent } from '../../../../shared/components/data/search-toolbar/search-toolbar.component';
import { InfiniteScrollDirective } from '../../../../shared/directives/infinite-scroll.directive';
import {
  ITEM_STATUS_COLORS,
  ITEM_STATUS_LABELS,
  Issue,
  ItemStatus,
} from '../../../../shared/models/domain.models';
import { IssueService } from '../../../../shared/services/issue.service';
import { PaginatedListStore } from '../../../../shared/stores/paginated-list.store';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PageBreadcrumbComponent,
    SearchToolbarComponent,
    LoadMoreFooterComponent,
    InfiniteScrollDirective,
  ],
  templateUrl: './my-tasks.component.html',
})
export class MyTasksComponent implements OnInit {
  private readonly issueService = inject(IssueService);

  readonly store = new PaginatedListStore<Issue>((query) =>
    this.issueService.getMyTasks(query),
  );

  readonly statusLabels = ITEM_STATUS_LABELS;
  readonly statusColors = ITEM_STATUS_COLORS;

  ngOnInit(): void {
    this.store.loadFirst();
  }

  statusLabel(status: ItemStatus | number): string {
    return this.statusLabels[Number(status) as ItemStatus] ?? 'Unknown';
  }

  statusClass(status: ItemStatus | number): string {
    return this.statusColors[Number(status) as ItemStatus] ?? '';
  }
}
