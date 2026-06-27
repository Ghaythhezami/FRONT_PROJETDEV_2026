import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]"
      [ngClass]="className"
    >
      @if (title || hasHeaderActions) {
        <div
          class="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-white/[0.05]"
          [class.px-5]="!noPadding"
          [class.py-4]="!noPadding"
        >
          <div>
            @if (title) {
              <h3 class="font-semibold text-gray-800 dark:text-white/90">{{ title }}</h3>
            }
            @if (subtitle) {
              <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ subtitle }}</p>
            }
          </div>
          <ng-content select="[cardActions]" />
        </div>
      }
      <div [class.p-5]="!noPadding" [class.px-5]="noPadding && title">
        <ng-content />
      </div>
      @if (hasFooter) {
        <div
          class="border-t border-gray-100 dark:border-white/[0.05]"
          [class.px-5]="!noPadding"
          [class.py-4]="!noPadding"
        >
          <ng-content select="[cardFooter]" />
        </div>
      }
    </div>
  `,
})
export class AppCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() noPadding = false;
  @Input() className = '';
  @Input() hasHeaderActions = false;
  @Input() hasFooter = false;
}
