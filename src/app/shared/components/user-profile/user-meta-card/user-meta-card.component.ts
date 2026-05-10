import { Component, inject } from '@angular/core';
import { InputFieldComponent } from './../../form/input/input-field.component';
import { ModalService } from '../../../services/modal.service';

import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { AuthService } from '../../../services/auth.service';

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

  readonly authUser = this.authService.currentUser;

  constructor(
    public modal: ModalService,
  ) {}

  isOpen = false;
  openModal() { this.isOpen = true; }
  closeModal() { this.isOpen = false; }

  // Example user data (could be made dynamic)
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
    };
  }

  handleSave() {
    // Handle save logic here
    console.log('Saving changes...');
    this.modal.closeModal();
  }
}
