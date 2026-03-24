import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

export interface DialogData {
  user: any;
  currentRole: string;
}

@Component({
  selector: 'app-role-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule, MatCardModule],
  template: `
    <mat-card class="role-dialog-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon color="primary">admin_panel_settings</mat-icon>
          Update Role
        </mat-card-title>
        <mat-card-subtitle>{{ data.user.name }} ({{ data.user.email }})</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <div class="current-role">
          <strong>Current Role:</strong>
          <span class="role-chip" [ngClass]="'role-' + data.currentRole.toLowerCase()">{{ data.currentRole }}</span>
        </div>

        <mat-form-field appearance="outline" class="role-select">
          <mat-label>New Role</mat-label>
          <mat-select [(ngModel)]="selectedRole" name="role">
            <mat-option value="CUSTOMER">Customer</mat-option>
            <mat-option value="ADMIN">Admin</mat-option>
            <mat-option value="SUPER_ADMIN" [disabled]="isSuperAdminDisabled()">
              Super Admin
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div *ngIf="selectedRole !== data.currentRole" class="warning">
          <mat-icon>warning</mat-icon>
          <span>This will change the user's permissions</span>
        </div>
      </mat-card-content>

      <mat-card-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" 
                [disabled]="selectedRole === data.currentRole || !selectedRole"
                (click)="onConfirm()">
          Update Role
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .role-dialog-card {
      max-width: 450px;
      min-width: 400px;
    }

    .current-role {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .role-select {
      width: 100%;
      
      .hint {
        font-size: 12px;
        color: #666;
        margin-left: 8px;
      }
    }

    .warning {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ff9800;
      font-size: 14px;
      margin-top: 8px;
    }
  `]
})
export class RoleDialogComponent {
  selectedRole = '';

  constructor(
    public dialogRef: MatDialogRef<RoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.selectedRole = this.data.currentRole;
  }

  getColor(role: string): 'primary' | 'accent' | 'warn' {
    switch (role) {
      case 'CUSTOMER': return 'primary';
      case 'ADMIN': return 'accent';
      case 'SUPER_ADMIN': return 'warn';
      default: return 'primary';
    }
  }

  isSuperAdminDisabled(): boolean {
    // Only allow Super Admin role if current user is SUPER_ADMIN
    // This is client-side, backend validates
    return true; // Placeholder - use authService.isSuperAdmin() in real app
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    const roleInfo = this.getRoleLabel(this.selectedRole);
    this.dialogRef.close({ role: this.selectedRole, label: roleInfo.label });
  }

  private getRoleLabel(role: string): { label: string } {
    const labels: Record<string, { label: string }> = {
      'CUSTOMER': { label: 'Customer' },
      'ADMIN': { label: 'Admin' },
      'SUPER_ADMIN': { label: 'Super Admin' }
    };
    return labels[role as keyof typeof labels] || { label: role };
  }
}
