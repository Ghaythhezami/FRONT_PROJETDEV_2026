import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Project } from '../../../models/domain.models';

@Component({
  selector: 'app-folder-project-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="group relative box-border w-full min-w-0 max-w-full text-left transition-transform duration-300"
      [class.scale-[0.98]]="opening()"
      (click)="openProject()"
    >
      <div
        class="relative box-border w-full max-w-full overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 via-blue-400 to-blue-500 p-1 shadow-md transition-all duration-500"
        [class.rounded-b-none]="opening()"
        [class.pb-0]="opening()"
      >
        <div class="absolute left-4 top-0 h-4 w-16 max-w-[40%] rounded-t-lg bg-sky-300/90 sm:w-20"></div>

        <div class="relative mx-2 mt-5 space-y-1 sm:mx-3">
          <div
            class="h-2.5 rounded-md bg-white/70 shadow-sm transition-all duration-500 sm:h-3"
            [class.translate-y-2]="opening()"
            [class.opacity-0]="opening()"
          ></div>
          <div
            class="h-2.5 w-[85%] max-w-full rounded-md bg-white/55 shadow-sm transition-all duration-500 delay-75 sm:h-3"
            [class.translate-y-4]="opening()"
            [class.opacity-0]="opening()"
          ></div>
          <div
            class="h-2.5 w-[70%] max-w-full rounded-md bg-white/40 shadow-sm transition-all duration-500 delay-100 sm:h-3"
            [class.translate-y-6]="opening()"
            [class.opacity-0]="opening()"
          ></div>
        </div>

        <div
          class="relative mt-3 box-border w-full max-w-full rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 px-3 pb-3 pt-3 text-white transition-all duration-500 sm:px-5 sm:pb-5 sm:pt-4"
          [class.min-h-[112px]]="!opening()"
          [class.min-h-[160px]]="opening()"
        >
          @if (loading()) {
            <div class="flex min-h-[72px] flex-col items-center justify-center sm:min-h-[88px]">
              <div class="h-9 w-9 animate-spin rounded-full border-2 border-white/40 border-t-white"></div>
            </div>
          } @else {
            <div class="flex min-w-0 items-start justify-between gap-2">
              <span class="shrink-0 rounded-md bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                {{ project.key }}
              </span>
              <span class="shrink-0 text-xs text-white/70">⋯</span>
            </div>
            <h3 class="mt-2 line-clamp-2 break-words text-sm font-semibold leading-snug sm:text-lg">
              {{ project.projectName }}
            </h3>
            <p class="mt-1 line-clamp-2 break-words text-[11px] text-white/85 sm:text-xs">
              {{ project.projectDescription || 'No description' }}
            </p>
            <p class="mt-2 text-lg font-bold sm:mt-3 sm:text-2xl">{{ countLabel }}</p>
            <p class="truncate text-[11px] text-white/75 sm:text-xs">{{ countCaption }}</p>
          }
        </div>
      </div>
    </button>
  `,
})
export class FolderProjectCardComponent {
  @Input({ required: true }) project!: Project;

  private readonly router = inject(Router);

  opening = signal(false);
  loading = signal(false);

  get countLabel(): string {
    return String(this.project.openIssueCount ?? this.project.memberCount ?? 0);
  }

  get countCaption(): string {
    if (this.project.activeSprintName) {
      return `Active: ${this.project.activeSprintName}`;
    }
    return 'Open issues';
  }

  openProject(): void {
    if (this.opening()) {
      return;
    }
    this.opening.set(true);
    setTimeout(() => this.loading.set(true), 280);
    setTimeout(() => {
      void this.router.navigate(['/projects', this.project.id]);
    }, 900);
  }
}
