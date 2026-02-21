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
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';

// Angular Animations
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

// Services
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-checkout',
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
    MatRadioModule,
    MatCheckboxModule,
    MatDividerModule
  ],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
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
export class CheckoutComponent implements OnInit {
  checkoutForm: FormGroup;
  cart: any[] = [];
  deliveryCharge: number = 2.99;
  taxRate: number = 0.05;
  addresses: any[] = [];
  selectedAddressIndex: number = -1;
  saveAddressForFuture: boolean = false;
  loading: boolean = false;
  newAddreesActive: boolean = false;

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router,
    private cartService: CartService
  ) {
    this.checkoutForm = this.fb.group({
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      country: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadCart();
    this.loadAddresses();
  }

  loadCart(): void {
    this.cart = this.cartService.getCart();
  }

  loadAddresses(): void {
    this.authService.getProfile().subscribe({
      next: (profile: any) => {
        this.addresses = profile.addresses || [];
      },
      error: () => {
        this.addresses = [];
      }
    });
  }

  selectAddress(index: number): void {
    this.selectedAddressIndex = index;
    const address = this.addresses[index];
    this.newAddreesActive = false;
    this.checkoutForm.patchValue(address);
  }

  clearSelection(): void {
    this.selectedAddressIndex = -1;
    this.newAddreesActive = true
    this.checkoutForm.reset();
  }

  isAddressSelected(): boolean {
    return this.selectedAddressIndex >= 0 || this.checkoutForm.valid;
  }

  getSubtotal(): number {
    return this.cart.reduce((sum: number, item: any) => sum + (item.menuItem.price * item.quantity), 0);
  }

  getTax(): number {
    return this.getSubtotal() * this.taxRate;
  }

  getTotal(): number {
    return this.getSubtotal() + this.getTax() + this.deliveryCharge;
  }

  goBack(): void {
    this.router.navigate(['/cart']);
  }

  onSubmit(): void {
    if (!this.checkoutForm.valid || this.cart.length === 0) {
      return;
    }

    this.loading = true;
    const orderData = {
      items: this.cart.map((item: any) => ({
        menuItem: item.menuItem._id,
        quantity: item.quantity,
        price: item.menuItem.price
      })),
      deliveryAddress: this.checkoutForm.value,
      paymentMethod: 'cod',
      saveAddress: this.saveAddressForFuture
    };

    this.orderService.createOrder(orderData).subscribe({
      next: (order) => {
        this.cartService.clearCart();
        this.router.navigate(['/order-confirmation', order.order_id]);
      },
      error: (error) => {
        console.error('Error creating order:', error);
        this.loading = false;
      }
    });
  }
}
