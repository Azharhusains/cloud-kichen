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

export interface MenuItemDialogData {
  editingItem?: any;
  categories: { name: string; displayName: string }[];
}

@Component({
  selector: 'app-menu-item-dialog',
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
    <div class="menu-item-dialog">
      <h2 mat-dialog-title>
        {{ data.editingItem ? 'Edit Menu Item' : 'Add New Menu Item' }}
      </h2>
      
      <mat-dialog-content>
        <form [formGroup]="menuForm" class="menu-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Item Name</mat-label>
            <input matInput formControlName="name" placeholder="Enter item name">
            <mat-error *ngIf="menuForm.get('name')?.hasError('required')" class="error-text">
              Name is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Category</mat-label>
            <mat-select formControlName="category">
              <mat-option *ngFor="let category of data.categories" [value]="category.name">
                {{ category.displayName }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="menuForm.get('category')?.hasError('required')" class="error-text">
              Category is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3" placeholder="Enter item description"></textarea>
            <mat-error *ngIf="menuForm.get('description')?.hasError('required')" class="error-text">
              Description is required
            </mat-error>
          </mat-form-field>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Price (₹)</mat-label>
              <input matInput type="number" formControlName="price" step="0.01" min="0.01">
              <mat-icon matPrefix>attach_money</mat-icon>
              <mat-error *ngIf="menuForm.get('price')?.hasError('required')" class="error-text">
                Price is required
              </mat-error>
              <mat-error *ngIf="menuForm.get('price')?.hasError('min')" class="error-text">
                Price must be positive
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Cost Price (₹)</mat-label>
              <input matInput type="number" formControlName="costPrice" step="0.01" min="0.01">
              <mat-icon matPrefix>money</mat-icon>
              <mat-error *ngIf="menuForm.get('costPrice')?.hasError('required')" class="error-text">
                Cost price is required
              </mat-error>
              <mat-error *ngIf="menuForm.get('costPrice')?.hasError('min')" class="error-text">
                Cost price must be positive
              </mat-error>
            </mat-form-field>
          </div>

          <mat-slide-toggle formControlName="isAvailable" color="primary">
            Available
          </mat-slide-toggle>
        </form>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!menuForm.valid">
          <mat-icon>{{ data.editingItem ? 'save' : 'add' }}</mat-icon>
          {{ data.editingItem ? 'Update' : 'Save' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .menu-item-dialog {
      min-width: 500px;
      
      ::ng-deep .mat-mdc-dialog-content {
        max-height: 60vh;
      }
    }

    .menu-form {
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
      .menu-item-dialog {
        min-width: auto;
      }
      
      .menu-form .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MenuItemDialogComponent implements OnInit {
  menuForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<MenuItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MenuItemDialogData
  ) {
    this.menuForm = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      description: ['', Validators.required],
      price: [null, [Validators.required, Validators.min(0.01)]],
      costPrice: [null, [Validators.required, Validators.min(0.01)]],
      isAvailable: [true]
    });
  }

  ngOnInit(): void {
    if (this.data.editingItem) {
      this.menuForm.patchValue(this.data.editingItem);
    }
  }

  onSubmit(): void {
    if (this.menuForm.invalid) {
      this.menuForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.menuForm.value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
