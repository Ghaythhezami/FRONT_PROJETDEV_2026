import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID, signal } from '@angular/core';
import { UiButtonComponent } from '../../../ui';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Component({
  selector: 'app-pwa-install-banner',
  standalone: true,
  imports: [CommonModule, UiButtonComponent],
  template: `
    @if (visible()) {
      <div class="fixed bottom-4 left-4 right-4 z-[99999] mx-auto max-w-lg rounded-2xl border border-brand-200 bg-white p-4 shadow-xl dark:border-brand-500/30 dark:bg-gray-900 sm:left-auto sm:right-6">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">A</span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-gray-900 dark:text-white">Install Agile AI</p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add the app to your home screen for quick access — works offline for cached pages.
            </p>
            <div class="mt-3 flex gap-2">
              <app-ui-button size="sm" (pressed)="install()">Install app</app-ui-button>
              <app-ui-button size="sm" variant="ghost" (pressed)="dismiss()">Not now</app-ui-button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class PwaInstallBannerComponent {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  readonly visible = signal(false);

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      if (!localStorage.getItem('agile-ai-pwa-dismissed')) {
        this.visible.set(true);
      }
    });

    window.addEventListener('appinstalled', () => {
      this.visible.set(false);
      this.deferredPrompt = null;
    });
  }

  async install(): Promise<void> {
    if (!this.deferredPrompt) {
      return;
    }
    await this.deferredPrompt.prompt();
    const choice = await this.deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      this.visible.set(false);
    }
    this.deferredPrompt = null;
  }

  dismiss(): void {
    this.visible.set(false);
    localStorage.setItem('agile-ai-pwa-dismissed', '1');
  }
}
