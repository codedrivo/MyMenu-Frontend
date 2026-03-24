import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { IdleTimerService } from '../services/idle-timer.service';
import { ReportPreloaderService } from '../services/report-preloader.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  myForm!: FormGroup;
  errorMessage: string = '';
  showPassword = false;
  mode: 'password' | 'otp-login' | 'otp-register' = 'password';
  isOtpSent = false;
  otpMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private idleTimerService: IdleTimerService,
    private reportPreloader: ReportPreloaderService
  ) {
    this.myForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      otp: ['']
    });
  }

  onSubmit() {
    this.errorMessage = '';
    
    if (this.myForm.valid) {
      const email = this.myForm.get('username')?.value;
      const password = this.myForm.get('password')?.value;

      this.authService.loginWithEmailPassword({ email, password }).subscribe({
        next: (response) => {
          // console.log('Login successful:', response);
          this.idleTimerService.startWatching();
          
          // Trigger report preloading in background
          this.reportPreloader.preloadReports(email);
          
          // Wait a moment to ensure localStorage operations complete
          setTimeout(() => {
            // console.log('🔍 Pre-navigation auth check:', this.authService.isLoggedIn());
            this.router.navigate(['/user-dashboard']);
          }, 100);
        },
        error: (error) => {
          console.error('Login failed:', error);
          if (error.status === 404) {
            this.errorMessage = 'User not found. Please check your email.';
          } else if (error.status === 401) {
            this.errorMessage = 'Invalid password. Please try again.';
          } else if (error.status === 422) {
            this.errorMessage = 'Please enter valid email and password.';
          } else {
            this.errorMessage = 'Login failed. Please try again.';
          }
        }
      });
    } else {
      this.errorMessage = 'Please enter a valid email and password.';
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  switchMode(newMode: 'password' | 'otp-login' | 'otp-register'): void {
    this.mode = newMode;
    this.errorMessage = '';
    this.otpMessage = '';
    this.isOtpSent = false;

    // Adjust validators based on mode
    const passwordCtrl = this.myForm.get('password');
    const otpCtrl = this.myForm.get('otp');
    if (!passwordCtrl || !otpCtrl) return;

    if (newMode === 'password') {
      passwordCtrl.setValidators([Validators.required, Validators.minLength(6)]);
      otpCtrl.clearValidators();
    } else {
      passwordCtrl.clearValidators();
      // OTP must be exactly 6 numeric digits
      otpCtrl.setValidators([Validators.required, Validators.maxLength(6), Validators.pattern(/^\d{6}$/)]);
    }
    passwordCtrl.updateValueAndValidity();
    otpCtrl.updateValueAndValidity();
  }

  sendLoginOtp(): void {
    this.errorMessage = '';
    this.otpMessage = '';
    const email = this.myForm.get('username')?.value;
    if (!email || this.myForm.get('username')?.invalid) {
      this.errorMessage = 'Please enter a valid email.';
      return;
    }

    this.authService.fetchRegisteredUserEmailsV2().subscribe((emails) => {
      const normalized = emails.map(e => String(e).toLowerCase());
      const isRegistered = normalized.includes(String(email).toLowerCase());
      if (!isRegistered) {
        this.errorMessage = 'Email is not registered. Please sign up first.';
        return;
      }
    this.authService.sendLoginOtpV2(email).subscribe({
      next: (resp) => {
        this.isOtpSent = true;
        this.otpMessage = resp?.message || 'Code sent. Please check your email.';
      },
      error: (err) => {
        if (err?.status === 404) {
          this.errorMessage = 'Email is not registered. Please sign up first.';
        } else {
          this.errorMessage = err?.error?.detail || 'Failed to send login code.';
        }
      }
    });
    });
  }

  verifyLoginOtp(): void {
    this.errorMessage = '';
    const email = this.myForm.get('username')?.value;
    const otp = this.myForm.get('otp')?.value;
    if (!email || !otp) {
      this.errorMessage = 'Please enter email and code.';
      return;
    }
    // Enforce numeric 6-digit code before sending
    const sanitizedOtp = String(otp).replace(/\D/g, '').slice(0, 6);
    this.authService.verifyOtpV2(email, otp, true).subscribe({
      next: (res) => {
        console.log('Login successful:', res);
        this.authService.checkUserStatus(email).subscribe({
        next: (res: { id: number; email: string; name: string }) => {
          this.authService.storeUserData(res);
        },     
      });
        // Start idle timer and preload reports
        this.authService.storeUserEmail(email);
        // Fallback token to satisfy client-side guards for cookie-based sessions
        this.authService.storeAuthToken('otp_authenticated');
        this.idleTimerService.startWatching();
        this.reportPreloader.preloadReports(email);
        setTimeout(() => {
          this.router.navigate(['/user-dashboard']);
        }, 100);
      },
      error: (err) => {
        const detail = err?.error?.detail || err?.error?.message;
        this.errorMessage = detail || 'Invalid or expired code.';
      }
    });
  }

  sendRegistrationOtp(): void {
    this.errorMessage = '';
    this.otpMessage = '';
    const email = this.myForm.get('username')?.value;
    if (!email || this.myForm.get('username')?.invalid) {
      this.errorMessage = 'Please enter a valid email.';
      return;
    }

    this.authService.fetchRegisteredUserEmailsV2().subscribe((emails) => {
      const normalized = emails.map(e => String(e).toLowerCase());
      const isRegistered = normalized.includes(String(email).toLowerCase());
      if (isRegistered) {
        this.errorMessage = 'Email is already registered. Please log in.';
        return;
      }
      this.authService.sendRegisterOtpV2(email).subscribe({
        next: (resp) => {
          this.isOtpSent = true;
          this.otpMessage = resp?.message || 'Code sent. Please check your email.';
        },
        error: (err) => {
          const detail = err?.error?.detail || err?.message;
          this.errorMessage = detail || 'Failed to send registration code.';
        }
      });
    });
  }

  verifyRegistrationOtp(): void {
    this.errorMessage = '';
    const email = this.myForm.get('username')?.value;
    const otp = this.myForm.get('otp')?.value;
    if (!email || !otp) {
      this.errorMessage = 'Please enter email and code.';
      return;
    }
    // Enforce numeric 6-digit code before sending
    const sanitizedOtp = String(otp).replace(/\D/g, '').slice(0, 6);
    this.authService.verifyOtpV2(email, sanitizedOtp, false).subscribe({
      next: () => {
        // Proceed to onboarding with email and indicate OTP signup
        const returnUrl = '/user-dashboard';
        this.router.navigateByUrl(`/auth/onboarding?email=${encodeURIComponent(email)}&returnUrl=${encodeURIComponent(returnUrl)}&otp_signup=1`);
      },
      error: (err) => {
        const detail = err?.error?.detail || err?.error?.message;
        this.errorMessage = detail || 'Invalid or expired code.';
      }
    });
  }

  // Restrict OTP input to numbers only and max length of 6
  onOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 6);
    const ctrl = this.myForm.get('otp');
    ctrl?.setValue(digitsOnly, { emitEvent: false });
  }

  continueWithGoogle(): void {
    const frontendCallbackBase = `${window.location.origin}/auth/callback`;
    const targetReturnUrl = '/user-dashboard';
    const callbackUrl = `${frontendCallbackBase}?returnUrl=${encodeURIComponent(targetReturnUrl)}`;

    // Persist return URL for callback component fallback
    try {
      localStorage.setItem('oauth_return_url', targetReturnUrl);
    } catch {}

    const oauthUrl = `${AppEnv.API_BASE_URL}/login/google?redirect_to=${encodeURIComponent(callbackUrl)}&prompt=select_account`;
    // Redirect to backend OAuth; backend will handle Google flow and callback
    window.location.href = oauthUrl;
  }

  continueWithMicrosoft(): void {
    // Persist a sensible return URL for after success
    const targetReturnUrl = '/user-dashboard';
    try {
      localStorage.setItem('oauth_return_url', targetReturnUrl);
    } catch {}

    // Initiate Microsoft OAuth on the backend; backend will handle redirect to Microsoft
    // and later redirect back to the frontend at /auth/success or /auth/failure
    const oauthUrl = `${AppEnv.API_BASE_URL}/login/microsoft`;
    window.location.href = oauthUrl;
  }
}
import { AppEnv } from '../config/env';