import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Angular Material Modules
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

export interface InventoryDialogData {
  editingItem?: {
    itemName: string;
    quantity: number;
    unit: string;
    minStockLevel?: number;
    isActive?: boolean;
  };
}

@Component({
  selector: 'app-inventory-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="inventory-dialog">
      <h2 mat-dialog-title>
        {{ data.editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item' }}
      </h2>
      
      <mat-dialog-content>
        <form [formGroup]="inventoryForm" class="inventory-form">
          <mat-form-field appearance="outline" class="full-width" floatLabel="always">
            <mat-label>Item Name</mat-label>
            <input matInput formControlName="itemName" placeholder="Enter item name">
            <mat-icon matPrefix>inventory_2</mat-icon>
            <mat-error *ngIf="inventoryForm.get('itemName')?.hasError('required')" class="error-text">
              Item name is required
            </mat-error>
          </mat-form-field>

          <div class="form-row">
            <mat-form-field appearance="outline" floatLabel="always">
              <mat-label>Quantity</mat-label>
              <input matInput type="number" formControlName="quantity" min="0" step="0.1">
              <mat-icon matPrefix>scale</mat-icon>
              <mat-error *ngIf="inventoryForm.get('quantity')?.hasError('required')" class="error-text">
                Quantity is required
              </mat-error>
              <mat-error *ngIf="inventoryForm.get('quantity')?.hasError('min')" class="error-text">
                Quantity must be positive
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" floatLabel="always">
              <mat-label>Unit</mat-label>
              <mat-select formControlName="unit">
                <mat-option value="kg">Kilograms (kg)</mat-option>
                <mat-option value="g">Grams (g)</mat-option>
                <mat-option value="L">Liters (L)</mat-option>
                <mat-option value="ml">Milliliters (ml)</mat-option>
                <mat-option value="pcs">Pieces (pcs)</mat-option>
              </mat-select>
              <mat-error *ngIf="inventoryForm.get('unit')?.hasError('required')" class="error-text">
                Unit is required
              </mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width" floatLabel="always">
            <mat-label>Minimum Stock Level</mat-label>
            <input matInput type="number" formControlName="minStockLevel" min="0" step="0.1">
            <mat-icon matPrefix>warning</mat-icon>
            <mat-hint>Alert when stock falls below this level</mat-hint>
          </mat-form-field>

          <mat-slide-toggle formControlName="isActive" color="primary">
            Active
          </mat-slide-toggle>
        </form>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!inventoryForm.valid">
          <mat-icon>{{ data.editingItem ? 'save' : 'add' }}</mat-icon>
          {{ data.editingItem ? 'Update' : 'Save' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .inventory-dialog {
      min-width: 450px;
      
      ::ng-deep .mat-mdc-dialog-content {
        max-height: 60vh;
      }
    }

    .inventory-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 16px;

      .full-width {
        width: 100%;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;

        mat-form-field {
          width: 100%;
        }
      }

      mat-slide-toggle {
        margin-top: 8px;
      }
    }

    ::ng-deep .error-text {
      color: #f44336 !important;
    }

    @media (max-width: 600px) {
      .inventory-dialog {
        min-width: auto;
      }
      
      .inventory-form .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class InventoryDialogComponent implements OnInit {
  inventoryForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<InventoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InventoryDialogData
  ) {
    this.inventoryForm = this.fb.group({
      itemName: ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(0.01)]],
      unit: ['kg', Validators.required],
      minStockLevel: [null, [Validators.required, Validators.min(0.01)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    if (this.data.editingItem) {
      this.inventoryForm.patchValue({
        itemName: this.data.editingItem.itemName,
        quantity: this.data.editingItem.quantity,
        unit: this.data.editingItem.unit,
        minStockLevel: this.data.editingItem.minStockLevel || 10,
        isActive: this.data.editingItem.isActive !== false
      });
    }
  }

  onSubmit(): void {
    if (this.inventoryForm.invalid) {
      this.inventoryForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.inventoryForm.value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
