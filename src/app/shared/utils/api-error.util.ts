import { HttpErrorResponse } from '@angular/common/http';

/** Human-readable API error — never expose raw HttpClient failure strings in toasts. */
export function extractApiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (!error) {
    return fallback;
  }

  if (error instanceof HttpErrorResponse) {
    const body = error.error;

    if (typeof body === 'string' && body.trim() && !body.startsWith('Http failure')) {
      try {
        const parsed = JSON.parse(body) as Record<string, unknown>;
        return String(parsed['message'] ?? parsed['Message'] ?? parsed['title'] ?? fallback);
      } catch {
        return body;
      }
    }

    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      const message = record['message'] ?? record['Message'] ?? record['title'] ?? record['Title'];
      if (message) {
        return String(message);
      }
      const errors = record['errors'] ?? record['Errors'];
      if (errors && typeof errors === 'object') {
        const first = Object.values(errors as Record<string, unknown[]>)[0]?.[0];
        if (first) {
          return String(first);
        }
      }
    }

    if (error.status === 0) {
      return 'Unable to reach the server. Check that the API is running.';
    }
    if (error.status === 400) {
      return 'Invalid request. Check your input and try again.';
    }
    if (error.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (error.status === 404) {
      return 'The requested resource was not found.';
    }
    if (error.status >= 500) {
      return 'Server error — please try again or contact support.';
    }

    return fallback;
  }

  if (error instanceof Error && error.message && !error.message.startsWith('Http failure')) {
    return error.message;
  }

  return fallback;
}
