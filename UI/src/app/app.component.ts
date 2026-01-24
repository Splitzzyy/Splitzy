import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './splitz/toast/toast.component';
import { SyncService } from './splitz/services/sync.service';
import { NetworkStatusBannerComponent } from "./splitz/network-status-banner/network-status-banner.component";
import { SplitzService } from './splitz/services/splitz.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, NetworkStatusBannerComponent],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {

  constructor(private sync: SyncService, private splitzService: SplitzService) {
    console.log('[APP] constructor');
     navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data?.type === 'SYNC_SUCCESS') {
      this.splitzService.show('Expense synced successfully','success');
    }
  });
  }

  ngOnInit(): void {
    console.log('[APP] ngOnInit');

    window.addEventListener('online', () => {
      console.log('[APP] online event fired');
      this.sync.triggerSync();
    });
  }
}

