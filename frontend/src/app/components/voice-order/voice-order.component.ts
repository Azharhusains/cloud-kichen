import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Angular Material Modules
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

// Voice Service
import { VoiceService, VoiceState, AIResponse } from '../../services/voice.service';

// Cart Service
import { CartService, CartItem } from '../../services/cart.service';

// Auth Service
import { AuthService } from '../../services/auth.service';

// Router for navigation
import { Router } from '@angular/router';

// Dialog reference for closing dialog
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-voice-order',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './voice-order.component.html',
  styleUrls: ['./voice-order.component.scss']
})
export class VoiceOrderComponent implements OnInit, OnDestroy {
  @Output() orderPlaced = new EventEmitter<AIResponse>();
  @Output() cartUpdated = new EventEmitter<CartItem[]>();

  // Voice state
  voiceState: VoiceState = {
    isListening: false,
    isSupported: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isProcessing: false
  };

  // AI Mode toggle (voice vs text)
  aiMode: 'voice' | 'text' = 'voice';
  isTextMode = false;

  // Text input for fallback
  textInput = '';

  // AI Response
  lastResponse: AIResponse | null = null;

  // Cart items
  cartItems: CartItem[] = [];

  // Tax and delivery constants (matching cart/checkout)
  taxRate: number = 0.05;
  deliveryCharge: number = 2.99;

  // Loading state
  isLoading = false;

  // Destroy subject
  private destroy$ = new Subject<void>();

  constructor(
    private voiceService: VoiceService,
    private cartService: CartService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private router: Router,
    private dialogRef: MatDialogRef<VoiceOrderComponent>
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated - redirect to login if not
    if (!this.authService.isAuthenticated()) {
      this.showNotification('Please login to use AI Voice Ordering', 'error');
      this.router.navigate(['/login']);
      return;
    }

    // Reset all voice service states to ensure clean slate for new order
    this.voiceService.resetAllStates();

    // Subscribe to voice state
    this.voiceService.voiceState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.voiceState = state;
        
        // Show error messages
        if (state.error) {
          this.showNotification(state.error, 'error');
          this.voiceService.clearError();
        }
      });

    // Subscribe to order completion - navigate to order page when payment is successful
    this.voiceService.orderCompleted$
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        if (response && response.order) {
          // Stop voice recognition and reset before navigating
          this.voiceService.stopListening();
          this.voiceService.resetTranscript();
          // Close the dialog
          this.dialogRef.close();
          // Navigate to order confirmation page using _id
          this.router.navigate(['/order-confirmation', response.order._id]);
        }
      });

    // Subscribe to cart updates
    this.cartService.cart$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.cartItems = items;
        this.cartUpdated.emit(items);
      });

    // Check support
    if (!this.voiceService.isSupported()) {
      this.isTextMode = true;
      this.aiMode = 'text';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.voiceService.stopListening();
  }

  /**
   * Toggle AI mode (voice/text)
   */
  toggleAIMode(): void {
    this.isTextMode = !this.isTextMode;
    this.aiMode = this.isTextMode ? 'text' : 'voice';
    
    if (this.isTextMode) {
      this.voiceService.stopListening();
    }
  }

  /**
   * Start voice recognition
   */
  startVoiceRecognition(): void {
    if (this.voiceState.isListening || this.voiceState.isProcessing) {
      return;
    }
    this.voiceService.startListening();
  }

  /**
   * Stop voice recognition
   */
  stopVoiceRecognition(): void {
    this.voiceService.stopListening();
  }

  /**
   * Process text input
   */
  processTextInput(): void {
    if (!this.textInput.trim() || this.voiceState.isProcessing) {
      return;
    }

    this.isLoading = true;
    this.voiceService.processVoiceCommand(this.textInput);

    // Subscribe to response
    this.voiceService.voiceState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        if (!state.isProcessing && this.isLoading) {
          this.isLoading = false;
          this.textInput = '';
        }
      });
  }

  /**
   * Reset voice state
   */
  resetVoice(): void {
    this.voiceService.resetTranscript();
    this.lastResponse = null;
  }

  /**
   * Show notification snackbar
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: type === 'error' ? 'snackbar-error' : 'snackbar-success'
    });
  }

  /**
   * Get display transcript
   */
  get displayTranscript(): string {
    if (this.voiceState.interimTranscript) {
      return this.voiceState.transcript + this.voiceState.interimTranscript;
    }
    return this.voiceState.transcript;
  }

  /**
   * Get cart total
   */
  get cartTotal(): number {
    return this.cartItems.reduce((sum, item) => 
      sum + (item.menuItem.price * item.quantity), 0
    );
  }

  /**
   * Get cart item count
   */
  get cartItemCount(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Get tax amount (5% of subtotal)
   */
  getTax(): number {
    return this.cartTotal * this.taxRate;
  }

  /**
   * Get grand total (subtotal + tax + delivery)
   */
  getTotal(): number {
    return this.cartTotal + this.getTax() + this.deliveryCharge;
  }
}
