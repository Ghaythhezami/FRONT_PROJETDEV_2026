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
import {
  AppAlertComponent,
  AppCardComponent,
  AppModalComponent,
  FormFieldComponent,
  FormSelectComponent,
  FormTextareaComponent,
  SelectOption,
  ToastService,
  UiButtonComponent,
} from '../../../../shared/ui';

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
    AppModalComponent,
    AppCardComponent,
    AppAlertComponent,
    UiButtonComponent,
    FormFieldComponent,
    FormTextareaComponent,
    FormSelectComponent,
  ],
  templateUrl: './backlog.component.html',
})
export class BacklogComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly userStoryService = inject(UserStoryService);
  private readonly aiService = inject(AiService);
  private readonly epicService = inject(EpicService);
  private readonly sprintService = inject(SprintService);
  private readonly toast = inject(ToastService);

  projectId = '';
  epics = signal<Epic[]>([]);
  sprints = signal<Sprint[]>([]);
  showStoryModal = signal(false);
  showEpicModal = signal(false);
  isAiLoading = signal(false);
  isSaving = signal(false);
  isEpicSaving = signal(false);
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

  newEpic = { title: '', description: '' };

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

  get epicOptions(): SelectOption[] {
    return [
      { value: '', label: 'Auto-resolve epic…' },
      ...this.epics().map((e) => ({ value: e.id, label: e.title })),
    ];
  }

  get sprintOptions(): SelectOption[] {
    return [
      { value: '', label: 'Backlog only' },
      ...this.sprints().map((s) => ({ value: s.id, label: s.name })),
    ];
  }

  get sprintAssignOptions(): SelectOption[] {
    return [
      { value: '', label: 'Move to sprint…' },
      ...this.sprints().map((s) => ({ value: s.id, label: s.name })),
    ];
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

  openStoryModal(): void {
    this.formError.set('');
    this.showStoryModal.set(true);
  }

  openEpicModal(): void {
    this.formError.set('');
    this.newEpic = { title: '', description: '' };
    this.showEpicModal.set(true);
  }

  createEpic(): void {
    if (!this.newEpic.title.trim()) {
      this.formError.set('Epic title is required.');
      return;
    }
    this.isEpicSaving.set(true);
    this.epicService.create(this.projectId, this.newEpic.title.trim(), this.newEpic.description.trim()).subscribe({
      next: (epic) => {
        this.isEpicSaving.set(false);
        this.showEpicModal.set(false);
        this.epics.update((list) => [epic, ...list.filter((e) => e.id !== epic.id)]);
        this.newStory.epicId = epic.id;
        this.toast.success(`Epic "${epic.title}" created — select it when adding stories.`);
      },
      error: (e) => {
        this.isEpicSaving.set(false);
        this.formError.set(e?.error?.message ?? e?.message ?? 'Could not create epic.');
      },
    });
  }

  createStory(): void {
    if (!this.newStory.title.trim()) {
      this.formError.set('Title is required.');
      return;
    }

    this.isSaving.set(true);
    this.formError.set('');

    const createWithEpic = (epicId: string) => {
      const sprintId = this.newStory.sprintId || undefined;
      this.userStoryService
        .create({
          Title: this.newStory.title.trim(),
          Description: this.newStory.description.trim(),
          StoryPoints: this.newStory.storyPoints,
          Priority: this.newStory.priority,
          MoSCoW: this.newStory.moSCoW,
          EpicId: epicId,
          SprintId: sprintId,
          Status: this.newStory.status,
        })
        .subscribe({
          next: (story) => {
            this.isSaving.set(false);
            this.newStory.title = '';
            this.newStory.description = '';
            this.newStory.sprintId = '';
            this.showStoryModal.set(false);
            if (sprintId) {
              const sprintName = this.sprints().find((s) => s.id === sprintId)?.name ?? 'sprint';
              this.toast.success(`Story added to ${sprintName}. Open the sprint board to see it.`);
            } else {
              this.store.loadFirst();
              this.toast.success(`Story "${story.title}" added to backlog.`);
            }
          },
          error: (error) => {
            this.isSaving.set(false);
            this.formError.set(
              error?.error?.message ?? error?.message ?? 'Could not create user story.',
            );
          },
        });
    };

    if (this.newStory.epicId) {
      createWithEpic(this.newStory.epicId);
      return;
    }

    this.epicService.resolveEpicIdForProject(this.projectId).subscribe({
      next: (epicId) => createWithEpic(epicId),
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
        this.toast.success(`"${story.title}" assigned to sprint.`);
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
          this.toast.info('AI description generated.');
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
          this.toast.info('AI acceptance criteria generated.');
        },
        error: () => this.isAiLoading.set(false),
      });
  }

  predictPriority(story: UserStory): void {
    this.aiService.predictPriority(story.id).subscribe({
      next: (result) => this.toast.info(`AI priority suggestion: ${result}`),
      error: (e) => this.formError.set(e?.error?.message ?? 'AI priority failed.'),
    });
  }

  setAssignSprint(storyId: string, sprintId: string): void {
    this.assignSprintId.update((m) => ({ ...m, [storyId]: sprintId }));
  }
}
