import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { LoaderComponent } from './components/loader/loader.component';
import { NavigationComponent } from './components/navigation/navigation.component';
import { FooterComponent } from './components/navigation/footer.component';
import { NetworkService, HealthStatus } from './services/network.service';
import { SocketService } from './services/socket.service';
import { ToastService } from './services/toast.service';
import { Subscription, skip } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, LoaderComponent, NavigationComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'cloud-kitchen';
  isOnline = true;
  connectionQuality = 'good';
  showNetworkStatus = false;
  private subscriptions = new Subscription();

  constructor(
    private networkService: NetworkService,
    private socketService: SocketService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    // Set initial online status without triggering toast
    this.isOnline = this.networkService.isOnline();
    
    // Online status
    this.subscriptions.add(
      this.networkService.onlineStatus$.pipe(
        // Skip initial value to avoid toast on page load/refresh
        skip(1)
      ).subscribe(status => {
        this.isOnline = status;
        this.showNetworkStatus = true;
        if (!status) {
          this.toastService.show('You are offline. Some features limited.', 'error');
        } else {
          this.toastService.show('Back online!', 'success');
        }
        
        // Auto hide network indicator after 5 seconds
        setTimeout(() => {
          this.showNetworkStatus = false;
        }, 5000);
      })
    );

    // Health status
    this.subscriptions.add(
      this.networkService.healthStatus$.subscribe(health => {
        if (health) {
          this.connectionQuality = this.networkService.getConnectionQuality();
        }
      })
    );

    // Socket health updates
    this.subscriptions.add(
      this.socketService.onHealthUpdate().subscribe(healthData => {
        console.log('App: Socket health update:', healthData);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  get networkIndicatorClass(): string {
    if (!this.isOnline) return 'bg-red-500';
    const quality = this.connectionQuality;
    if (quality === 'excellent') return 'bg-green-500';
    if (quality === 'good') return 'bg-yellow-500';
    return 'bg-orange-500';
  }
}
