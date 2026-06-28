import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { extractApiErrorMessage } from '../utils/api-error.util';
import { ApiFeedbackService } from './api-feedback.service';
import { AuthService } from './auth.service';

/** Surfaces API errors globally; redirects to sign-in on 401. */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const feedback = inject(ApiFeedbackService);
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthRoute =
    request.url.includes('/api/User/authenticate') ||
    request.url.includes('/api/User/register') ||
    request.url.includes('/api/User/refresh');

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAdminUsersList =
        request.url.includes('/api/User/getAll') && error.status === 403;

      const isBackgroundBootstrap =
        request.url.includes('/api/User/details') ||
        request.url.includes('/api/Notifications/mine') ||
        request.url.includes('/hubs/');

      if (error.status === 401 && !isAuthRoute) {
        if (isBackgroundBootstrap) {
          return throwError(() => error);
        }
        auth.logout();
        void router.navigate(['/signin'], {
          queryParams: { returnUrl: router.url },
        });
        return throwError(() => error);
      }

      if (!isAdminUsersList && error.status !== 401 && !isBackgroundBootstrap) {
        feedback.show(extractApiErrorMessage(error), 'error');
      }

      return throwError(() => error);
    }),
  );
};
