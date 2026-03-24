import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, AbstractControl, FormControl } from '@angular/forms';
import { RoleService, IRegistrationData } from '../../../../role.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError, Observable } from 'rxjs';
import { AppEnv } from '../../../../config/env';

interface ErrorMessages {
  [key: string]: {
    [key: string]: string;
  };
}

interface SectionControls {
  [key: string]: string[];
}

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[]; // Add this property
  text: string; // Add this property
  properties: {
    address?: string;
  };
  context?: Array<{
    id: string;
    text: string;
  }>;
}

interface MapboxResponse {
  features: MapboxFeature[];
}

@Component({
  selector: 'app-formtwo',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './formtwo.component.html'
})
export class FormtwoComponent implements OnInit, OnDestroy {
  myForm!: FormGroup;
  emailExists: boolean = false;
  currentSection: string = 'basic';
  formSubmitAttempted: boolean = false;
  otpSent: boolean = false;
  emailVerified: boolean = false;
  apiKey = 'dapif4fb3a4ddc6bc98fe20910fb3ba74c03-3';
  errorMessage: string = '';
  isOtpSuccess: boolean = false;
  otpControls: FormControl[] = Array(6).fill(null).map(() => new FormControl('', [Validators.required, Validators.pattern('[0-9]')]));

  private readonly backendBase = AppEnv.API_BASE_URL;

  
  // Timer properties for resend restriction
  resendTimer: number = 0;
  canResend: boolean = true;
  private timerInterval: any;
  
  // Mapbox integration properties
  mapboxApiKey = 'pk.eyJ1IjoidmFzdXM5IiwiYSI6ImNtZXI3dmI5aTAzbWEybG9wcWdxeGh3cHkifQ.o1hKCj77fSd5GDDvFudIUA';
  addressSuggestions: MapboxFeature[] = [];
  showAddressSuggestions: boolean = false;
  selectedAddress: MapboxFeature | null = null;
  isLoadingAddresses: boolean = false;
  addressSearching: boolean = false;

  restaurantTypes = ['QSR', 'Fine Dining', 'Casual Dining'];
  cuisineTypes = ['American', 'Mexican', 'Italian', 'Thai', 'Asian', 'Chinese'];
  revenueRanges = ['<1 Million', '1 to 5 Million', '5 to 10 Million', '>10 Million'];
  qualityRatings = ['*', '**', '***', '****', '*****'];
  yesNoOptions = ['Yes', 'No'];

  changeEmailMode: boolean = false;

  errorMessages: ErrorMessages = {
    restaurantname: { required: 'Restaurant name is required', maxlength: 'Restaurant name cannot exceed 100 characters' },
    addressLine1: { required: 'Address is required', maxlength: 'Address cannot exceed 200 characters' },
    address: { required: 'Address is required', maxlength: 'Address cannot exceed 200 characters' }, // Add this line
    name: { required: 'Contact name is required', maxlength: 'Contact name cannot exceed 50 characters' },
    email: { required: 'Email address is required', email: 'Please enter a valid email address', emailExists: 'This email is already registered' },
    phonenumber: { invalidPhone: 'Please enter a valid 10-digit phone number' },
    checkbox: { required: 'You must accept the terms and conditions' }
  };

  private sectionControls: SectionControls = {
    basic: ['restaurantname', 'restaurantType', 'cuisineType', 'quality'],
    location: ['addressLine1'],
    business: ['revenue', 'seating', 'deliveryTakeaway', 'liquorLicense'],
    contact: ['name', 'phonenumber']
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private roleService: RoleService,
    private http: HttpClient
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    // console.log('Initializing component...');
    this.setupEmailValidation();
    this.setupAddressAutocomplete();
  }

