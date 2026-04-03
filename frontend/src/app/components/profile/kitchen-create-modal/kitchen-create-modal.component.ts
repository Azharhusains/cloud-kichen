import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Kitchen {
  _id: string;
  name: string;
  ownerId: {
    _id: string;
    name: string;
    email: string;
  };
  locations: any[];
  status: string;
}

interface KitchenFormData {
  name: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

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
    MatProgressSpinnerModule
  ],
  templateUrl: './kitchen-create-modal.component.html',
  styleUrls: ['./kitchen-create-modal.component.scss']
})
export class KitchenCreateModalComponent {
  kitchenForm: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public dialogRef: MatDialogRef<KitchenCreateModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data?: { kitchen?: Kitchen }
  ) {
    this.kitchenForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: [''],
      zipCode: [''],
      country: ['India']
    });
  }

  createKitchen(): void {
    if (this.kitchenForm.valid && !this.loading) {
      this.loading = true;
      const formValue: KitchenFormData = this.kitchenForm.value;
      const kitchenData = {
        name: formValue.name,
        locations: [{
          street: formValue.street,
          city: formValue.city,
          state: formValue.state,
          zipCode: formValue.zipCode,
          country: formValue.country
        }]
      };

      this.http.post<Kitchen>(`${environment.apiUrl}/kitchens`, kitchenData).subscribe({
        next: (newKitchen: Kitchen) => {
          this.loading = false;
          this.dialogRef.close(newKitchen);
        },
        error: (error: any) => {
          console.error('Error creating kitchen:', error);
          this.loading = false;
          // TODO: Show toast error
        }
      });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

