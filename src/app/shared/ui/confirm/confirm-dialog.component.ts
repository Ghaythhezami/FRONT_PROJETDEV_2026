import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AppModalComponent } from '../modal/app-modal.component';
import { UiButtonComponent } from '../button/ui-button.component';
import { DialogService } from './dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, AppModalComponent, UiButtonComponent],
  template: `
    @if (dialog.confirmState(); as state) {
      <app-ui-modal
        [isOpen]="true"
        [title]="state.title"
        size="sm"
        [showFooter]="true"
        (close)="dialog.rejectConfirm()"
      >
        <p class="text-sm text-gray-600 dark:text-gray-400">{{ state.message }}</p>
        <div modalFooter class="flex w-full justify-end gap-2">
          <app-ui-button variant="outline" (pressed)="dialog.rejectConfirm()">
            {{ state.cancelLabel }}
          </app-ui-button>
          <app-ui-button
            [variant]="state.variant === 'danger' ? 'danger' : 'primary'"
            (pressed)="dialog.acceptConfirm()"
          >
            {{ state.confirmLabel }}
          </app-ui-button>
        </div>
      </app-ui-modal>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly dialog = inject(DialogService);
}
