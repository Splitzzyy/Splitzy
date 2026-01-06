import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { LoaderComponent } from '../loader/loader.component';
import { SplitzService } from '../splitz.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, LoaderComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showLoader = false;

  constructor(
    private fb: FormBuilder,
    private splitzService: SplitzService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.splitzService.isLoggedIn()) {
      this.splitzService.redirectToDashboard();
    }
  }

  get email() {
    return this.forgotPasswordForm.get('email');
  }

  getErrorMessage(field: string): string {
    const control = this.forgotPasswordForm.get(field);
    if (control?.hasError('required')) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    return '';
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const email = this.forgotPasswordForm.value.email;

      // Call the forgot password API
      this.splitzService.forgotPassword(email).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.success) {
            this.successMessage = 'A password reset link has been sent to your email. Please check your inbox.';
            this.forgotPasswordForm.reset();
            // Optionally redirect to login after a delay
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 3000);
          } else {
            this.errorMessage = response.message || 'Failed to send reset email. Please try again.';
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('Forgot password error:', error);

          if (error.status === 404) {
            this.errorMessage = 'Email not found. Please check and try again.';
          } else if (error.status === 500) {
            this.errorMessage = 'Server error. Please try again later.';
          } else {
            this.errorMessage = 'An error occurred. Please try again.';
          }
        }
      });
    }
  }
}
