import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService, CreateUserRequest } from '../../auth.service';
import { ReportPreloaderService } from '../../services/report-preloader.service';

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
  context?: Array<{ id: string; text: string; short_code?: string }>;
}
interface MapboxResponse { features: MapboxFeature[] }

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css', './auth-shared.css']
})
export class OnboardingComponent implements OnInit {
  mapboxApiKey = 'pk.eyJ1IjoidmFzdXM5IiwiYSI6ImNtZXI3dmI5aTAzbWEybG9wcWdxeGh3cHkifQ.o1hKCj77fSd5GDDvFudIUA';
  isSubmitting = false;
  errorMsg = '';

  email: string = '';
  returnUrl: string = '/letsstart';

  addressSuggestions: MapboxFeature[] = [];
  showAddressSuggestions = false;
  selectedAddress: MapboxFeature | null = null;
  showPassword = false;
  isOAuthFlow = true; // This component is specifically for OAuth users

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private reportPreloader: ReportPreloaderService
  ) {}

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/user-dashboard';
    const otpSignup = this.route.snapshot.queryParamMap.get('otp_signup');
    if (otpSignup && (otpSignup === '1' || otpSignup.toLowerCase() === 'true')) {
      this.isOAuthFlow = false;
    }
    
    // Build form; include password when not OAuth (i.e., OTP signup flow)
    this.form = this.fb.group({
      user_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
      restaurant_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
      address: ['', [Validators.required]],
      password: this.isOAuthFlow ? undefined : ['', [Validators.required, Validators.minLength(6), Validators.maxLength(16)]]
    });
    
    if (!this.email) {
      this.errorMsg = 'Email missing. Please restart login/signup.';
    }
  }

  onAddressInput(value: string): void {
    this.form.get('address')?.setValue(value);
    if (!value || value.trim().length < 3) {
      this.addressSuggestions = [];
      this.showAddressSuggestions = false;
      return;
    }
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${this.mapboxApiKey}&autocomplete=true&limit=5&country=US`;
    this.http.get<MapboxResponse>(url).subscribe({
      next: (resp) => {
        this.addressSuggestions = resp.features || [];
        this.showAddressSuggestions = this.addressSuggestions.length > 0;
      },
      error: () => {
        this.addressSuggestions = [];
        this.showAddressSuggestions = false;
      }
    });
  }

  onAddressInputFocus(): void {
    if (this.addressSuggestions.length > 0 && !this.selectedAddress) {
      this.showAddressSuggestions = true;
    }
  }

  selectAddress(address: MapboxFeature): void {
    this.selectedAddress = address;
    this.form.get('address')?.setValue(address.place_name);
    this.showAddressSuggestions = false;
    this.addressSuggestions = [];
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private extractPostalCode(feature: MapboxFeature): string {
    const ctx = feature.context || [];
    const postcode = ctx.find(c => c.id.startsWith('postcode'))?.text;
    return postcode || '';
  }

  private extractCity(feature: MapboxFeature): string {
    const ctx = feature.context || [];
    const place = ctx.find(c => c.id.startsWith('place'))?.text;
    const locality = ctx.find(c => c.id.startsWith('locality'))?.text;
    return place || locality || '';
  }

  private extractState(feature: MapboxFeature): string {
    const ctx = feature.context || [];
    const region = ctx.find(c => c.id.startsWith('region'))?.text;
    return region || '';
  }

  submit(): void {
    if (!this.email) {
      this.errorMsg = 'Email missing from flow. Please try again.';
      return;
    }
    // Enforce email length cap of 40 characters
    if (this.email && this.email.length > 40) {
      this.errorMsg = 'Email must be at most 40 characters.';
      return;
    }
    if (!this.form.valid || !this.selectedAddress) {
      this.errorMsg = 'Please provide your name, restaurant name, and select a valid address.';
      return;
    }

    this.isSubmitting = true;
    this.errorMsg = '';

    const lat = this.selectedAddress.center[1];
    const lng = this.selectedAddress.center[0];
    const zip = this.extractPostalCode(this.selectedAddress);
    const city = this.extractCity(this.selectedAddress);
    const state = this.extractState(this.selectedAddress);
    const restaurantName = this.form.value.restaurant_name; // Use user-entered restaurant name

    const payload: CreateUserRequest = {
      email: this.email,
      user_name: this.form.value.user_name,
      password: this.isOAuthFlow ? '' : (this.form.value.password || ''),
      locations: [
        {
          zip_or_postal_code: zip,
          latitude: String(lat),
          longitude: String(lng),
          location: this.selectedAddress.place_name,
          restaurant_name: restaurantName,
          city,
          state,
          distance_from_zip_code: zip ? '0' : undefined,
        }
      ]
    };

    this.authService.createUser(payload).subscribe({
      next: (resp) => {
        // Persist minimal auth state to satisfy guards
        this.authService.storeUserEmail(this.email);
        if (!this.authService.getAuthToken()) {
          this.authService.storeAuthToken('oauth_authenticated');
        }
        // Optionally store user data if available
        try {
          const id = resp?.user_id ?? (resp as any)?.id;
          const name = resp?.user_name ?? (resp as any)?.name ?? '';
          if (id && this.email) {
            this.authService.storeUserData({ id, email: this.email, name });
          }
        } catch {}

        // Trigger report preloading in background
        this.reportPreloader.preloadReports(this.email);
        
        // Navigate to Let's Start
        this.isSubmitting = false;
        this.errorMsg = '';
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMsg = err?.error?.detail || 'Registration failed. Please try again.';
      }
    });
    }
  }