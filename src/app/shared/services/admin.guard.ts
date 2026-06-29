import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const role = authService.currentUser()?.role?.trim().toLowerCase();

  if (role === 'admin') {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
