import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

// Animations
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';



export interface RecommendationItem {
  item: {
    _id: string;
    name: string;
    category: string;
    fullPrice: number;
    image?: string;
    supportsHalf?: boolean;
    halfPrice?: number;
  };
  totalQty?: number;
}

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './recommendations.component.html',
  styleUrls: ['./recommendations.component.scss'],
  animations: [
    trigger('staggerFadeIn', [
      transition(':enter', [
        query('.rec-card', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(150, [
            animate('0.4s ease-out')
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class RecommendationsComponent implements OnInit {
  @Input() recommendations: any = null;
  @Input() section: 'user' | 'popular' | 'combos' = 'user';
  @Input() title = 'Recommendations';
  
  loading = false;
  isLoggedIn = false;
  currentUserId = '';

  constructor(
    public cartService: CartService,
    private authService: AuthService,
    private orderService: OrderService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.isLoggedIn = this.authService.isAuthenticated();
    const user = this.authService.getCurrentUser();
    if (user?._id) {
      this.currentUserId = user._id;
    }
  }

  addToCart(item: any, quantityType: 'FULL' | 'HALF' = 'FULL'): void {
    const menuItem = {
      ...item.item,
      price: quantityType === 'HALF' && item.item.halfPrice ? item.item.halfPrice : item.item.fullPrice
    };
    this.cartService.addToCart(menuItem, quantityType);
    this.toastService.show(`Added ${item.item.name} to cart!`, 'success');
  }

  addCombo(items: any[]): void {
    items.forEach(item => this.addToCart(item, 'FULL'));
  }

  getImageUrl(image: string | undefined | null): string {
    if (!image) return 'assets/images/default-food.jpg';
    if (image.startsWith('http')) return image;
    return `${environment.apiUrl.replace('/api', '')}${image}`;
  }

  trackByFn(index: number, item: any): string {
    return item.item._id || index;
  }

  getSectionTitle(): string {
    switch (this.section) {
      case 'user': return this.title || 'Recommended for You';
      case 'popular': return 'Popular Right Now';
      case 'combos': return 'Great Combos';
      default: return 'Recommendations';
    }
  }
}

