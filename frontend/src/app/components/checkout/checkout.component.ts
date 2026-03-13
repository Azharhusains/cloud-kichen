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
import { MatProgressBarModule } from '@angular/material/progress-bar';

// Razorpay - loaded dynamically

// Angular Animations
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

// Services
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';

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
    MatDividerModule,
    MatProgressBarModule
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
  paymentMethod: string = 'cod';
  couponCode: string = '';
  couponDiscount: number = 0;
  finalTotal: number = 0;
  razorpayResponse: any = null;
  loadingPayment: boolean = false;

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router,
    private cartService: CartService,
    private toastService: ToastService
  ) {
    this.checkoutForm = this.fb.group({
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      country: ['', Validators.required]
    });
    this.finalTotal = this.getTotal();
  }

  ngOnInit(): Promise<void> {
    this.loadCart();
    this.loadAddresses();
    return Promise.resolve();
  }

  applyCoupon(): void {
    if (!this.couponCode.trim()) {
      this.couponDiscount = 0;
      this.finalTotal = this.getTotal();
      return;
    }

    // Mock for demo - replace with API call to /api/coupons/validate
    const mockCoupons: { [key: string]: number } = {
      'FIRST10': 0.1,
      'WELCOME20': 20
    };
    const discount = mockCoupons[this.couponCode.toUpperCase() as keyof typeof mockCoupons] || 0;
    this.couponDiscount = discount * this.getSubtotal();
    this.finalTotal = Math.max(0, this.getTotal() - this.couponDiscount);
    if (this.couponDiscount > 0) {
      this.toastService.show(`Coupon applied! Saved ₹${this.couponDiscount.toFixed(2)}`, 'success');
    } else {
      this.toastService.show('Invalid coupon', 'error');
    }
  }

  loadCart(): void {
    this.cart = this.cartService.getCart();
    this.updateTotals();
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
    this.newAddreesActive = true;
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

  private updateTotals(): void {
    this.finalTotal = this.getTotal() - this.couponDiscount;
  }

  goBack(): void {
    this.router.navigate(['/cart']);
  }

  async onSubmit(): Promise<void> {
    if (!this.checkoutForm.valid || this.cart.length === 0) {
      this.toastService.show('Please complete all fields', 'error');
      return;
    }

    this.loading = true;

    const orderData = {
      items: this.cart.map((item: any) => ({
        menuItem: item.menuItem._id,
        quantity: item.quantity,
        price: item.menuItem.price
      })),
      subtotal: this.getSubtotal(),
      taxAmount: this.getTax(),
      deliveryCharge: this.deliveryCharge,
      totalAmount: this.finalTotal,
      deliveryAddress: this.checkoutForm.value,
      saveAddress: this.saveAddressForFuture
    };

    if (this.paymentMethod === 'cod') {
      // COD direct order
          this.orderService.createOrder({ ...orderData, paymentMethod: 'cod' }).subscribe({
        next: (order) => {
          this.loading = false;
          this.cartService.clearCart();
          this.router.navigate(['/order-confirmation', order._id]);
        },
        error: (error) => {
          console.error('COD order error:', error);
          this.toastService.show('Order failed. Try again.', 'error');
          this.loading = false;
        }
      });
    } else {
      // Online payment - Razorpay
        this.orderService.createPaymentSession(orderData, this.couponCode).subscribe({
        next: (response) => {
          this.razorpayResponse = response;
          this.finalTotal = response.finalTotal;
          this.couponDiscount = response.couponDiscount;
          this.loading = false;
          this.loadingPayment = true;
          this.initiateRazorpayPayment();
        },
        error: (error) => {
          console.error('Payment session error:', error);
          this.toastService.show('Payment setup failed: ' + (error.error?.message || error.message), 'error');
          this.loading = false;
        }
      });
    }
  }

  private initiateRazorpayPayment(): void {
    if (!this.razorpayResponse) {
      this.toastService.show('Payment setup failed', 'error');
      this.loading = false;
      return;
    }

    // Load Razorpay script if not loaded
    if ((window as any)['Razorpay'] === undefined) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        this.openRazorpayCheckout();
      };
    script.onerror = () => {
        this.toastService.show('Failed to load Razorpay', 'error');
        this.loadingPayment = false;
        this.loading = false;
      };
      document.head.appendChild(script);
    } else {
      this.openRazorpayCheckout();
    }
  }

  private openRazorpayCheckout(): void {
    const options = {
      key: this.razorpayResponse.razorpayKeyId,
      amount: this.razorpayResponse.amount, // in paise
      currency: 'INR',
      name: 'Cloud Kitchen',
      description: 'Order Payment',
      order_id: this.razorpayResponse.razorpayOrderId,
      handler: this.onRazorpayPayment.bind(this),
      prefill: {
        name: 'Customer',
        email: '', // optional
        contact: '' // optional
      },
      theme: {
        color: '#3399cc'
      }
    };

    const rzp1 = new (window as any)['Razorpay'](options);
    
    rzp1.on('payment.failed', this.onRazorpayFailed.bind(this));
    rzp1.on('payment.cancelled', this.onRazorpayFailed.bind(this));
    
    rzp1.open();
  }

  onRazorpayPayment(response: any): void {
    // Verify payment with backend
    this.orderService.verifyPayment(
      response.razorpay_order_id,
      response.razorpay_payment_id,
      response.razorpay_signature
    ).subscribe({
      next: (result) => {
        this.loadingPayment = false;
        this.cartService.clearCart();
        this.toastService.show(`Payment Success! Order ${result.orderNumber}`, 'success');
        this.router.navigate(['/order-confirmation', result.orderId]);
      },
      error: (err) => {
        console.error('Verify error:', err);
        this.loadingPayment = false;
        this.toastService.show('Payment verification failed. Contact support.', 'error');
      }
    });
  }

  onRazorpayFailed(error: any): void {
    console.error('Razorpay failed/cancelled:', error);
    this.loadingPayment = false;
    this.toastService.show('Payment cancelled or failed. Please try again.', 'error');
  }
}
