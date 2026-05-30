import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PageBreadcrumbComponent } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { LoadMoreFooterComponent } from '../../../../shared/components/data/load-more-footer/load-more-footer.component';
import { SearchToolbarComponent } from '../../../../shared/components/data/search-toolbar/search-toolbar.component';
import { InfiniteScrollDirective } from '../../../../shared/directives/infinite-scroll.directive';
import { Epic, ItemPriority, MoSCoW, Sprint, SprintStatus, UserStory } from '../../../../shared/models/domain.models';
import { AiService } from '../../../../shared/services/ai.service';
import { EpicService } from '../../../../shared/services/epic.service';
import { SprintService } from '../../../../shared/services/sprint.service';
import { UserStoryService } from '../../../../shared/services/user-story.service';
import { PaginatedListStore } from '../../../../shared/stores/paginated-list.store';

@Component({
  selector: 'app-backlog',
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
  templateUrl: './backlog.component.html',
})
export class BacklogComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly userStoryService = inject(UserStoryService);
  private readonly aiService = inject(AiService);
  private readonly epicService = inject(EpicService);
  private readonly sprintService = inject(SprintService);

  projectId = '';
  epics = signal<Epic[]>([]);
  sprints = signal<Sprint[]>([]);
  showForm = signal(false);
  isAiLoading = signal(false);
  isSaving = signal(false);
  formError = signal('');
  assignSprintId = signal<Record<string, string>>({});

  newStory = {
    title: '',
    description: '',
    storyPoints: 3,
    epicId: '',
    sprintId: '',
    priority: ItemPriority.Medium,
    moSCoW: MoSCoW.Should,
    status: SprintStatus.Planned,
  };

  readonly store = new PaginatedListStore<UserStory>((query) =>
    this.userStoryService.getBacklog(this.projectId, query),
  );

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
    if (!this.projectId) {
      return;
    }
    this.store.loadFirst();
    this.loadEpics();
    this.loadSprints();
  }

  loadEpics(): void {
    this.epicService.getEpicsForProject(this.projectId).subscribe({
      next: (epics) => {
        this.epics.set(epics);
        if (epics.length && !this.newStory.epicId) {
          this.newStory.epicId = epics[0].id;
        }
      },
    });
    this.epicService.resolveEpicIdForProject(this.projectId).subscribe({
      next: (epicId) => {
        if (!this.newStory.epicId) {
          this.newStory.epicId = epicId;
        }
      },
      error: (e) => this.formError.set(e?.message ?? 'Could not resolve epic.'),
    });
  }

  loadSprints(): void {
    this.sprintService.getByProject(this.projectId, { page: 1, limit: 10 }).subscribe({
      next: (r) => this.sprints.set(r.items),
    });
  }

  createStory(): void {
    if (!this.newStory.title.trim()) {
      this.formError.set('Title is required.');
      return;
    }

    this.isSaving.set(true);
    this.formError.set('');

    this.epicService.resolveEpicIdForProject(this.projectId).subscribe({
      next: (epicId) => {
        this.userStoryService
          .create({
            Title: this.newStory.title.trim(),
            Description: this.newStory.description.trim(),
            StoryPoints: this.newStory.storyPoints,
            Priority: this.newStory.priority,
            MoSCoW: this.newStory.moSCoW,
            EpicId: epicId,
            SprintId: this.newStory.sprintId || undefined,
            Status: this.newStory.status,
          })
          .subscribe({
            next: () => {
              this.isSaving.set(false);
              this.newStory.title = '';
              this.newStory.description = '';
              this.newStory.sprintId = '';
              this.showForm.set(false);
              this.store.loadFirst();
            },
            error: (error) => {
              this.isSaving.set(false);
              this.formError.set(
                error?.error?.message ?? error?.message ?? 'Could not create user story.',
              );
            },
          });
      },
      error: (error) => {
        this.isSaving.set(false);
        this.formError.set(error?.message ?? 'Invalid epic — could not resolve EpicId for this project.');
      },
    });
  }

  assignToSprint(story: UserStory): void {
    const sprintId = this.assignSprintId()[story.id];
    if (!sprintId) {
      return;
    }
    this.userStoryService.assignToSprint(story.id, sprintId).subscribe({
      next: () => {
        this.store.loadFirst();
        this.formError.set('');
      },
      error: (e) => this.formError.set(e?.error?.message ?? 'Assign to sprint failed.'),
    });
  }

  generateDescription(): void {
    this.isAiLoading.set(true);
    this.aiService
      .generateDescription({ Title: this.newStory.title, ProjectId: this.projectId })
      .subscribe({
        next: (text) => {
          this.newStory.description = text;
          this.isAiLoading.set(false);
        },
        error: () => this.isAiLoading.set(false),
      });
  }

  generateAcceptance(): void {
    this.isAiLoading.set(true);
    this.aiService
      .generateAcceptanceCriteria({ Title: this.newStory.title, ProjectId: this.projectId })
      .subscribe({
        next: (text) => {
          this.newStory.description = `${this.newStory.description}\n\n${text}`.trim();
          this.isAiLoading.set(false);
        },
        error: () => this.isAiLoading.set(false),
      });
  }

  predictPriority(story: UserStory): void {
    this.aiService.predictPriority(story.id).subscribe({
      next: (result) => alert(`AI priority suggestion:\n${result}`),
      error: (e) => this.formError.set(e?.error?.message ?? 'AI priority failed.'),
    });
  }

  setAssignSprint(storyId: string, sprintId: string): void {
    this.assignSprintId.update((m) => ({ ...m, [storyId]: sprintId }));
  }
}
