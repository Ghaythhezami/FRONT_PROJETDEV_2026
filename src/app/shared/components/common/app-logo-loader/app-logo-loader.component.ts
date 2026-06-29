import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logo-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logo-loader" [class.logo-loader--fullscreen]="fullscreen" role="status" aria-label="Loading">
      <div class="logo-loader__glow" aria-hidden="true"></div>
      <img src="/icons/icon-192x192.png" alt="" class="logo-loader__icon" aria-hidden="true" />
      <p class="logo-loader__label">Agile Ai</p>
    </div>
  `,
  styles: `
    .logo-loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 3rem 1rem;
    }
    .logo-loader--fullscreen {
      min-height: 50vh;
    }
    .logo-loader__glow {
      position: absolute;
      width: 5rem;
      height: 5rem;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(70, 95, 255, 0.35) 0%, transparent 70%);
      animation: logo-glow 2s ease-in-out infinite;
    }
    .logo-loader {
      position: relative;
    }
    .logo-loader__icon {
      width: 4.5rem;
      height: 4.5rem;
      border-radius: 1rem;
      animation: logo-fade-pulse 2s ease-in-out infinite;
      box-shadow: 0 12px 32px rgba(70, 95, 255, 0.25);
    }
    .logo-loader__label {
      font-size: 0.875rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: #667085;
      animation: logo-label-fade 2s ease-in-out infinite;
    }
    :host-context(.dark) .logo-loader__label {
      color: #98a2b3;
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
export class AppLogoLoaderComponent {
  @Input() fullscreen = false;
}
