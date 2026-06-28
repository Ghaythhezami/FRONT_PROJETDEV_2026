import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageBreadcrumbComponent } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { LoadMoreFooterComponent } from '../../../../shared/components/data/load-more-footer/load-more-footer.component';
import { SearchToolbarComponent } from '../../../../shared/components/data/search-toolbar/search-toolbar.component';
import { InfiniteScrollDirective } from '../../../../shared/directives/infinite-scroll.directive';
import {
  ITEM_STATUS_COLORS,
  ITEM_STATUS_LABELS,
  Issue,
  ItemStatus,
  MyTaskProjectFilter,
} from '../../../../shared/models/domain.models';
import { IssueService } from '../../../../shared/services/issue.service';
import { PaginatedListStore } from '../../../../shared/stores/paginated-list.store';
import { AppAlertComponent } from '../../../../shared/ui';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PageBreadcrumbComponent,
    SearchToolbarComponent,
    LoadMoreFooterComponent,
    InfiniteScrollDirective,
    AppAlertComponent,
  ],
  templateUrl: './my-tasks.component.html',
})
export class MyTasksComponent implements OnInit {
  private readonly issueService = inject(IssueService);

  readonly store = new PaginatedListStore<Issue>((query) =>
    this.issueService.getMyTasks(query),
  );

  projectFilters = signal<MyTaskProjectFilter[]>([]);
  filtersError = signal('');
  selectedProjectId = '';
  selectedStatus = '';
  startDate = '';
  endDate = '';

  readonly statusLabels = ITEM_STATUS_LABELS;
  readonly statusColors = ITEM_STATUS_COLORS;
  readonly statusOptions = [
    { value: '', label: 'All statuses' },
    { value: String(ItemStatus.Todo), label: 'To do' },
    { value: String(ItemStatus.InProgress), label: 'In progress' },
    { value: String(ItemStatus.InReview), label: 'In review' },
    { value: String(ItemStatus.Done), label: 'Done' },
  ];

  readonly dateRangeLabel = computed(() => {
    if (this.startDate && this.endDate) {
      return `${this.startDate} → ${this.endDate}`;
    }
    if (this.startDate) {
      return `From ${this.startDate}`;
    }
    if (this.endDate) {
      return `Until ${this.endDate}`;
    }
    return 'All dates';
  });

  ngOnInit(): void {
    this.issueService.getMyTaskFilters().subscribe({
      next: (filters) => this.projectFilters.set(filters),
      error: () => this.filtersError.set('Could not load project filters. Restart the API if you recently updated.'),
    });
    this.store.loadFirst();
  }

  applyFilters(): void {
    const filters: Record<string, string> = {};
    if (this.selectedProjectId) {
      filters['projectId'] = this.selectedProjectId;
    }
    if (this.selectedStatus) {
      filters['status'] = this.selectedStatus;
    }
    if (this.startDate) {
      filters['startDate'] = this.startDate;
    }
    if (this.endDate) {
      filters['endDate'] = this.endDate;
    }
    this.store.setFilters(filters);
  }

  clearDates(): void {
    this.startDate = '';
    this.endDate = '';
    this.applyFilters();
  }

  onSearch(term: string): void {
    this.store.setSearch(term);
  }

  statusLabel(status: ItemStatus | number): string {
    return this.statusLabels[Number(status) as ItemStatus] ?? 'Unknown';
  }

  statusClass(status: ItemStatus | number): string {
    return this.statusColors[Number(status) as ItemStatus] ?? '';
  }
}
