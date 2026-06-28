import { Component, inject, signal } from '@angular/core';
import { InputFieldComponent } from './../../form/input/input-field.component';
import { ModalService } from '../../../services/modal.service';

import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { AuthService } from '../../../services/auth.service';
import { ProfileService } from '../../../services/profile.service';

@Component({
  selector: 'app-user-meta-card',
  imports: [
    ModalComponent,
    InputFieldComponent,
    ButtonComponent
],
  templateUrl: './user-meta-card.component.html',
  styles: ``
})
export class UserMetaCardComponent {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);

  readonly authUser = this.authService.currentUser;
  photoUploading = signal(false);
  photoError = signal('');

  constructor(
    public modal: ModalService,
  ) {}

  isOpen = false;
  openModal() { this.isOpen = true; }
  closeModal() { this.isOpen = false; }

  user = {
    firstName: '',
    lastName: '',
    role: '',
    location: '',
    avatar: '/images/user/owner.jpg',
    social: {
      facebook: 'https://www.facebook.com/PimjoHQ',
      x: 'https://x.com/PimjoHQ',
      linkedin: 'https://www.linkedin.com/company/pimjo',
      instagram: 'https://instagram.com/PimjoHQ',
    },
    email: '',
    phone: '',
    bio: '',
  };

  get profile() {
    const user = this.authUser();

    return {
      ...this.user,
      firstName: user?.prenom || this.user.firstName,
      lastName: user?.nom || this.user.lastName,
      role: user?.role || this.user.role,
      location: user?.filiale || this.user.location,
      email: user?.email || this.user.email,
      phone: user?.telephone || this.user.phone,
      bio: user?.role || this.user.bio,
      avatar: user?.photoUrl || this.user.avatar,
    };
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.photoError.set('');
    this.photoUploading.set(true);
    this.profileService.uploadPhoto(file).subscribe({
      next: () => {
        this.photoUploading.set(false);
        input.value = '';
      },
      error: (e) => {
        this.photoUploading.set(false);
        this.photoError.set(e?.error?.message ?? 'Could not upload photo.');
        input.value = '';
      },
    });
  }

  handleSave() {
    this.closeModal();
  }
}
