import { Component } from '@angular/core';
import { ToastContainerComponent } from '../../../ui/toast/toast-container.component';

/** Global toast host — delegates to shared/ui toast container. */
@Component({
  selector: 'app-api-toast',
  standalone: true,
  imports: [ToastContainerComponent],
  template: `<app-toast-container />`,
})
export class ApiToastComponent {}
