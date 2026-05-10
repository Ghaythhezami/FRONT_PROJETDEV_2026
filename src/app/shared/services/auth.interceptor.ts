import { HttpInterceptorFn } from '@angular/common/http';

const ACCESS_TOKEN_KEY = 'agile_ai_access_token';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token =
    localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY);

  if (!token) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
