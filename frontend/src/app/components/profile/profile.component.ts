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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AsyncPipe } from '@angular/common';

// Angular Animations
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

// Services
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { MatDialog } from '@angular/material/dialog';
import { InvoiceComponent } from '../invoice/invoice.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../admin/confirm-dialog/confirm-dialog.component';
import { KitchenService, KitchenStatus } from '../../services/kitchen.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


// Type definitions to fix NG8107 - strict typing
interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface OrderItem {
  menuItem: {
    name: string;
  };
  quantity: number;
}

interface SubOrder {
  items: OrderItem[];
  isCancelled: boolean;
  status: string;
}

interface Order {
  _id: string;
  orderNumber?: string;
  orderStatus: string;
  createdAt: string;
  items: OrderItem[];
  subOrders: SubOrder[];
  totalAmount: number;
  refundStatus?: string;
  refundAmount?: number;
  refundNotes?: string;
}

interface ProfileUser {
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'CUSTOMER';
  addresses: Address[];
}

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
    MatSlideToggleModule,
    MatProgressSpinnerModule
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
  user: ProfileUser | null = null;
  addresses: Address[] = [];
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  showAddressForm: boolean = false;
  addressForm: FormGroup;
  searchTerm: string = '';
  kitchenStatus: KitchenStatus | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private orderService: OrderService,
    private kitchenService: KitchenService,
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
    this.loadOrders();
    // Load kitchen status for admin
    this.kitchenService.getStatus().subscribe({
      next: status => {
        console.log('KitchenStatus loaded:', status);
        this.kitchenStatus = status;
      }
    });
    this.kitchenService.status$.subscribe(status => {
      console.log('Realtime kitchen update:', status);
      this.kitchenStatus = status;
    });
  }

  toggleKitchen(status: 'open' | 'closed', note: string): void {
    if (!this.user || this.user.role !== 'ADMIN' && this.user.role !== 'SUPER_ADMIN') return;
    
    this.kitchenService.toggleStatus(status, note).subscribe({
      next: () => {
        console.log('Kitchen status toggled');
      },
      error: (error) => {
        console.error('Error toggling kitchen status:', error);
      }
    });
  }

  loadUserProfile(): void {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.user = profile;
        this.addresses = profile.addresses || [];
      },
      error: (error) => {
        console.error('Error loading profile:', error);
      }
    });
  }

loadOrders(): void {
    this.orderService.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.filteredOrders = [...orders];
      },
      error: (error) => {
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
    
    this.filteredOrders = this.orders.filter(order =>
      // Search by MongoDB _id
      order._id.toLowerCase().includes(searchLower) ||
      // Search by order status
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
        error: (error) => {
          console.error('Error adding address:', error);
        }
      });
    }
  }

  removeAddress(address: Address, index: number): void {
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
          error: (error) => {
            console.error('Error removing address:', error);
          }
        });
      }
    });
  }

  trackOrder(orderId: string): void {
    this.router.navigate(['/order-tracking', orderId]);
  }

  getStatusClass(status: string, order: Order): string {
    switch (status) {
      case 'received': return 'status-received';
      case 'preparing': return 'status-preparing';
      case 'ready': return 'status-ready';
      case 'delivered': return 'status-delivered';
      case 'completed': return 'status-completed';
      case 'cancelled': 
        if (order.refundStatus === 'succeeded') {
          return 'status-refunded';
        }
        return 'status-cancelled';
      default: return '';
    }
  }

  getRefundDisplay(order: Order): string {
    if (!order.refundStatus) return '';
    
    const labels: { [key: string]: string } = {
      'succeeded': `Refunded ₹${(order.refundAmount || 0).toFixed(2)}`,
      'manual_pending': 'Cash refunded',
      'failed': `Refund failed: ${order.refundNotes || 'Unknown error'}`,
      'processing': 'Refund processing... (30min)'
    };
    console.log('labels', labels)
    return labels[order.refundStatus] || order.refundStatus;
  }

  /**
   * Check if invoice is available for order
   */
  canShowInvoice(order: Order): boolean {
    return ['delivered', 'completed'].includes(order.orderStatus);
  }

  /**
   * Open invoice dialog from profile
   */
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
}

