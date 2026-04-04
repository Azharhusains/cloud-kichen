import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule, AsyncPipe } from '@angular/common';
import { NavigationComponent } from './components/navigation/navigation.component';
import { ThemeService } from './services/theme.service';
import { NetworkService } from './services/network.service';
import { OfflineQueueService } from './services/offline-queue.service';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet, 
    NavigationComponent, 
    CommonModule, 
    AsyncPipe,
    MatIconModule, 
    MatBadgeModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'cloud-kitchen';
  themeService = inject(ThemeService);
  networkService = inject(NetworkService);
  queueService = inject(OfflineQueueService);

  isOnline$ = this.networkService.isOnline$;
  queueLength$ = this.queueService.queue$;
  queueLength = signal(0);
  
  private showStatusSubject = new BehaviorSubject<boolean>(false);
  public showNetworkStatus$ = this.showStatusSubject.asObservable();
  private lastStatus = true; // Assume initial online

  get isDarkMode() {
    return this.themeService.currentTheme.name === 'dark';
  }

  constructor() {
    // Subscribe to queue length for badge
    this.queueService.queue$.subscribe(queue => {
      const length = queue.filter((item: any) => !['GET', 'HEAD', 'OPTIONS'].includes(item.method)).length;
      this.queueLength.set(length);
    });

    // Network status change detection with auto-hide
    this.networkService.isOnline$.subscribe(isOnline => {
      if (isOnline !== this.lastStatus) {
        this.lastStatus = isOnline;
        this.showStatusSubject.next(true);
        // Hide after 5 seconds
        setTimeout(() => {
          this.showStatusSubject.next(false);
        }, 5000);
      }
    });
  }

  ngOnInit(): void {
    this.themeService.initTheme();
  }
}
