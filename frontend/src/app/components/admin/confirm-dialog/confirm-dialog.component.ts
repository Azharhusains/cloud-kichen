import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// Angular Material Modules
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="confirm-dialog">
      <div class="dialog-header">
        <div class="warning-icon">
          <mat-icon>warning</mat-icon>
        </div>
        <h2 mat-dialog-title>{{ data.title }}</h2>
      </div>
      
      <mat-dialog-content>
        <p class="dialog-message">{{ data.message }}</p>
        <div class="item-name" *ngIf="data.itemName">
          <strong>{{ data.itemName }}</strong>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button 
          mat-stroked-button 
          (click)="onCancel()" 
          class="cancel-button">
          <mat-icon>close</mat-icon>
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button 
          mat-raised-button 
          color="warn" 
          (click)="onConfirm()" 
          class="delete-button">
          <mat-icon>delete</mat-icon>
          {{ data.confirmText || 'Delete' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      min-width: 380px;
      max-width: 450px;
      animation: scaleIn 0.3s ease forwards;
    }

    .dialog-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 16px;
      padding-bottom: 8px;
    }

    .warning-icon {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
      animation: pulse 2s ease-in-out infinite;
    }

    .warning-icon mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: white;
    }

    h2[mat-dialog-title] {
      margin: 0;
      text-align: center;
      font-size: 22px;
      font-weight: 600;
      color: var(--text-primary, #333);
    }

    mat-dialog-content {
      padding: 16px 24px !important;
    }

    .dialog-message {
      text-align: center;
      font-size: 15px;
      color: var(--text-secondary, #666);
      line-height: 1.6;
      margin: 0 0 16px;
    }

    .item-name {
      text-align: center;
      padding: 12px 16px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      border-radius: 8px;
      border-left: 4px solid #667eea;
      animation: fadeIn 0.3s ease forwards;
    }

    .item-name strong {
      color: #667eea;
      font-size: 16px;
    }

    .dialog-actions {
      padding: 16px 24px 24px !important;
      gap: 12px;
      justify-content: center;
    }

    .cancel-button {
      min-width: 120px;
      border-color: var(--border-color, #e1e5e9);
      color: var(--text-secondary, #666);
      transition: all 0.2s ease;
    }

    .cancel-button:hover {
      background: var(--bg-light, #f5f5f5);
      border-color: #ccc;
      transform: translateY(-2px);
    }

    .delete-button {
      min-width: 120px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      transition: all 0.2s ease;
    }

    .delete-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .delete-button mat-icon,
    .cancel-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 6px;
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
      }
      50% {
        transform: scale(1.05);
        box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4);
      }
    }

    @media (max-width: 480px) {
      .confirm-dialog {
        min-width: auto;
        width: 100%;
      }

      .warning-icon {
        width: 60px;
        height: 60px;
      }

      .warning-icon mat-icon {
        font-size: 30px;
        width: 30px;
        height: 30px;
      }

      h2[mat-dialog-title] {
        font-size: 20px;
      }

      .dialog-actions {
        flex-direction: column-reverse;
      }

      .cancel-button,
      .delete-button {
        width: 100%;
      }
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
