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

// Angular Animations
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

// Services
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';

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
    MatChipsModule
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
  addresses: any[] = [];
  orders: any[] = [];
  filteredOrders: any[] = [];
  showAddressForm: boolean = false;
  addressForm: FormGroup;
  searchTerm: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private orderService: OrderService,
    private router: Router
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

  removeAddress(index: number): void {
    this.authService.removeAddress(index).subscribe({
      next: () => {
        this.loadUserProfile();
      },
      error: (error) => {
        console.error('Error removing address:', error);
      }
    });
  }

  trackOrder(orderId: string): void {
    this.router.navigate(['/order-tracking', orderId]);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'received': return 'status-received';
      case 'preparing': return 'status-preparing';
      case 'ready': return 'status-ready';
      case 'delivered': return 'status-delivered';
      default: return '';
    }
  }
}
