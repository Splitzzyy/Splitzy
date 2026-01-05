import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SplitzService } from '../splitz.service';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '../loader/loader.component';
import { LoginRequest, LoginResponse } from '../splitz.model';
import { environment } from '../../environments/environment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';


@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, LoaderComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})
export class LoginPageComponent implements AfterViewInit, OnDestroy {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  showLoader = false;
  googleClientId = environment.googleClientId;
  private destroy$ = new Subject<void>();

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
        this.splitzService.redirectToDashboard();
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
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';
      this.loginForm.disable();

      const loginData: LoginRequest = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };

      this.splitzService.login(loginData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
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
              this.splitzService.redirectToDashboard();
            } else {
              this.showLoader = false;
              this.errorMessage = response.message || 'Login failed. Please try again.';
              this.loginForm.enable();
            }
          },
          error: (error: any) => {
            this.isLoading = false;
            this.showLoader = false;
            this.loginForm.enable();
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
    } else if (!this.isLoading) {
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
  ngAfterViewInit(): void {
    // Initialize Google Sign-In
    this.initializeGoogleSignIn();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  private initializeGoogleSignIn(): void {
    // Declare window.google as any to avoid TypeScript errors
    const google = (window as any).google;

    if (google && google.accounts && google.accounts.id) {
      google.accounts.id.initialize({
        client_id: this.googleClientId,
        callback: (response: any) => this.handleGoogleLogin(response),
        auto_prompt: false
      });
      // Render the button
      const buttonDiv = document.getElementById('g_id_signin');
      if (buttonDiv) {
        google.accounts.id.renderButton(
          buttonDiv,
          {
            theme: 'outline',
            size: 'large',
            width: '100%'
          }
        );
      }
    }
  }
  handleGoogleLogin(response: any): void {
    if (response.credential) {
      // Pass the response to service to handle decoding and navigation
      this.splitzService.handleGoogleSignIn(response);
    } else {
      this.errorMessage = 'Google Sign-In failed. Please try again.';
    }
  }
}
