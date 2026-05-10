import { Component, inject } from '@angular/core';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DropdownItemTwoComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component-two';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-user-dropdown',
  templateUrl: './user-dropdown.component.html',
  imports:[CommonModule,RouterModule,DropdownComponent,DropdownItemTwoComponent]
})
export class UserDropdownComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isOpen = false;
  readonly user = this.authService.currentUser;

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  get displayName(): string {
    const user = this.user();
    const name = `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim();
    return name || user?.email || 'User';
  }

  get initials(): string {
    const user = this.user();
    const firstInitial = user?.prenom?.charAt(0) ?? '';
    const lastInitial = user?.nom?.charAt(0) ?? '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || 'U';
  }

  signOut() {
    this.authService.logout();
    this.closeDropdown();
    this.router.navigateByUrl('/signin');
  }
}
