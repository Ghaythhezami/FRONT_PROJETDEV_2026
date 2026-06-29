import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { PwaInstallBannerComponent } from './shared/components/common/pwa-install-banner/pwa-install-banner.component';
import { AppSplashOverlayComponent } from './shared/components/common/app-splash-overlay/app-splash-overlay.component';
import { SplashService } from './shared/services/splash.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    PwaInstallBannerComponent,
    AppSplashOverlayComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly splash = inject(SplashService);

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.splash.scheduleHide());
  }
}
