import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { SplashService } from '../../../services/splash.service';

@Component({
  selector: 'app-splash-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (splash.visible()) {
      <div class="splash-overlay" aria-live="polite" aria-busy="true">
        <div class="splash-overlay__glow" aria-hidden="true"></div>
        <img src="/icons/icon-192x192.png" alt="" class="splash-overlay__icon" aria-hidden="true" />
        <p class="splash-overlay__label">Agile Ai</p>
      </div>
    }
  `,
  styles: `
    .splash-overlay {
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(8px);
      animation: splash-in 0.35s ease-out;
    }
    :host-context(.dark) .splash-overlay {
      background: rgba(11, 15, 25, 0.92);
    }
    .splash-overlay__glow {
      position: absolute;
      width: 7rem;
      height: 7rem;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(70, 95, 255, 0.4) 0%, transparent 70%);
      animation: logo-glow 2s ease-in-out infinite;
    }
    .splash-overlay__icon {
      position: relative;
      width: 5.5rem;
      height: 5.5rem;
      border-radius: 1.25rem;
      animation: logo-fade-pulse 2s ease-in-out infinite;
      box-shadow: 0 16px 40px rgba(70, 95, 255, 0.3);
    }
    .splash-overlay__label {
      position: relative;
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #101828;
      animation: logo-label-fade 2s ease-in-out infinite;
    }
    :host-context(.dark) .splash-overlay__label {
      color: #f9fafb;
    }
    @keyframes splash-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes logo-fade-pulse {
      0%, 100% { opacity: 0.45; transform: scale(0.94); }
      50% { opacity: 1; transform: scale(1); }
    }
    @keyframes logo-glow {
      0%, 100% { opacity: 0.4; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.15); }
    }
    @keyframes logo-label-fade {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }
  `,
})
export class AppSplashOverlayComponent {
  readonly splash = inject(SplashService);
}
