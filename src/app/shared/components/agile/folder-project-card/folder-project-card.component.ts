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
      class="group relative w-full max-w-full min-w-0 text-left transition-transform duration-300"
      [class.scale-[0.98]]="opening()"
      (click)="openProject()"
    >
      <div
        class="relative max-w-full overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 via-blue-400 to-blue-500 p-1 shadow-md transition-all duration-500"
        [class.rounded-b-none]="opening()"
        [class.pb-0]="opening()"
      >
        <div class="absolute left-4 top-0 h-4 w-20 rounded-t-lg bg-sky-300/90"></div>

        <div class="relative mx-3 mt-5 space-y-1">
          <div
            class="h-3 rounded-md bg-white/70 shadow-sm transition-all duration-500"
            [class.translate-y-2]="opening()"
            [class.opacity-0]="opening()"
          ></div>
          <div
            class="h-3 w-[88%] rounded-md bg-white/55 shadow-sm transition-all duration-500 delay-75"
            [class.translate-y-4]="opening()"
            [class.opacity-0]="opening()"
          ></div>
          <div
            class="h-3 w-[72%] rounded-md bg-white/40 shadow-sm transition-all duration-500 delay-100"
            [class.translate-y-6]="opening()"
            [class.opacity-0]="opening()"
          ></div>
        </div>

        <div
          class="relative mt-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 px-4 pb-4 pt-3 text-white transition-all duration-500 sm:px-5 sm:pb-5 sm:pt-4"
          [class.min-h-[128px]]="!opening()"
          [class.min-h-[160px]]="opening()"
        >
          @if (loading()) {
            <div class="flex min-h-[88px] flex-col items-center justify-center">
              <div class="h-9 w-9 animate-spin rounded-full border-2 border-white/40 border-t-white"></div>
            </div>
          } @else {
            <div class="flex min-w-0 items-start justify-between gap-2">
              <span class="shrink-0 rounded-md bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                {{ project.key }}
              </span>
              <span class="shrink-0 text-xs text-white/70">⋯</span>
            </div>
            <h3 class="mt-2 line-clamp-2 break-words text-base font-semibold leading-snug sm:text-lg">
              {{ project.projectName }}
            </h3>
            <p class="mt-1 line-clamp-2 break-words text-xs text-white/85">
              {{ project.projectDescription || 'No description' }}
            </p>
            <p class="mt-3 text-xl font-bold sm:text-2xl">{{ countLabel }}</p>
            <p class="truncate text-xs text-white/75">{{ countCaption }}</p>
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
