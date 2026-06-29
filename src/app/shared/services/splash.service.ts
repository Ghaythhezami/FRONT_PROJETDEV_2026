import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SplashService {
  readonly visible = signal(false);
  readonly minDurationMs = 2000;

  private shownAt = 0;
  private hideTimer?: ReturnType<typeof setTimeout>;

  show(): void {
    clearTimeout(this.hideTimer);
    this.shownAt = Date.now();
    this.visible.set(true);
  }

  scheduleHide(): void {
    if (!this.visible()) {
      return;
    }
    clearTimeout(this.hideTimer);
    const elapsed = Date.now() - this.shownAt;
    const delay = Math.max(0, this.minDurationMs - elapsed);
    this.hideTimer = setTimeout(() => this.visible.set(false), delay);
  }

  forceHide(): void {
    clearTimeout(this.hideTimer);
    this.visible.set(false);
  }
}
