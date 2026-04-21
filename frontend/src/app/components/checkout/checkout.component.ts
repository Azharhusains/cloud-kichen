import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Razorpay - loaded dynamically

// Angular Animations
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

// Services
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { MatChipsModule } from '@angular/material/chips';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';


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
    MatProgressBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],

  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  animations: [
    trigger('premiumSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-30px) scale(0.95)' }),
        animate('0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)', style({ opacity: 1, transform: 'translateX(0) scale(1)' }))
      ])
    ]),
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
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class CheckoutComponent implements OnInit, OnDestroy {
  checkoutForm: FormGroup;
  cart: any[] = [];
  deliveryCharge: number = 2.99;
  taxRate: number = 0.05;
  addresses: any[] = [];
  selectedAddressIndex: number = -1;
  saveAddressForFuture: boolean = false;
  loading: boolean = false;
  newAddressActive: boolean = false;
  paymentMethod: string = 'cod';
  couponCode: string = '';
  couponDiscount: number = 0;
  finalTotal: number = 0;
  razorpayResponse: any = null;
  loadingPayment: boolean = false;
  
  
  // NEW: Order type (delivery or dine-in)
  orderType: 'delivery' | 'dine-in' = 'delivery';
  tableInfo: any = null;
  mainOrderId: string | null = null;
  isAddMoreMode: boolean = false;

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    public cartService: CartService,
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

  ngOnInit(): void {
    this.loadCart();
    this.loadAddresses();
    this.loadTableInfo();
    
    // Check for add more mode query params
    this.route.queryParams.subscribe(params => {
      if (params['addMore'] === 'true' && params['mainOrderId']) {
        this.isAddMoreMode = true;
        this.mainOrderId = params['mainOrderId'];
        this.orderType = 'dine-in';
        
        // Set table info from params
        if (params['tableNumber']) {
          this.tableInfo = { tableNumber: params['tableNumber'] };
        }
      }
    });
  }

  applyCoupon(): void {
    if (!this.couponCode.trim()) {
      this.couponDiscount = 0;
      this.updateTotals();
      return;
    }

    // Mock for demo - replace with API call later
    const mockCoupons: { [key: string]: number } = {
      'FIRST10': 0.1,
      'WELCOME20': 20
    };
    const discountRate = mockCoupons[this.couponCode.toUpperCase()] || 0;
    if (discountRate > 0) {
      this.couponDiscount = discountRate * this.getSubtotal();
      this.updateTotals();
      this.toastService.show(`Coupon applied! Saved ₹${this.couponDiscount.toFixed(2)}`, 'success');
    } else {
      this.couponDiscount = 0;
      this.updateTotals();
      this.toastService.show('Invalid coupon code', 'error');
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

  loadTableInfo(): void {
    // Check if there's table info stored (for dine-in)
    const tableInfo = this.cartService.getTableInfo();
    if (tableInfo) {
      this.tableInfo = tableInfo;
      this.orderType = 'dine-in';
    } else {
      this.orderType = 'delivery';
    }
  }

  selectAddress(index: number): void {
    this.selectedAddressIndex = index;
    const address = this.addresses[index];
    this.newAddressActive = false;
    this.checkoutForm.patchValue(address);
  }

  clearSelection(): void {
    this.selectedAddressIndex = -1;
    this.newAddressActive = true;
    this.checkoutForm.reset();
  }

  isAddressSelected(): boolean {
    return this.selectedAddressIndex >= 0 || this.checkoutForm.valid;
  }

  getSubtotal(): number {
    return this.cartService.getSubtotal();
  }

  getTax(): number {
    return this.getSubtotal() * this.taxRate;
  }

  getDeliveryCharge(): number {
    // No delivery charge for dine-in orders
    return this.orderType === 'dine-in' ? 0 : this.deliveryCharge;
  }

  getTotal(): number {
    return this.getSubtotal() + this.getTax() + this.getDeliveryCharge();
  }

  private updateTotals(): void {
    this.finalTotal = this.getTotal() - this.couponDiscount;
  }

  increaseQuantity(item: any): void {
    this.cartService.increaseQuantity(item.menuItem._id, item.quantityType);
  }

  decreaseQuantity(item: any): void {
    this.cartService.decreaseQuantity(item.menuItem._id, item.quantityType);
  }

  toggleItemType(item: any): void {
    this.cartService.toggleQuantityType(item.menuItem._id, item.quantityType);
  }

  removeFromCart(item: any): void {
    this.cartService.removeFromCart(item.menuItem._id, item.quantityType);
    this.loadCart();
    this.toastService.show('Item removed from cart', 'info');
  }

  goBack(): void {
    this.router.navigate(['/cart']);
  }

  onSubmit(): void {
    // Validate based on order type
    if (this.orderType === 'dine-in' && !this.tableInfo) {
      this.toastService.show('Please select a table first', 'error');
      return;
    }
    
    if (this.orderType === 'delivery' && !this.isAddressSelected()) {
      this.toastService.show('Please select or enter a delivery address', 'error');
      return;
    }

    if (this.cart.length === 0) {
      this.toastService.show('Cart is empty', 'error');
      return;
    }

    this.loading = true;

    // Prepare common order data
    const orderData: any = {
      items: this.cart.map((item: any) => ({
        menuItem: item.menuItem._id,
        quantity: item.quantity,
        quantityType: item.quantityType,
        price: this.cartService.getCartItemPrice(item)
      })),
      subtotal: this.getSubtotal(),
      taxAmount: this.getTax(),
      deliveryCharge: this.getDeliveryCharge(),
      totalAmount: this.finalTotal,
      couponCode: this.couponCode,
      couponDiscount: this.couponDiscount,
      paymentMethod: this.paymentMethod,
      orderType: this.orderType
    };

    // Add table info for dine-in
    if (this.orderType === 'dine-in' && this.tableInfo) {
      orderData.tableNumber = this.tableInfo.tableNumber;
    }

    // Add delivery address for delivery orders
    if (this.orderType === 'delivery') {
      orderData.deliveryAddress = this.checkoutForm.value;
      orderData.saveAddress = this.saveAddressForFuture;
    }

    // Force COD for dine-in orders
    if (this.orderType === 'dine-in') {
      this.paymentMethod = 'cod';
    }
    
    if (this.paymentMethod === 'cod') {
      if (this.isAddMoreMode && this.mainOrderId) {
        // Add more items to existing order
        this.orderService.addMoreToOrder(this.mainOrderId, orderData.items).subscribe({
          next: (subOrder: any) => {
            this.loading = false;
            this.cartService.clearCart();
            this.toastService.success('Items added to your order successfully');
            this.router.navigate(['/order-tracking', this.mainOrderId]);
          },
          error: (error: any) => {
            console.error('Add more error:', error);
            this.toastService.show('Failed to add items: ' + (error.error?.message || 'Try again'), 'error');
            this.loading = false;
          }
        });
      } else {
        // COD - create order directly
        this.orderService.createOrder(orderData).subscribe({
          next: (order: any) => {
            this.loading = false;
            this.cartService.clearCart();
            if (this.orderType === 'dine-in') {
              this.cartService.clearTableInfo();
            }
            this.router.navigate(['/order-confirmation', order._id]);
          },
          error: (error: any) => {
            console.error('Order error:', error);
            this.toastService.show('Order failed: ' + (error.error?.message || 'Try again'), 'error');
            this.loading = false;
          }
        });
      }
    } else {
      // Online payment - Razorpay
      this.orderService.createPaymentSession(orderData).subscribe({
        next: (response: any) => {
          this.razorpayResponse = response;
          this.loadingPayment = true;
          this.loading = false;
          this.initiateRazorpayPayment();
        },
        error: (error: any) => {
          console.error('Payment session error:', error);
          this.toastService.show('Payment setup failed: ' + (error.error?.message || error.message), 'error');
          this.loading = false;
          this.loadingPayment = false;  // Reset payment loading too
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
      },
      modal: {
        ondismiss: () => {
          console.log('Razorpay dismissed by user');
          this.onRazorpayFailed(new Error('Payment dismissed by user'));
        }
      }
    };

    const rzp1 = new (window as any)['Razorpay'](options);
    
    rzp1.on('payment.failed', this.onRazorpayFailed.bind(this));
    rzp1.on('payment.cancelled', this.onRazorpayFailed.bind(this));
    
    rzp1.open();
  }

  onRazorpayPayment(response: any): void {
    // Verify payment with backend
    const deliveryAddress = this.orderType === 'delivery' ? this.checkoutForm.value : null;
    this.orderService.verifyPayment(
      response.razorpay_order_id,
      response.razorpay_payment_id,
      response.razorpay_signature,
      deliveryAddress
    ).subscribe({
      next: (result) => {
        this.loadingPayment = false;
        this.loading = false;
        this.cartService.clearCart();
        this.toastService.show(`Payment Success! Order ${result.orderNumber}`, 'success');
        this.router.navigate(['/order-confirmation', result.orderId]);
      },
      error: (err) => {
        console.error('Verify error:', err);
        this.loadingPayment = false;
        this.loading = false;
        this.toastService.show('Payment verification failed. Contact support.', 'error');
      }
    });
  }

  onRazorpayFailed(error: any): void {
    console.error('Razorpay failed/cancelled:', error);
    this.loadingPayment = false;
    this.loading = false;
    // this.toastService.show('Payment cancelled. Ready to try again.', 'info');
  }

  ngOnDestroy(): void {
    this.loading = false;
    this.loadingPayment = false;
  }

  getImageUrl(imagePath: string | null): string {
    if (!imagePath) return '';
    if (imagePath.startsWith('/uploads/')) {
      const baseUrl = environment.apiUrl.replace('/api', '');
      return `${baseUrl}${imagePath}`;
    }
    return imagePath;
  }
}

