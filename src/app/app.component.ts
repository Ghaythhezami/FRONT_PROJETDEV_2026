import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PwaInstallBannerComponent } from './shared/components/common/pwa-install-banner/pwa-install-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    PwaInstallBannerComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'Agile Ai';
}
