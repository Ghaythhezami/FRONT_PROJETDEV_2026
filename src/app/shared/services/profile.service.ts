import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly authService = inject(AuthService);

  uploadPhoto(file: File): Observable<import('./auth.models').AuthUser> {
    return this.authService.uploadProfilePhoto(file);
  }
}
