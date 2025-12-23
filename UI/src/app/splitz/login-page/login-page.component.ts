import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SplitzService } from '../splitz.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '../loader/loader.component';
import { LoginRequest, LoginResponse } from '../splitz.model';


@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, LoaderComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})
export class LoginPageComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  showLoader = false;

  constructor(
    private fb: FormBuilder,
    private splitzService: SplitzService

  ) {
    // this.authService.authState.subscribe((user: SocialUser) => {
    //   if (user) {
    //     this.splitzService.setUserId(user.id);
    //   }
    // });
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.splitzService.isLoggedIn()) {
      const userId = this.splitzService.getUserId();
      if (userId) {
        this.splitzService.redirectToDashboard(userId);
      }
    }
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const loginData: LoginRequest = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };

      this.splitzService.login(loginData).subscribe({
        next: (response: LoginResponse) => {
          this.showLoader = true;
          this.isLoading = false;

          if (response.success && response.data.id) {
            // Store user ID in service and session
            this.showLoader = false;
            this.splitzService.setUserId(response.data.id);

            // Store token if provided
            if (response.data.token) {
              this.splitzService.setToken(response.data.token);
            }

            // Redirect to dashboard with userId in URL
            this.splitzService.redirectToDashboard(response.data.id.toString());
          } else {
            this.showLoader = false;
            this.errorMessage = response.message || 'Login failed. Please try again.';
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          this.showLoader = false;
          console.error('Login error:', error);

          if (error.status === 401) {
            this.errorMessage = 'Invalid email or password.';
          } else if (error.status === 500) {
            this.errorMessage = 'Server error. Please try again later.';
          } else {
            this.errorMessage = error.error?.message || 'An error occurred. Please try again.';
          }
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      this.loginForm.markAllAsTouched();
    }
  }

  // Helper method to get error message for form fields
  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);

    if (field?.hasError('required')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }

    if (field?.hasError('email')) {
      return 'Please enter a valid email address';
    }

    if (field?.hasError('minlength')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least 6 characters`;
    }

    return '';
  }
  ssoLogin(): void {
    this.splitzService.ssoLoginRedirect();
    // window.open('https://42761f8c7efd.ngrok-free.app/api/Auth/ssologin', '_self')

  }
}
