import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly stateSignal = signal<ConfirmState | null>(null);

  readonly confirmState = this.stateSignal.asReadonly();

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.stateSignal.set({
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        variant: options.variant ?? 'primary',
        resolve,
      });
    });
  }

  acceptConfirm(): void {
    const state = this.stateSignal();
    if (state) {
      state.resolve(true);
      this.stateSignal.set(null);
    }
  }

  rejectConfirm(): void {
    const state = this.stateSignal();
    if (state) {
      state.resolve(false);
      this.stateSignal.set(null);
    }
  }
}
