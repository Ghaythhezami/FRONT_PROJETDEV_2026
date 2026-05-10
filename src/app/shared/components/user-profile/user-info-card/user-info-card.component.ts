import { Component, inject } from '@angular/core';
import { ModalService } from '../../../services/modal.service';

import { InputFieldComponent } from '../../form/input/input-field.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { ModalComponent } from '../../ui/modal/modal.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-user-info-card',
  imports: [
    InputFieldComponent,
    ButtonComponent,
    LabelComponent,
    ModalComponent
],
  templateUrl: './user-info-card.component.html',
  styles: ``
})
export class UserInfoCardComponent {
  private readonly authService = inject(AuthService);

  readonly authUser = this.authService.currentUser;

  constructor(
    public modal: ModalService,
  ) {}

  isOpen = false;
  openModal() { this.isOpen = true; }
  closeModal() { this.isOpen = false; }

  user = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    filiale: '',
    social: {
      facebook: 'https://www.facebook.com/PimjoHQ',
      x: 'https://x.com/PimjoHQ',
      linkedin: 'https://www.linkedin.com/company/pimjo',
      instagram: 'https://instagram.com/PimjoHQ',
    },
  };

  get profile() {
    const user = this.authUser();

    return {
      ...this.user,
      firstName: user?.prenom || this.user.firstName,
      lastName: user?.nom || this.user.lastName,
      email: user?.email || this.user.email,
      phone: user?.telephone || this.user.phone,
      role: user?.role || this.user.role,
      filiale: user?.filiale || this.user.filiale,
    };
  }

  handleSave() {
    // Handle save logic here
    console.log('Saving changes...');
    this.modal.closeModal();
  }
}
