import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { KitchenService, Kitchen } from '../../../services/kitchen.service';

@Component({
  selector: 'app-kitchen-create-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './kitchen-create-modal.component.html',
  styleUrls: ['./kitchen-create-modal.component.scss']
})
export class KitchenCreateModalComponent implements OnInit {
  kitchenForm: FormGroup;
  loading = false;
  isEditMode = false;
  statusOptions = ['active', 'inactive', 'maintenance'];

  constructor(
    private fb: FormBuilder,
    private kitchenService: KitchenService,
    public dialogRef: MatDialogRef<KitchenCreateModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data?: { kitchen?: Kitchen }
  ) {
    this.isEditMode = !!data?.kitchen;
    this.kitchenForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: [''],
      zipCode: [''],
      country: ['India'],
      status: ['active', Validators.required]
    });
  }

  ngOnInit() {
    if (this.isEditMode && this.data?.kitchen) {
      const kitchen = this.data.kitchen;
      const primaryLocation = kitchen.locations?.[0] || {};
      this.kitchenForm.patchValue({
        name: kitchen.name,
        street: primaryLocation.street || '',
        city: primaryLocation.city || '',
        state: primaryLocation.state || '',
        zipCode: primaryLocation.zipCode || '',
        country: primaryLocation.country || 'India',
        status: kitchen.status
      });
    }
  }

  saveKitchen(): void {
    if (this.kitchenForm.valid && !this.loading) {
      this.loading = true;
      const formValue = this.kitchenForm.value;
      const kitchenData = {
        name: formValue.name,
        status: formValue.status,
        locations: [{
          street: formValue.street,
          city: formValue.city,
          state: formValue.state,
          zipCode: formValue.zipCode,
          country: formValue.country
        }]
      };

      const request = this.isEditMode 
        ? this.kitchenService.updateKitchen(this.data!.kitchen!._id, kitchenData)
        : this.kitchenService.createKitchen(kitchenData);

      request.subscribe({
        next: (kitchen: Kitchen) => {
          this.loading = false;
          this.dialogRef.close(kitchen);
        },
        error: (error: any) => {
          console.error(this.isEditMode ? 'Error updating kitchen' : 'Error creating kitchen:', error);
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