  private initializeForm() {
    this.myForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      otp: this.fb.group(this.otpControls.reduce((acc, control, idx) => ({ ...acc, [`otp${idx}`]: control }), {})),
      restaurantname: ['', [Validators.required, Validators.maxLength(100)]],
      restaurantType: [''],
      cuisineType: [[]],
      otherCuisine: [''],
      quality: [''],
      addressLine1: ['', [Validators.required, Validators.maxLength(200)]],
      address: ['', [Validators.required, Validators.maxLength(200)]], // Add this line
      distance: [25],
      revenue: [''],
      seating: [''],
      deliveryTakeaway: [''],
      liquorLicense: [''],
      name: ['', [Validators.required, Validators.maxLength(50)]],
      phonenumber: ['', this.phoneNumberValidator],
      checkbox: [false, Validators.requiredTrue]
    });
    this.disableFormExceptEmail();
  }

  private setupEmailValidation() {
    this.myForm.get('email')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((email: string) => {
        if (email && email.includes('@') && email.length > email.indexOf('@') + 1) {
          // Start checking after '@' symbol when user types more characters
          return this.checkEmailInRealTime(email);
        }
        return of(null);
      })
    ).subscribe({
      next: (isRegistered) => {
        if (isRegistered !== null) {
          this.emailExists = isRegistered;
          if (isRegistered) {
            this.errorMessage = 'This email is already registered. kindly login.';
            this.myForm.get('email')?.setErrors({ emailExists: true });
          } else {
            this.errorMessage = '';
            this.myForm.get('email')?.setErrors(null);
          }
        }
      }
    });
  }

  phoneNumberValidator = (control: AbstractControl) => {
    const phoneNumber = control.value;
    if (!phoneNumber) {
      return null; // Allow empty phone numbers
    }
    
    // Remove all non-digit characters
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid 10-digit US phone number
    if (cleanedNumber.length === 10 && /^[0-9]{10}$/.test(cleanedNumber)) {
      return null; // Valid
    }
    
    return { invalidPhone: true }; // Invalid
  };

  private setupAddressAutocomplete() {
    this.myForm.get('address')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query && query.length >= 3) {
          this.isLoadingAddresses = true;
          return this.searchAddresses(query);
        } else {
          this.addressSuggestions = [];
          this.showAddressSuggestions = false;
          this.isLoadingAddresses = false;
          return of([]);
        }
      })
    ).subscribe({
      next: (suggestions) => {
        this.addressSuggestions = suggestions;
        this.showAddressSuggestions = suggestions.length > 0;
        this.isLoadingAddresses = false;
      },
      error: (error) => {
        console.error('Address search error:', error);
        this.isLoadingAddresses = false;
        this.showAddressSuggestions = false;
        // Show user-friendly error message
        if (error.status === 401) {
          console.error('Mapbox API key is invalid or expired');
        } else if (error.status === 429) {
          console.error('Mapbox API rate limit exceeded');
        }
      }
    });
  }

  private searchAddresses(query: string) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.mapboxApiKey}&autocomplete=true&limit=5&country=US`;
    return this.http.get<MapboxResponse>(url).pipe(
      switchMap(response => of(response.features || []))
    );
  }

  selectAddress(address: MapboxFeature) {
    this.selectedAddress = address;
    this.myForm.patchValue({
      address: address.place_name,
      addressLine1: address.place_name // Keep both in sync
    });
    this.showAddressSuggestions = false;
    this.addressSuggestions = [];
  }

  onAddressInputFocus() {
    if (this.addressSuggestions.length > 0) {
      this.showAddressSuggestions = true;
    }
  }

  onAddressInputBlur() {
    // Delay hiding suggestions to allow for selection
    setTimeout(() => {
      this.showAddressSuggestions = false;
    }, 200);
  }

  checkEmailExists(email: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.checkEmailInRealTime(email).subscribe({
        next: (isRegistered: boolean) => {
          this.emailExists = isRegistered;
          if (isRegistered) {
            this.errorMessage = 'This email is already registered. Please enter a new email ID or kindly login from below.';
            this.myForm.get('email')?.setErrors({ emailExists: true });
            this.disableFormExceptEmail();
          } else {
            this.errorMessage = '';
            const emailControl = this.myForm.get('email');
            if (emailControl?.hasError('emailExists')) {
              const currentErrors = { ...emailControl.errors };
              delete currentErrors['emailExists'];
              emailControl.setErrors(Object.keys(currentErrors).length ? currentErrors : null);
            }
          }
          resolve(isRegistered);
        },
        error: () => {
          resolve(false);
        }
      });
    });
  }

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    });
  }

  // Add new method for real-time email checking
  checkEmailInRealTime(email: string): Observable<boolean> {
    const url = `${this.backendBase}/registered-user-emails`;
    
    return this.http.get<string[]>(url, { headers: this.getAuthHeaders() }).pipe(
      switchMap((emails: string[]) => {
        const isRegistered = emails ? emails.includes(email.toLowerCase()) : false;
        return of(isRegistered);
      }),
      catchError(() => of(false)) // Return false if API call fails
    );
  }

  async sendOtp() {
    // Reset change email mode at the beginning
    this.changeEmailMode = false;
      
    const email = this.myForm.get('email')?.value;
    if (this.myForm.get('email')?.valid && !this.emailExists) {
      // Use the new register OTP endpoint
      const sendOtpUrl = `${this.backendBase}/send-register-otp`;
      const body = { email: email };
      
      this.http.post(sendOtpUrl, body, { headers: this.getAuthHeaders() }).subscribe(
        () => {
          this.otpSent = true;
          this.errorMessage = 'Code has been sent to your email.';
          // Disable the email field after OTP is sent
          this.myForm.get('email')?.disable();
          this.startResendTimer();
        },
        (error) => {
          console.error('Failed to send code:', error);
          this.errorMessage = 'Failed to send code. Please try again.';
        }
      );
    } else {
      this.errorMessage = this.emailExists ? 'This email is already registered. kindly login.' : 'Please enter a valid email address.';
    }
  }

  // Add this new method
  enableChangeEmail() {
    this.changeEmailMode = true;
    this.otpSent = false;
    this.canResend = true;
    this.resendTimer = 0;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    // Enable the email field for editing
    this.myForm.get('email')?.enable();
    // Clear any existing OTP values
    this.otpControls.forEach(control => control.setValue(''));
    this.myForm.get('otp')?.reset();
    this.errorMessage = '';
  }

  // Start the 30-second timer for resend restriction
  private startResendTimer() {
    this.canResend = false;
    this.resendTimer = 30;
    
    this.timerInterval = setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        this.canResend = true;
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  // Clean up timer on component destroy
  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
  verifyOtp() {
    if (this.myForm.get('otp')?.valid && this.otpSent) {
      const email = this.myForm.get('email')?.value;
      const otp = this.otpControls.map(control => control.value).join('');
      const verifyOtpUrl = `${this.backendBase}/verify-otp`;
      const body = { email: email, input_otp: otp }; // Changed from 'otp' to 'input_otp'
    
      this.http.post(verifyOtpUrl, body, { headers: this.getAuthHeaders() }).subscribe(
        async () => {
          const isRegistered = await this.checkEmailExists(email);
          if (!isRegistered) {
            this.emailVerified = true;
            this.errorMessage = 'Code verified successfully!';
            this.disableEmailAndOtp();
            this.enableForm();
          } else {
            this.emailExists = true;
            this.errorMessage = 'This email is already registered. kindly login.';
            this.disableFormExceptEmail();
          }
        },
        (error) => {
          console.error('Code verification failed:', error);
          this.errorMessage = error.status === 401 ? 'Invalid code' : 'The code entered is invalid or expired. Please try again.';
        }
      );
    } else {
      this.errorMessage = 'Please enter a valid 6-digit code.';
    }
  }
  
  disableEmailAndOtp() {
    this.myForm.get('email')?.disable();
    this.otpControls.forEach(control => control.disable());
  }

  disableFormExceptEmail() {
    Object.keys(this.myForm.controls).forEach(key => {
      if (key !== 'email' && key !== 'otp') {
        this.myForm.get(key)?.disable();
      }
    });
  }

  enableForm() {
    Object.keys(this.myForm.controls).forEach(key => {
      this.myForm.get(key)?.enable();
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.myForm.get(controlName);
    if (control && control.errors && (control.dirty || control.touched || this.formSubmitAttempted)) {
      const firstError = Object.keys(control.errors)[0];
      return this.errorMessages[controlName]?.[firstError] || 'Invalid field';
    }
    return '';
  }

  isSectionInvalid(section: string): boolean {
    if (!this.sectionControls[section]) return false;
    return this.sectionControls[section].some(controlName => {
      const control = this.myForm.get(controlName);
      return control && control.errors && (control.dirty || control.touched || this.formSubmitAttempted);
    });
  }

  getSectionStatus(section: string): { complete: boolean; message: string } {
    const controls = this.myForm.controls;
    let status = { complete: true, message: '' };
    switch (section) {
      case 'basic':
        if (!controls['restaurantname'].valid) status = { complete: false, message: 'Restaurant name is required' };
        break;
      case 'location':
        if (!controls['addressLine1'].valid) {
          status = { complete: false, message: 'Please complete the address field' };
        }
        break;
      case 'contact':
        if (!controls['name'].valid) status = { complete: false, message: 'Please complete all required contact information' };
        break;
    }
    return status;
  }

  isSubmitDisabled(): boolean {
    return !this.myForm.valid || !this.emailVerified || this.emailExists;
  }

  onSubmit() {
    this.formSubmitAttempted = true;
    if (this.myForm.invalid || !this.emailVerified || this.emailExists) {
      this.highlightErrors();
      this.errorMessage = !this.emailVerified ? 'Please verify your email before submitting.' :
                         this.emailExists ? 'This email is already registered. kindly login.' :
                         'Please fill all required fields correctly.';
      return;
    }

    const formValue = this.myForm.value;
    let cuisineTypes = formValue.cuisineType || [];
    if (formValue.otherCuisine && formValue.cuisineType.includes('Other')) {
      cuisineTypes = cuisineTypes.filter((c: string) => c !== 'Other');
      cuisineTypes.push(formValue.otherCuisine);
    }

    // Use the complete Mapbox address instead of fragmented data
    let fullAddress = '';
    let city = '';
    let state = '';
    let zipCode = '';
    let latitude: number | undefined;
    let longitude: number | undefined;
    
    if (this.selectedAddress) {
  // console.log('Selected Mapbox address:', this.selectedAddress);
  // Use the complete formatted address from Mapbox
  fullAddress = this.selectedAddress.place_name || formValue.addressLine1;
  
  // Extract latitude and longitude from center coordinates
  if (this.selectedAddress.center && this.selectedAddress.center.length === 2) {
    longitude = this.selectedAddress.center[0];
    latitude = this.selectedAddress.center[1];
  }
  
  // Extract components for backward compatibility
  if (this.selectedAddress.place_type && this.selectedAddress.place_type.includes('postcode')) {
    // For postcode type features, the zipCode is in the 'text' property
    zipCode = this.selectedAddress.text || '';
    
    // Extract city and state from context
    if (this.selectedAddress.context) {
      const place = this.selectedAddress.context.find(c => c.id.includes('place'));
      const region = this.selectedAddress.context.find(c => c.id.includes('region'));
      
      city = place?.text || '';
      state = region?.text || '';
    }
  } else {
    // For other address types, extract from context as before
    if (this.selectedAddress.context) {
      const postcode = this.selectedAddress.context.find(c => c.id.includes('postcode'));
      const place = this.selectedAddress.context.find(c => c.id.includes('place'));
      const region = this.selectedAddress.context.find(c => c.id.includes('region'));
      
      zipCode = postcode?.text || '';
      city = place?.text || '';
      state = region?.text || '';
    }
  }
} else {
  // Fallback to manual input
  fullAddress = formValue.addressLine1;
}

    // console.log('Sending address data:', {
    //   restaurant_address: fullAddress,
    //   city: city,
    //   state: state,
    //   zip_or_postal_code: zipCode,
    //   latitude: latitude,
    //   longitude: longitude
    // });
    const registrationData: IRegistrationData = {
      restaurant_name: formValue.restaurantname,
      restaurant_address: fullAddress, // Send complete address
      city: city,
      state: state,
      zip_or_postal_code: zipCode,
      latitude: latitude, // Add latitude
      longitude: longitude, // Add longitude
      email: formValue.email,
      name: formValue.name,
      phone_number: formValue.phonenumber || undefined,
      created_at: new Date().toISOString(),
      is_active: true,
      revenue: formValue.revenue || undefined,
      quality_of_restaurant: formValue.quality || undefined,
      liquor_license: formValue.liquorLicense || undefined,
      delivery_or_takeaway: formValue.deliveryTakeaway || undefined,
      seating: formValue.seating || undefined,
      restaurant_type: formValue.restaurantType || undefined,
      cuisine_type: cuisineTypes.length > 0 ? cuisineTypes : undefined,
      distance_from_zip_code: formValue.distance || undefined
    };

    this.roleService.registerUser(registrationData).subscribe({
      next: () => {
        alert('Registration successful! Click OK to continue with the Login');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Registration Error:', error);
        const errorDetail = error.error?.detail || 'Unknown error';
        this.errorMessage = error.status === 409 ? 'This email is already registered. kindly login.' :
                           typeof errorDetail === 'string' ? `Registration failed: ${errorDetail}! Kindly Verify Again Before Registering.` :
                           'Registration failed due to invalid data. Please check your inputs.';
      }
    });
  }

  onOtpInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (value.length === 1 && index < 5 && /^\d$/.test(value)) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }
  }

  // Add this new method for handling paste events
  onOtpPaste(event: ClipboardEvent, index: number) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6); // Extract only digits, max 6
    
    if (digits.length > 0) {
      // Clear all OTP controls first
      this.otpControls.forEach(control => control.setValue(''));
      
      // Fill the controls with pasted digits
      for (let i = 0; i < digits.length && i < 6; i++) {
        this.otpControls[i].setValue(digits[i]);
      }
      
      // Focus on the next empty input or the last filled input
      const nextIndex = Math.min(digits.length, 5);
      const nextInput = document.getElementById(`otp-${nextIndex}`) as HTMLInputElement;
      nextInput?.focus();
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  }

  private highlightErrors() {
    Object.keys(this.myForm.controls).forEach(key => this.myForm.get(key)?.markAsTouched());
    const sections = ['basic', 'location', 'business', 'contact'];
    for (const section of sections) {
      if (this.isSectionInvalid(section)) {
        this.currentSection = section;
        const firstInvalidControl = document.querySelector(`#${section} .ng-invalid`);
        firstInvalidControl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  }

  getErrorSummary(): string[] {
    const summary: string[] = [];
    Object.keys(this.myForm.controls).forEach(key => {
      const control = this.myForm.get(key);
      if (control?.errors) {
        const errorMessage = this.getErrorMessage(key);
        if (errorMessage) summary.push(errorMessage);
      }
    });
    return summary;
  }

  onClick() {
    this.router.navigate(['/login']);
  }

  isDropdownOpen = false;
  selectedCuisines: string[] = [];
  otherCuisine: string = '';

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  isSelected(cuisine: string): boolean {
    return this.selectedCuisines.includes(cuisine);
  }

  toggleSelection(cuisine: string) {
    const index = this.selectedCuisines.indexOf(cuisine);
    if (index === -1) this.selectedCuisines.push(cuisine);
    else this.selectedCuisines.splice(index, 1);
    this.updateFormControl();
  }

  toggleOther() {
    if (this.isSelected('Other')) {
      this.selectedCuisines = this.selectedCuisines.filter(c => c !== 'Other');
      this.otherCuisine = '';
    } else {
      this.selectedCuisines.push('Other');
    }
    this.updateFormControl();
  }

  updateOtherCuisine(value: string) {
    this.otherCuisine = value;
    this.updateFormControl();
  }

  private updateFormControl() {
    const cuisineValues = this.selectedCuisines.filter(c => c !== 'Other');
    if (this.otherCuisine && this.isSelected('Other')) cuisineValues.push(this.otherCuisine);
    this.myForm.patchValue({ cuisineType: cuisineValues });
  }

  preventNonNumericInput(event: KeyboardEvent): void {
    const key = event.key;
    if (!/^[0-9]$/.test(key)) event.preventDefault();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const dropdownElement = (event.target as HTMLElement).closest('.relative');
    if (!dropdownElement) {
      this.isDropdownOpen = false;
      this.showAddressSuggestions = false;
    }
  }
}