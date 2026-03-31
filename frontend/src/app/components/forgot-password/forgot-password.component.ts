import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

// Services
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotForm!: FormGroup;
  resetForm!: FormGroup;
  loading: boolean = false;
  message: string = '';
  success: boolean = false;
  isResetMode: boolean = false;
  token: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || null;
    this.isResetMode = !!this.token;
  }

  passwordMatchValidator = (g: AbstractControl): ValidationErrors | null => {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.forgotForm.valid) {
      this.loading = true;
      this.message = '';

      this.authService.forgotPassword(this.forgotForm.value.email).subscribe({
        next: (response: any) => {
          this.loading = false;
          this.success = true;
          this.message = 'Password reset link sent to your email. Check your inbox.';
          this.toastService.success('Password reset email sent!');
        },
        error: (error: any) => {
          this.loading = false;
          this.message = error.error?.message || 'Failed to send reset email. Please try again.';
          this.toastService.error(this.message);
        }
      });
    }
  }

  onResetSubmit(): void {
    if (this.resetForm.valid && this.token) {
      this.loading = true;
      this.message = '';

      this.authService.resetPassword(this.token, this.resetForm.get('password')!.value).subscribe({
        next: () => {
          this.loading = false;
          this.success = true;
          this.message = 'Password reset successful! Redirecting to login...';
          this.toastService.success('Password reset successful!');
          setTimeout(() => this.router.navigate(['/login']), 1500);
        },
        error: (error: any) => {
          this.loading = false;
          this.message = error.error?.message || 'Password reset failed. Token may be invalid or expired.';
          this.toastService.error(this.message);
        }
      });
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
