import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './splitz/toast/toast.component';
import { SyncService } from './splitz/services/sync.service';
import { NetworkStatusBannerComponent } from "./splitz/network-status-banner/network-status-banner.component";
import { SplitzService } from './splitz/services/splitz.service';
import { TokenRefreshService } from './splitz/services/token-refresh.service';
import { ApiAvailabilityService } from './splitz/services/api-availability.service';
import { ServiceUnavailableComponent } from './splitz/service-unavailable/service-unavailable.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, NetworkStatusBannerComponent, ServiceUnavailableComponent, CommonModule],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  isApiAvailable = signal<boolean>(true);

  constructor(
    private sync: SyncService,
    private splitzService: SplitzService,
    private tokenRefreshService: TokenRefreshService,
    private apiAvailabilityService: ApiAvailabilityService
  ) {
    console.log('[APP] constructor');
    navigator.serviceWorker?.addEventListener('message', event => {
      if (event.data?.type === 'SYNC_SUCCESS') {
        this.splitzService.show('Expense synced successfully', 'success');
      }
    });
  }

  ngOnInit(): void {
    console.log('[APP] ngOnInit');

    // Monitor API availability status
    this.apiAvailabilityService.getApiStatus().subscribe(status => {
      this.isApiAvailable.set(status.isAvailable);
    });

    window.addEventListener('online', () => {
      console.log('[APP] online event fired');
      this.sync.triggerSync();
    });
  }
}

