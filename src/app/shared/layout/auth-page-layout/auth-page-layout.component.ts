import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeToggleTwoComponent } from '../../components/common/theme-toggle-two/theme-toggle-two.component';
import { MiniKanbanShowcaseComponent } from '../../components/agile/mini-kanban-showcase/mini-kanban-showcase.component';

@Component({
  selector: 'app-auth-page-layout',
  imports: [RouterModule, ThemeToggleTwoComponent, MiniKanbanShowcaseComponent],
  templateUrl: './auth-page-layout.component.html',
  styles: `
    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-18px) rotate(3deg); }
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.35; transform: scale(1); }
      50% { opacity: 0.65; transform: scale(1.08); }
    }
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(-24px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes drift {
      0% { transform: translate(0, 0); }
      100% { transform: translate(30px, -20px); }
    }
    @keyframes auth-shimmer {
      0% { background-position: 200% center; }
      100% { background-position: -200% center; }
    }
    .auth-orb { animation: float 6s ease-in-out infinite; }
    .auth-orb-delayed { animation: float 8s ease-in-out infinite 1s; }
    .auth-glow { animation: pulse-glow 4s ease-in-out infinite; }
    .auth-brand { animation: slide-in 0.7s ease-out both; }
    .auth-grid-dot { animation: drift 12s linear infinite alternate; }
    .auth-dot-grid {
      position: absolute; inset: 0; opacity: 0.15;
      background-image: radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px);
      background-size: 24px 24px;
      animation: drift 18s linear infinite alternate;
    }
    .auth-feature-line {
      animation: slide-in 0.6s ease-out both;
    }
    .auth-feature-line:nth-child(2) { animation-delay: 0.1s; }
    .auth-feature-line:nth-child(3) { animation-delay: 0.2s; }
  `,
})
export class AuthPageLayoutComponent {}
