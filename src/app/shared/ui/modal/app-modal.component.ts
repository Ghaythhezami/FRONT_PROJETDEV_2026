import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

@Component({
  selector: 'app-ui-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-[99990] flex items-center justify-center overflow-y-auto p-4">
        @if (!isFullscreen) {
          <div
            class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
            (click)="onBackdropClick()"
          ></div>
        }
        <div
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="title ? 'modal-title' : null"
          class="relative flex max-h-[90vh] flex-col bg-white shadow-theme-lg dark:bg-gray-900"
          [ngClass]="panelClasses"
          (click)="$event.stopPropagation()"
        >
          @if (title || showCloseButton) {
            <div class="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-white/[0.05]">
              <div>
                @if (title) {
                  <h2 id="modal-title" class="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {{ title }}
                  </h2>
                }
                @if (subtitle) {
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ subtitle }}</p>
                }
              </div>
              @if (showCloseButton) {
                <button
                  type="button"
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                  aria-label="Close"
                  (click)="close.emit()"
                >
                  ✕
                </button>
              }
            </div>
          }
          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <ng-content />
          </div>
          @if (showFooter) {
            <div class="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-6 py-4 dark:border-white/[0.05]">
              <ng-content select="[modalFooter]" />
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class AppModalComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() size: ModalSize = 'md';
  @Input() showCloseButton = true;
  @Input() showFooter = false;
  @Input() isFullscreen = false;
  @Input() closeOnBackdrop = true;
  @Input() className = '';

  @Output() close = new EventEmitter<void>();

  get panelClasses(): string {
    if (this.isFullscreen) {
      return `h-full w-full ${this.className}`;
    }
    const sizes: Record<ModalSize, string> = {
      sm: 'w-full max-w-sm rounded-2xl',
      md: 'w-full max-w-md rounded-2xl',
      lg: 'w-full max-w-lg rounded-2xl',
      xl: 'w-full max-w-xl rounded-2xl',
      full: 'h-full w-full rounded-none',
    };
    return `${sizes[this.size]} ${this.className}`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      document.body.style.overflow = this.isOpen ? 'hidden' : 'unset';
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = 'unset';
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop && !this.isFullscreen) {
      this.close.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.close.emit();
    }
  }
}
