import { Component, OnInit, OnDestroy, signal } from '@angular/core';

type NetworkState = 'online' | 'offline';

@Component({
  selector: 'app-network-status-banner',
  imports: [],
  templateUrl: './network-status-banner.component.html',
  styleUrl: './network-status-banner.component.css',
})
export class NetworkStatusBannerComponent implements OnInit, OnDestroy {

  state = signal<NetworkState>(navigator.onLine ? 'online' : 'offline');
  visible = signal<boolean>(false);
  minimized = signal<boolean>(false);

  private timer: any;

  ngOnInit(): void {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    if (!navigator.onLine) {
      this.showOffline();
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    this.state.set('online');
    this.visible.set(true);
    this.minimized.set(false);

    this.resetTimer(() => {
      this.visible.set(false);
    });
  };

  private handleOffline = () => {
    this.showOffline();
  };

  private showOffline() {
    this.state.set('offline');
    this.visible.set(true);
    this.minimized.set(false);

    this.resetTimer(() => {
      this.minimized.set(true);
    });
  }

  private resetTimer(action: () => void) {
    clearTimeout(this.timer);
    this.timer = setTimeout(action, 3000);
  }
}
