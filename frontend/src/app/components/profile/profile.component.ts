import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Angular Animations
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

// Services
import { AuthService, Kitchen } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { InvoiceComponent } from '../invoice/invoice.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../admin/confirm-dialog/confirm-dialog.component';
import { LoyaltyService } from '../../services/loyalty.service';
import { KitchenCreateModalComponent } from './kitchen-create-modal/kitchen-create-modal.component';
import { MatProgressBar } from "@angular/material/progress-bar";

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatChipsModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatProgressBar
],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerList', [
      transition(':enter', [
        query('.animate-item', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          stagger(100, [
            animate('0.4s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class ProfileComponent implements OnInit {
  user: any = null;
  kitchens: Kitchen[] = [];
  addresses: any[] = [];
  orders: any[] = [];
  filteredOrders: any[] = [];
  showAddressForm: boolean = false;
  addressForm: FormGroup;
  searchTerm: string = '';
  loyalty: any = null;
  loadingKitchens = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private orderService: OrderService,
    private loyaltyService: LoyaltyService,
    private router: Router,
    public dialog: MatDialog
  ) {
    this.addressForm = this.fb.group({
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      country: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadLoyalty();
    this.loadOrders();
    this.loadKitchens();
    // Subscribe to user changes (includes kitchen updates)
    this.authService.user$.subscribe(user => {
      this.user = user;
    });
  }

  loadKitchens(): void {
    this.loadingKitchens = true;
    this.authService.getOwnedKitchens().subscribe({
      next: (kitchens: Kitchen[]) => {
        this.kitchens = kitchens;
        // Patch currentKitchen from localStorage into user object for dropdown
        if (this.user) {
          const currentKitchenId = this.authService.getCurrentKitchenId();
          if (currentKitchenId) {
            this.user.currentKitchen = currentKitchenId;
          }
        }
        this.loadingKitchens = false;
      },
      error: (err: any) => {
        console.error('Error loading kitchens:', err);
        this.loadingKitchens = false;
      }
    });
  }

  onKitchenChange(kitchenId: string): void {
    if (kitchenId) {
      this.authService.setCurrentKitchenId(kitchenId);
    }
  }

  getCurrentKitchenName(): string {
    const kitchenId = this.authService.getCurrentKitchenId();
    if (!kitchenId) return 'No kitchen selected';
    const kitchen = this.kitchens.find(k => k._id === kitchenId);
    return kitchen ? kitchen.name : 'Unknown kitchen';
  }

  getCurrentTier(): string {
    if (!this.loyalty?.program?.tiers) return 'Bronze';
    const points = this.loyalty.stats?.totalPoints || 0;
    const tiers = this.loyalty.program.tiers;
    
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (points >= tiers[i].minPoints) {
        return tiers[i].name;
      }
    }
    return 'Bronze';
  }

  getNextTier(): any {
    if (!this.loyalty?.program?.tiers) return null;
    const points = this.loyalty.stats?.totalPoints || 0;
    const tiers = this.loyalty.program.tiers;
    
    for (let i = 0; i < tiers.length; i++) {
      if (points < tiers[i].minPoints) {
        return tiers[i];
      }
    }
    return null; // Already at max tier
  }

  getTierProgress(): number {
    if (!this.loyalty?.program?.tiers) return 0;
    const points = this.loyalty.stats?.totalPoints || 0;
    const tiers = this.loyalty.program.tiers;
    
    let currentTierIndex = 0;
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (points >= tiers[i].minPoints) {
        currentTierIndex = i;
        break;
      }
    }
    
    const currentTier = tiers[currentTierIndex];
    const nextTier = tiers[currentTierIndex + 1];
    
    if (!nextTier) return 100; // Max tier
    
    const progress = ((points - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  getTierProgressText(): string {
    if (!this.loyalty?.program?.tiers) return '';
    const points = this.loyalty.stats?.totalPoints || 0;
    const nextTier = this.getNextTier();
    
    if (!nextTier) return 'You have reached the maximum tier!';
    const pointsNeeded = nextTier.minPoints - points;
    return `${pointsNeeded} more points to reach ${nextTier.name} tier`;
  }

  loadLoyalty(): void {
    this.loyaltyService.getLoyalty().subscribe({
      next: (data: any) => {
        this.loyalty = data;
        console.log(this.loyalty)
      },
      error: (err: any) => {
        console.error('Failed to load loyalty:', err);
      }
    });
  }

  loadUserProfile(): void {
    this.authService.getProfile().subscribe({
      next: (profile: any) => {
        this.user = profile;
        this.addresses = profile.addresses || [];
        // Patch currentKitchen from localStorage into profile
        const currentKitchenId = this.authService.getCurrentKitchenId();
        if (currentKitchenId) {
          this.user.currentKitchen = currentKitchenId;
        }
      },
      error: (error: any) => {
        console.error('Error loading profile:', error);
      }
    });
  }

  loadOrders(): void {
    this.orderService.getOrders().subscribe({
      next: (orders: any[]) => {
        this.orders = orders;
        this.filteredOrders = [...orders];
      },
      error: (error: any) => {
        console.error('Error loading orders:', error);
      }
    });
  }

  searchOrders(): void {
    this.applySearch();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredOrders = [...this.orders];
  }

  private applySearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredOrders = [...this.orders];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase().trim();
    
    this.filteredOrders = this.orders.filter((order: any) =>
      order._id.toLowerCase().includes(searchLower) ||
      order.orderStatus.toLowerCase().includes(searchLower)
    );
  }

  logout(): void {
    this.authService.logout();
  }

  toggleAddressForm(): void {
    this.showAddressForm = !this.showAddressForm;
    if (!this.showAddressForm) {
      this.addressForm.reset();
    }
  }

  addAddress(): void {
    if (this.addressForm.valid) {
      this.authService.addAddress(this.addressForm.value).subscribe({
        next: () => {
          this.loadUserProfile();
          this.showAddressForm = false;
          this.addressForm.reset();
        },
        error: (error: any) => {
          console.error('Error adding address:', error);
        }
      });
    }
  }

  removeAddress(address: any, index: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Address Confirmation',
        message: 'Are you sure you want to permanently delete this address?',
        itemName: address.street,
        confirmText: 'Delete Permanently',
        cancelText: 'Keep Address'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.authService.removeAddress(index).subscribe({
          next: () => {
            this.loadUserProfile();
          },
          error: (error: any) => {
            console.error('Error removing address:', error);
          }
        });
      }
    });
  }

  trackOrder(orderId: string): void {
    this.router.navigate(['/order-tracking', orderId]);
  }

  getStatusClass(status: string, order: any): string {
    switch (status) {
      case 'received': return 'status-received';
      case 'preparing': return 'status-preparing';
      case 'ready': return 'status-ready';
      case 'delivered': return 'status-delivered';
      case 'completed': return 'status-completed';
      case 'cancelled': 
        if (order?.refundStatus === 'succeeded') {
          return 'status-refunded';
        }
        return 'status-cancelled';
      default: return '';
    }
  }

  getRefundDisplay(order: any): string {
    if (!order.refundStatus) return '';
    
    const labels: { [key: string]: string } = {
      'succeeded': `Refunded ₹${order.refundAmount?.toFixed(2) || 0}`,
      'manual_pending': 'Cash refunded',
      'failed': `Refund failed: ${order.refundNotes || 'Unknown error'}`,
      'processing': 'Refund processing... (30min)'
    };
    return labels[order.refundStatus] || order.refundStatus;
  }

  canShowInvoice(order: any): boolean {
    return ['delivered', 'completed'].includes(order.orderStatus);
  }

  openInvoice(orderId: string): void {
    const dialogRef = this.dialog.open(InvoiceComponent, {
      width: '60vw',
      maxWidth: '600px',
      maxHeight: '95vh',
      data: { orderId },
      panelClass: 'invoice-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Profile invoice dialog closed:', result);
    });
  }

  openCreateKitchenModal(): void {
    const dialogRef = this.dialog.open(KitchenCreateModalComponent, {
      width: '500px',
      maxWidth: '95vw',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadKitchens();
      }
    });
  }
}
