import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

export interface CancelOrderDialogData {
  orderNumber: number;
  title?: string;
  message?: string;
  userType?: 'admin' | 'customer';
}

// Admin cancellation reasons (more detailed, for internal use)
const adminCancellationReasons: string[] = [
  'Customer requested cancellation',
  'Unable to fulfill order - item unavailable',
  'Kitchen closed / not accepting orders',
  'Order cannot be delivered to address',
  'Other reason'
];

// Customer cancellation reasons (user-friendly)
const customerCancellationReasons: string[] = [
  'Changed my mind',
  'Ordered by mistake',
  'Want to reorder later',
  'Found a better deal elsewhere',
  'Other reason'
];

@Component({
  selector: 'app-cancel-order-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule
  ],
  template: `
    <div class="cancel-dialog">
      <div class="dialog-header">
        <div class="warning-icon">
          <mat-icon>cancel</mat-icon>
        </div>
        <h2 mat-dialog-title>{{ data.title || 'Cancel Order' }}</h2>
      </div>
      
      <mat-dialog-content>
        <p class="dialog-message">{{ getMessage() }}</p>
        <div class="order-info">
          <strong>Order #{{ data.orderNumber }}</strong>
        </div>
        
        <div class="reason-selection">
          <label class="reason-label">Select Cancellation Reason</label>
          <mat-radio-group [(ngModel)]="reason" class="reason-radio-group">
            <mat-radio-button *ngFor="let r of getReasons()" [value]="r" class="reason-item">
              {{ r }}
            </mat-radio-button>
          </mat-radio-group>
          <mat-hint class="reason-hint">{{ getHint() }}</mat-hint>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button 
          mat-stroked-button 
          (click)="onCancel()" 
          class="cancel-button">
          <mat-icon>close</mat-icon>
          Keep Order
        </button>
        <button 
          mat-raised-button 
          (click)="onConfirm()" 
          class="confirm-button"
          [disabled]="!reason || reason.trim() === ''">
          <mat-icon>cancel</mat-icon>
          Cancel Order
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .cancel-dialog {
      min-width: 380px;
      // max-width: 420px;
      text-align: center;
    }

    .dialog-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 12px;
      padding-bottom: 4px;
    }

    .warning-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 6px;
      box-shadow: 0 4px 20px rgba(220, 53, 69, 0.3);
    }

    .warning-icon mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      color: white;
    }

    h2[mat-dialog-title] {
      margin: 0;
      display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
      text-align: center;
      font-size: 17px;
      font-weight: 600;
      color: #333;
      width: 100%;
    }

    mat-dialog-content {
      padding: 6px 14px !important;
      text-align: center;
    }

     ::ng-deep .mat-mdc-form-field-flex {
    padding: 0 16px !important;
  }

    .dialog-message {
      text-align: center;
      font-size: 12px;
      color: #666;
      line-height: 1.4;
      margin: 0 0 6px;
    }

    .order-info {
      display: inline-block;
      text-align: center;
      padding: 4px 8px;
      background: linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(200, 35, 51, 0.1) 100%);
      border-radius: 4px;
      border-left: 3px solid #dc3545;
      margin-bottom: 8px;
    }

    .order-info strong {
      color: #dc3545;
      font-size: 13px;
    }

    .reason-selection {
      width: 100%;
      text-align: left;
      margin-top: 4px;
    }

    .reason-label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: #333;
      margin-bottom: 6px;
    }

    .reason-radio-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .reason-item {
      padding: 0px 10px;
      border-radius: 4px;
      border: 1px solid #e1e5e9;
      background: #fafbfc;
      transition: all 0.2s ease;
    }

    .reason-item:hover {
      background: #f0f4f8;
      border-color: #dc3545;
    }

    .reason-item.mat-mdc-radio-checked {
      background: rgba(220, 53, 69, 0.08);
      border-color: #dc3545;
    }

    .reason-hint {
      display: block;
      margin-top: 6px;
      font-size: 10px;
      color: #888;
    }

    .dialog-actions {
      padding: 6px 14px 14px !important;
      gap: 6px;
      justify-content: center;
    }

    .cancel-button {
      min-width: 110px;
      border-color: #e1e5e9;
      color: #666;
    }

    .confirm-button {
      min-width: 130px;
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important;
      color: white !important;
    }

    .confirm-button:disabled {
      background: #e0e0e0 !important;
      color: #999 !important;
    }

    .confirm-button mat-icon,
    .cancel-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 6px;
    }

    ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface {
      overflow: unset !important;
    }

    @media (max-width: 480px) {
      .cancel-dialog {
        min-width: auto;
        width: 100%;
      }
    }
  `]
})
export class CancelOrderDialogComponent {
  reason: string = '';
  
  // Default fallback reasons
  private defaultReasons: string[] = [
    'Customer requested cancellation',
    'Unable to fulfill order - item unavailable',
    'Kitchen closed / not accepting orders',
    'Payment issue / payment failed',
    'Other reason'
  ];

  constructor(
    public dialogRef: MatDialogRef<CancelOrderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CancelOrderDialogData
  ) {}

  /**
   * Get the appropriate cancellation reasons based on user type
   */
  getReasons(): string[] {
    if (this.data.userType === 'admin') {
      return adminCancellationReasons;
    } else if (this.data.userType === 'customer') {
      return customerCancellationReasons;
    }
    return this.defaultReasons;
  }

  /**
   * Get the appropriate hint message based on user type
   */
  getHint(): string {
    if (this.data.userType === 'admin') {
      return 'This reason will be visible to the customer';
    } else if (this.data.userType === 'customer') {
      return 'Please let us know why you are cancelling';
    }
    return 'This reason will be visible to the customer';
  }

  /**
   * Get the appropriate default message based on user type
   */
  getMessage(): string {
    if (this.data.message) {
      return this.data.message;
    }
    if (this.data.userType === 'admin') {
      return 'Are you sure you want to cancel this order? Please provide a reason.';
    }
    return 'Are you sure you want to cancel your order? Please provide a reason.';
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onConfirm(): void {
    if (this.reason && this.reason.trim() !== '') {
      this.dialogRef.close(this.reason.trim());
    }
  }
}
