import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionPlan } from '../../models/subscription';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../auth.service';
import { CreateCheckoutSessionRequest, CreateCheckoutSessionResponse } from '../../models/checkout-session';

@Component({
  selector: 'app-stripe-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <!-- Modern Payment Container -->
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8 mt-12">
      <div class="max-w-4xl mx-auto">
        <!-- Header Section -->
        <div class="text-center mb-12 animate-fade-in">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-6 shadow-lg">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
          </div>
          <h1 class="text-4xl font-bold text-gray-900 mb-4">Complete Your Subscription</h1>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">Join thousands of restaurants already using MyMenu.AI to optimize their pricing strategy</p>
        </div>

        <!-- Main Content Grid -->
        <div class="grid lg:grid-cols-5 gap-8">
          <!-- Plan Summary Card -->
          <div class="lg:col-span-2 order-2 lg:order-1">
            <div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sticky top-8 animate-slide-up" *ngIf="selectedPlan">
              <!-- Plan Header -->
              <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl mb-4">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ selectedPlan.tierName }} Plan</h3>
                <div class="flex items-center justify-center space-x-2">
                  <span class="text-4xl font-bold text-gray-900">\${{ selectedPlan.price }}</span>
                  <span class="text-lg text-gray-500">/month</span>
                </div>
                <!-- Total summary with additional locations -->
                <div class="mt-4 text-center" *ngIf="selectedPlan">
                  <!-- <div class="text-sm text-gray-600">Additional locations: {{ additionalLocations }} × \${{ additionalLocationPrice }}</div> -->
                  <!-- <div class="text-lg font-semibold text-gray-900 mt-1">Total : \${{ getTotalAmount() }} /month</div> -->
                </div>
                <div *ngIf="selectedPlan.billingCycle === 'yearly'" class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 mt-3">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                
                </div>
              </div>

              <!-- Features List -->
              <div class="space-y-4 mb-8">
                <h4 class="font-semibold text-gray-900 text-lg">What's included:</h4>
                <div class="space-y-3">
                  <div class="flex items-center space-x-3" *ngFor="let feature of getPlanFeatures()">
                    <div class="flex-shrink-0 w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                      <svg class="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                      </svg>
                    </div>
                    <span class="text-gray-700">{{ feature }}</span>
                  </div>
                </div>
              </div>

              <div class="p-4 bg-blue-50 rounded-md border border-blue-200">
                
                <p class="text-sm text-blue-600">Request a hassle-free refund within 4 days of subscription.</p>
              </div>
            </div>
          </div>

          <!-- Payment Form -->
          <div class="lg:col-span-3 order-1 lg:order-2">
            <div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 animate-slide-up">
              <form [formGroup]="paymentForm" (ngSubmit)="processPayment()" class="space-y-6">
                <!-- Customer Information Section -->
                <div class="space-y-6">
                  <h3 class="text-xl font-semibold text-gray-900 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Contact Information
                  </h3>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Email Field -->
                    <div class="md:col-span-2">
                      <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                          </svg>
                        </div>
                        <input
                          type="email"
                          formControlName="email"
                          [readonly]="true"
                          class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 bg-gray-50"
                          placeholder="your@email.com"
                        />
                      </div>
                      <div *ngIf="paymentForm.get('email')?.invalid && paymentForm.get('email')?.touched" class="mt-2 text-sm text-red-600 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        Please enter a valid email address
                      </div>
                    </div>

                    <!-- Name Field -->
                    <div class="md:col-span-2">
                      <label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                          </svg>
                        </div>
                        <input
                          type="text"
                          formControlName="name"
                          class="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                          placeholder="John Doe"
                        />
                      </div>
                      <div *ngIf="paymentForm.get('name')?.invalid && paymentForm.get('name')?.touched" class="mt-2 text-sm text-red-600 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        Name is required
                      </div>
                    </div>

                    <!-- Additional Locations Selector -->
                    <div class="md:col-span-2">
                      <label class="block text-sm font-medium text-gray-700 mb-2">Add Locations</label>
                      <div class="flex items-center space-x-3">
                        <button type="button" (click)="decrementLocations()" class="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">-</button>
                        <span class="w-12 text-center font-medium">{{ additionalLocations }}</span>
                        <button type="button" (click)="incrementLocations()" class="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">+</button>
                        <span class="text-sm text-gray-500">+\${{ additionalLocationPrice }} per extra location</span>
                      </div>
                    </div>

                     <div class="mt-4 text-center" *ngIf="selectedPlan">
                  <div class="text-sm text-gray-600 -ml-2">Additional locations: {{ additionalLocations }} × \${{ additionalLocationPrice }}</div>
                  <div class="text-lg font-semibold text-gray-900 mt-1 -ml-10">Total : \${{ getTotalAmount() }} /month</div>
                </div>

                  </div>
                </div>



                <!-- Submit Button -->
                <div class="pt-6">
                  <button
                    type="submit"
                    [disabled]="!paymentForm.valid || isProcessing"
                    class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg hover:shadow-xl disabled:shadow-md"
                  >
                    <span *ngIf="!isProcessing" class="flex items-center justify-center">
                      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                      Checkout to Payment
                    </span>
                    <span *ngIf="isProcessing" class="flex items-center justify-center">
                      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing Payment...
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Security Footer -->
        <div class="mt-12 text-center animate-fade-in">
          <div class="inline-flex items-center justify-center space-x-6 bg-white rounded-2xl px-8 py-4 shadow-lg border border-gray-100">
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path>
              </svg>
              <span class="text-sm font-medium text-gray-700">256-bit SSL Encryption</span>
            </div>
            <div class="w-px h-6 bg-gray-300"></div>
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              <span class="text-sm font-medium text-gray-700">Powered by Stripe</span>
            </div>
            <div class="w-px h-6 bg-gray-300"></div>
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.51.643.804 1.254 1.223 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              <span class="text-sm font-medium text-gray-700">PCI Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Modal -->
    <div *ngIf="showErrorModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50"></div>
      <div role="dialog" aria-modal="true" class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto p-6">
        <div class="flex items-start">
          <div class="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 100 20 10 10 0 000-20z"></path>
            </svg>
          </div>
          <div class="flex-1">
            <h2 class="text-lg font-semibold text-gray-900">Payment Error</h2>
            <p class="mt-2 text-sm text-gray-700">{{ errorMessage }}</p>
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <button type="button" (click)="handleErrorModalOk()" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">OK</button>
        </div>
      </div>
    </div>

    <!-- Custom Styles -->
    <style>
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes slide-up {
        from { opacity: 0; transform: translateY(40px); }
        to { opacity: 1; transform: translateY(0); }
      }
      

    </style>
  `
})
export class StripePaymentComponent implements OnInit {
  @Input() selectedPlan: SubscriptionPlan | null = null;
  @Output() paymentSuccess = new EventEmitter<any>();
  @Output() paymentError = new EventEmitter<string>();

  paymentForm: FormGroup;
  isProcessing = false;
  additionalLocations = 0;
  additionalLocationPrice = 150;
  showErrorModal = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.paymentForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      name: ['', Validators.required],
      locationId: ['', [Validators.required, Validators.pattern('^[0-9]+$')]]
    });
  }

  async ngOnInit() {
    // Read plan data from query parameters
    this.route.queryParams.subscribe(params => {
      if (params['planId']) {
        this.selectedPlan = {
          id: '',
          userId: '',
          tierId: params['planId'],
          tierName: params['planName'],
          status: 'inactive',
          billingCycle: params['billingCycle'],
          price: parseFloat(params['price']),
          currency: 'USD',
          startDate: new Date()
        };
      }
    });

    // Prefill email and location ID from backend
    const storedEmail = this.authService.getUserEmail();
    if (storedEmail) {
      this.paymentForm.patchValue({ email: storedEmail });
      this.authService.checkUserStatusFull(storedEmail).subscribe({
        next: (status) => {
          const userId = status?.user_id;
          if (status?.email) {
            this.paymentForm.patchValue({ email: status.email });
          }
          if (userId) {
            this.authService.getUserLocations(userId).subscribe({
              next: (resp) => {
                const locations = resp?.locations || [];
                const preferred = locations.find((l: any) => !l.expiry_status) || locations[0];
                if (preferred?.user_location_id) {
                  this.paymentForm.patchValue({ locationId: String(preferred.user_location_id) });
                }
                if (resp?.email) {
                  this.paymentForm.patchValue({ email: resp.email });
                }
              },
              error: () => {
                // Ignore prefill errors to avoid blocking payment
              }
            });
          }
        },
        error: () => {
          // Ignore prefill errors to avoid blocking payment
        }
      });
    }
  }



  getPlanFeatures(): string[] {
    if (!this.selectedPlan) return [];
    
    const planFeatures: { [key: string]: string[] } = {
      '1': [
        'Unlimited menu items',
        'No search limit',
        'Full radius (no 5-mile restriction)',
        'Multiple locations ($150/location)',
        'Easy-to-Use Dashboard',
        'Market Trend Analysis'
      ],
      '2': [
        'Everything in Basic',
        'Advanced analytics suite',
        'Custom reporting',
        'Priority support',
        'Forecasting & automated recommendations'
      ],
      '3': [
        'Everything in Pro',
        'Dedicated account team',
        'Custom integrations & data pipelines',
        'Advanced reporting',
        'SLA & security controls'
      ]
    };

    return planFeatures[this.selectedPlan.tierId] || [
      'Full access to all features',
      'Premium support',
      'Advanced analytics'
    ];
  }

  getTrialEndDate(): string {
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);
    return trialEndDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getTotalAmount(): number {
    const base = this.selectedPlan?.price || 0;
    return base + (this.additionalLocations * this.additionalLocationPrice);
  }

  // Utility to show error modal and emit event
  private showPaymentError(message: string) {
    const msg = message || 'Failed to create checkout session';
    this.errorMessage = msg;
    this.showErrorModal = true;
    this.paymentError.emit(msg);
  }

  incrementLocations() {
    this.additionalLocations = Math.min(this.additionalLocations + 1, 20);
  }

  decrementLocations() {
    this.additionalLocations = Math.max(this.additionalLocations - 1, 0);
  }

  async processPayment() {
    // Only require full name; email and location are prefilled
    const nameCtrl = this.paymentForm.get('name');
    if (!nameCtrl || !nameCtrl.valid) {
      nameCtrl?.markAsTouched();
      return;
    }

    this.isProcessing = true;

    try {
      const raw = this.paymentForm.getRawValue();
      const location_id = parseInt(raw.locationId, 10);
      const email = raw.email;

      if (!email) {
        throw new Error('Email not available');
      }

      if (isNaN(location_id)) {
        throw new Error('Invalid Location ID');
      }

      // Determine plan interval from selected plan or default to monthly
      const plan_interval = this.selectedPlan?.billingCycle || 'monthly';
      
      const payload = { 
        location_id, 
        user_email: email, 
        plan_interval: plan_interval as 'monthly' | 'yearly',
        quantity: 1 + this.additionalLocations, 
        amount_override: this.getTotalAmount() 
      };
      
      this.paymentService.createCheckoutSession(payload).subscribe({
        next: (resp) => {
          if (resp?.url) {
            window.location.href = resp.url;
          } else {
            this.showPaymentError(resp?.message || 'Failed to create checkout session');
          }
        },
        error: (err) => {
          this.isProcessing = false;
          this.showPaymentError(err?.error?.message || 'Failed to create checkout session');
        },
        complete: () => {
          this.isProcessing = false;
        }
      });
    } catch (error) {
      this.isProcessing = false;
      this.showPaymentError(error instanceof Error ? error.message : 'Unexpected error');
      console.error('Payment error:', error);
    }
  }
  handleErrorModalOk() {
    this.showErrorModal = false;
    this.router.navigate(['/letsstart']);
  }
}