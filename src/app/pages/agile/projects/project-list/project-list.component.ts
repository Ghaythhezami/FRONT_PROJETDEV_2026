import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageBreadcrumbComponent } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { LoadMoreFooterComponent } from '../../../../shared/components/data/load-more-footer/load-more-footer.component';
import { SearchToolbarComponent } from '../../../../shared/components/data/search-toolbar/search-toolbar.component';
import { InfiniteScrollDirective } from '../../../../shared/directives/infinite-scroll.directive';
import { Project } from '../../../../shared/models/domain.models';
import { ProjectService } from '../../../../shared/services/project.service';
import { PaginatedListStore } from '../../../../shared/stores/paginated-list.store';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PageBreadcrumbComponent,
    SearchToolbarComponent,
    LoadMoreFooterComponent,
    InfiniteScrollDirective,
  ],
  templateUrl: './project-list.component.html',
})
export class ProjectListComponent implements OnInit {
  private readonly projectService = inject(ProjectService);

  readonly store = new PaginatedListStore<Project>((query) =>
    this.projectService.getMyProjects(query),
  );

  showCreateModal = signal(false);
  isCreating = signal(false);
  createError = signal('');
  newProject = { projectName: '', projectDescription: '', key: '' };

  ngOnInit(): void {
    this.store.loadFirst();
  }

  onSearch(term: string): void {
    this.store.setSearch(term);
  }

  createProject(): void {
    if (!this.newProject.projectName.trim() || !this.newProject.key.trim()) {
      return;
    }
    this.isCreating.set(true);
    this.createError.set('');

    this.projectService
      .create({
        ProjectName: this.newProject.projectName.trim(),
        ProjectDescription: this.newProject.projectDescription.trim(),
        Key: this.newProject.key.trim().toUpperCase(),
      })
      .subscribe({
        next: () => {
          this.isCreating.set(false);
          this.showCreateModal.set(false);
          this.newProject = { projectName: '', projectDescription: '', key: '' };
          this.store.loadFirst();
        },
        error: (error) => {
          this.createError.set(
            error?.error?.message ?? error?.message ?? 'Unable to create project.',
          );
          this.isCreating.set(false);
        },
      });
  }
}
