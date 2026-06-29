import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeToggleTwoComponent } from '../../components/common/theme-toggle-two/theme-toggle-two.component';

@Component({
  selector: 'app-auth-page-layout',
  imports: [RouterModule, ThemeToggleTwoComponent],
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
    .auth-orb {
      animation: float 6s ease-in-out infinite;
    }
    .auth-orb-delayed {
      animation: float 8s ease-in-out infinite 1s;
    }
    .auth-glow {
      animation: pulse-glow 4s ease-in-out infinite;
    }
    .auth-brand {
      animation: slide-in 0.7s ease-out both;
    }
    .auth-grid-dot {
      animation: drift 12s linear infinite alternate;
    }
  `,
})
export class AuthPageLayoutComponent {}
