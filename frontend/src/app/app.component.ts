import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { LoaderComponent } from './components/loader/loader.component';
import { NavigationComponent } from './components/navigation/navigation.component';
import { FooterComponent } from './components/navigation/footer.component';
import { NetworkService, HealthStatus } from './services/network.service';
import { SocketService } from './services/socket.service';
import { ToastService } from './services/toast.service';
import { CartService } from './services/cart.service';
import { OrderService } from './services/order.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, LoaderComponent, NavigationComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'cloud-kitchen';
  isOnline = navigator.onLine;
  connectionQuality = 'good';
  showNetworkStatus = false;
  private subscriptions = new Subscription();
  private hasInitialized = false;
  private hideTimeout: any;

  constructor(
    private networkService: NetworkService,
    private socketService: SocketService,
    private toastService: ToastService,
    private cartService: CartService,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    // Initialize with current status without showing indicator
    this.isOnline = this.networkService.isOnline();
    
    // Online status - only show indicator on actual changes, not initial load
    this.subscriptions.add(
      this.networkService.onlineStatus$.subscribe(status => {
        // Skip first (initial) emission, only react to actual changes
        if (this.hasInitialized && status !== this.isOnline) {
          this.isOnline = status;
          this.showNetworkStatus = true;
          
          // Auto hide after 3 seconds
          clearTimeout(this.hideTimeout);
          this.hideTimeout = setTimeout(() => {
            this.showNetworkStatus = false;
          }, 3000);
          
          if (!status) {
            this.toastService.show('You are offline. Some features limited.', 'error');
          } else {
            this.toastService.show('Back online!', 'success');
          }
        } else if (!this.hasInitialized) {
          this.isOnline = status;
          this.hasInitialized = true;
        }
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

    // App-wide table session validation on startup
    this.cartService.validateTableSession().subscribe({
      next: () => console.log('AppComponent: Table session validated on startup'),
      error: (err) => console.error('AppComponent: Table session validation failed:', err)
  });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    clearTimeout(this.hideTimeout);
  }

  get networkIndicatorClass(): string {
    if (!this.isOnline) return 'bg-red-500';
    const quality = this.connectionQuality;
    if (quality === 'excellent') return 'bg-green-500';
    if (quality === 'good') return 'bg-yellow-500';
    return 'bg-orange-500';
  }
}
