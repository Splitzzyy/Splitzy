import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';

import { LoaderComponent } from '../loader/loader.component';
import { SplitzService } from '../splitz.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-setup-password',
  standalone: true,
  imports: [ReactiveFormsModule, LoaderComponent],
  templateUrl: './setup-password.component.html',
  styleUrl: './setup-password.component.css'
})
export class SetupPasswordComponent implements OnInit {
  setupPasswordForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showLoader = false;
  showPassword = false;
  showConfirmPassword = false;
  resetToken = '';

  constructor(
    private fb: FormBuilder,
    private splitzService: SplitzService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.setupPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.splitzService.isLoggedIn()) {
      this.splitzService.redirectToDashboard();
    }

    // Get reset token from URL
    this.route.queryParams.subscribe(params => {
      this.resetToken = params['token'];
      if (!this.resetToken) {
        this.errorMessage = 'Invalid reset link. Please request a new one.';
      }
    });
  }

  get newPassword() {
    return this.setupPasswordForm.get('newPassword');
  }

  get confirmPassword() {
    return this.setupPasswordForm.get('confirmPassword');
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (!newPassword || !confirmPassword) {
      return null;
    }

    return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  getErrorMessage(field: string): string {
    const control = this.setupPasswordForm.get(field);
    if (control?.hasError('required')) {
      return `${field === 'newPassword' ? 'New password' : 'Confirm password'} is required`;
    }
    if (control?.hasError('minlength')) {
      return 'Password must be at least 6 characters long';
    }
    if (this.setupPasswordForm.hasError('passwordMismatch') && field === 'confirmPassword') {
      return 'Passwords do not match';
    }
    return '';
  }

  onSubmit(): void {
    if (this.setupPasswordForm.valid && this.resetToken) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const resetPasswordData = {
        token: this.resetToken,
        newPassword: this.setupPasswordForm.value.newPassword
      };

      // Call the setup password API
      this.splitzService.setupPassword(resetPasswordData).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.success) {
            this.successMessage = 'Password has been reset successfully. Redirecting to login...';
            this.setupPasswordForm.reset();
            // Redirect to login after a delay
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          } else {
            this.errorMessage = response.message || 'Failed to reset password. Please try again.';
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('Setup password error:', error);

          if (error.status === 400) {
            this.errorMessage = 'Invalid or expired reset link. Please request a new one.';
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
