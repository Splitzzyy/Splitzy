import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LoaderComponent } from '../loader/loader.component';
import { SplitzService } from '../services/splitz.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, LoaderComponent],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css'
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  verifyEmailForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showLoader = true;
  loaderText = 'Verifying your email...';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private splitzService: SplitzService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.verifyEmailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    if (this.splitzService.isLoggedIn()) {
      this.splitzService.redirectToDashboard();
    }
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.splitzService.verifyEmail(token).subscribe({
          next: (response) => {
            if (response.code === 'VERIFIED' || response.code === 'ALREADY_VERIFIED') {
              this.showLoader = false;
              this.successMessage = response.message;
              setTimeout(() => {
                this.router.navigate(['/login']);
              }, 2000);
            }
            else {
              this.showLoader = false;
              this.errorMessage = response.message;
            }
          }, error: (error) => {
            this.showLoader = false;
            this.isLoading = false;
            this.errorMessage = error.error;
            console.error('Verifiy Email Failed with error:', error);
            this.router.navigate(['/login']);
          }
        })
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get email() {
    return this.verifyEmailForm.get('email');
  }

  getErrorMessage(field: string): string {
    const control = this.verifyEmailForm.get(field);

    if (control?.hasError('required')) {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }

    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }

    return 'Invalid input';
  }

  onSubmit(): void {
    if (this.verifyEmailForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      this.showLoader = true;
      this.loaderText = 'Sending verification link...';
      const email = this.verifyEmailForm.value.email;
      this.splitzService.resendVerificationEmail(email)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.showLoader = false;
            this.isLoading = false;

            if (response.success) {
              this.successMessage = 'Verification link sent successfully! Please check your email.';
              this.verifyEmailForm.disable();
              setTimeout(() => {
                this.router.navigate(['/login'], {
                  queryParams: { email: email }
                });
              }, 3000);
            } else {
              this.errorMessage = response.message || 'Failed to send verification link. Please try again.';
              this.verifyEmailForm.enable();
            }
          },
          error: (error: any) => {
            this.showLoader = false;
            this.isLoading = false;
            console.error('Verification error:', error);

            if (error.status === 404) {
              this.errorMessage = 'Email not found. Please register first.';
            } else if (error.status === 400) {
              this.errorMessage = 'Invalid email. Please check and try again.';
            } else if (error.status === 500) {
              this.errorMessage = 'Server error. Please try again later.';
            } else {
              this.errorMessage = error.error?.message || 'An error occurred. Please try again.';
            }

            this.verifyEmailForm.enable();
          }
        });
    } else {
      this.verifyEmailForm.markAllAsTouched();
    }
  }
}