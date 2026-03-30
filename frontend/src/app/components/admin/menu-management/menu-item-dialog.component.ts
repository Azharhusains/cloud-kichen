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
import { environment } from '../../../../environments/environment';

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
          <!-- Image Upload Section -->
          <div class="image-upload-section">
            <div class="image-preview" *ngIf="imagePreview || data.editingItem?.image">
              <img [src]="imagePreview || getImageUrl(data.editingItem?.image)" crossorigin="anonymous" alt="Menu item image" >
              <button mat-icon-button class="remove-image-btn" (click)="removeImage()" type="button">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="image-placeholder" *ngIf="!imagePreview && !data.editingItem?.image">
              <mat-icon>add_photo_alternate</mat-icon>
              <span>Add Image</span>
            </div>
            <input 
              type="file" 
              #fileInput 
              (change)="onFileSelected($event)" 
              accept="image/*" 
              hidden>
            <button 
              mat-stroked-button 
              color="primary" 
              (click)="fileInput.click()" 
              type="button"
              class="upload-btn">
              <mat-icon>cloud_upload</mat-icon>
              {{ imagePreview || data.editingItem?.image ? 'Change Image' : 'Upload Image' }}
            </button>
          </div>

          <mat-form-field appearance="outline" class="full-width" floatLabel="always">
            <mat-label>Item Name</mat-label>
            <input matInput formControlName="name" placeholder="Enter item name">
            <mat-error *ngIf="menuForm.get('name')?.hasError('required')" class="error-text">
              Name is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width" floatLabel="always">
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

          <mat-form-field appearance="outline" class="full-width" floatLabel="always">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3" placeholder="Enter item description" maxlength="45"></textarea>
            <mat-hint align="end">{{ menuForm.get('description')?.value?.length || 0 }}/45</mat-hint>
            <mat-error *ngIf="menuForm.get('description')?.hasError('required')" class="error-text">
              Description is required
            </mat-error>
            <mat-error *ngIf="menuForm.get('description')?.hasError('maxlength')" class="error-text">
              Description cannot exceed 45 characters
            </mat-error>
          </mat-form-field>

          <!-- Half Portion Toggle -->
          <mat-slide-toggle formControlName="supportsHalf" color="accent" class="half-toggle">
            Enable Half Portions
          </mat-slide-toggle>

          <!-- Price Fields -->
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width" floatLabel="always">
              <mat-label>Full Price (₹)</mat-label>
              <input matInput type="number" formControlName="fullPrice" step="0.01" min="0.01">
              <mat-icon matPrefix>currency_rupee</mat-icon>
              <mat-error *ngIf="menuForm.get('fullPrice')?.hasError('required')" class="error-text">
                Full price is required
              </mat-error>
              <mat-error *ngIf="menuForm.get('fullPrice')?.hasError('min')" class="error-text">
                Full price must be positive
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width" floatLabel="always" *ngIf="menuForm.get('supportsHalf')?.value">
              <mat-label>Half Price (₹)</mat-label>
              <input matInput type="number" formControlName="halfPrice" step="0.01" min="0.01">
              <mat-icon matPrefix>currency_rupee</mat-icon>
              <mat-error *ngIf="menuForm.get('halfPrice')?.hasError('required')" class="error-text">
                Half price is required
              </mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width" floatLabel="always">
            <mat-label>Cost Price (₹)</mat-label>
            <input matInput type="number" formControlName="costPrice" step="0.01" min="0.01">
            <mat-icon matPrefix>currency_rupee</mat-icon>
            <mat-error *ngIf="menuForm.get('costPrice')?.hasError('required')" class="error-text">
              Cost price is required
            </mat-error>
            <mat-error *ngIf="menuForm.get('costPrice')?.hasError('min')" class="error-text">
              Cost price must be positive
            </mat-error>
          </mat-form-field>

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
  styleUrls: ['./menu-item-dialog.component.scss']
})
export class MenuItemDialogComponent implements OnInit {
  menuForm: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<MenuItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MenuItemDialogData
  ) {
    this.menuForm = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      description: ['', [Validators.required, Validators.maxLength(45)]],
      fullPrice: [null, [Validators.required, Validators.min(1)]],
      halfPrice: [null],
      supportsHalf: [false],
      costPrice: [null, [Validators.required, Validators.min(1)]],
      isAvailable: [true]
    });

    // Dynamic validation for halfPrice
    this.menuForm.get('supportsHalf')?.valueChanges.subscribe(supportsHalf => {
      const halfPriceControl = this.menuForm.get('halfPrice');
      if (supportsHalf) {
        halfPriceControl?.setValidators([Validators.required, Validators.min(1)]);
      } else {
        halfPriceControl?.setValidators(null);
        halfPriceControl?.setValue(null);
      }
      halfPriceControl?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    if (this.data.editingItem) {
      this.menuForm.patchValue({
        name: this.data.editingItem.name,
        category: this.data.editingItem.category,
        description: this.data.editingItem.description,
        fullPrice: this.data.editingItem.fullPrice || this.data.editingItem.price,
        halfPrice: this.data.editingItem.halfPrice,
        supportsHalf: this.data.editingItem.supportsHalf || false,
        costPrice: this.data.editingItem.costPrice,
        isAvailable: this.data.editingItem.isAvailable
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  getImageUrl(imagePath: string | null): string {
    if (!imagePath) return '';
    // Handle relative paths
    if (imagePath.startsWith('/uploads/')) {
      const baseUrl = environment.apiUrl.replace('/api', '');
      return `${baseUrl}${imagePath}`;
    }
    return imagePath;
  }

  onSubmit(): void {
    if (this.menuForm.invalid) {
      this.menuForm.markAllAsTouched();
      return;
    }

    const formValue = this.menuForm.value;
    
    if (this.selectedFile) {
      const result = {
        ...formValue,
        imageFile: this.selectedFile
      };
      this.dialogRef.close(result);
    } else {
    if (this.data.editingItem && !this.imagePreview && this.data.editingItem.image) {
      this.dialogRef.close({
        ...formValue,
        image: this.data.editingItem.image
      });
    } else {
        this.dialogRef.close(formValue);
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
