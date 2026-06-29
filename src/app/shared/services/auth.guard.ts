import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ThemeService } from './theme.service';

const LANDING_PREV_THEME_KEY = 'agileai-landing-prev-theme';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasValidSession()) {
    return true;
  }

  return router.createUrlTree(['/signin']);
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasValidSession()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};

export const landingGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const themeService = inject(ThemeService);

  if (authService.hasValidSession()) {
    return router.createUrlTree(['/dashboard']);
  }

  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    sessionStorage.setItem(LANDING_PREV_THEME_KEY, 'dark');
  } else {
    sessionStorage.removeItem(LANDING_PREV_THEME_KEY);
  }
  themeService.setTheme('light');

  return true;
};
