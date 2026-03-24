import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms'; 
import { ActivatedRoute, Router } from '@angular/router'; 
import { SubscriptionPlan } from '../../models/subscription'; 
import { PaymentService } from '../../services/payment.service'; 
import { AuthService, UserLocationsResponse, UserProfileDetails, UpdateLocationStatusRequest } from '../../auth.service'; 
import { CreateCheckoutSessionRequest, CreateCheckoutSessionResponse } from '../../models/checkout-session'; 


interface LocationOption { 
  user_location_id: number; 
  location: string; 
  zip_or_postal_code: string; 
  city?: string; 
  state?: string; 
  restaurant_name?: string; 
  latitude: string; 
  longitude: string; 
  expiry_status: boolean; 
  is_active: boolean; 
  subscription_start_date?: string | null; 
  subscription_end_date?: string | null; 
  selected: boolean; 
} 


@Component({ 
  selector: 'app-multi-location-payment', 
  standalone: true, 
  imports: [CommonModule, FormsModule, ReactiveFormsModule], 
  template: ` 
    <!-- Multi-Location Payment Container --> 
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8 mt-12"> 
      <div class="max-w-6xl mx-auto"> 
        <!-- Header Section --> 
        <div class="text-center mb-12 animate-fade-in"> 
          <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-6 shadow-lg"> 
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> 
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path> 
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path> 
            </svg> 
          </div> 
          <h1 class="text-4xl font-bold text-gray-900 mb-4">Select Your Locations</h1> 
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">Choose which locations you want to include in your subscription</p> 
        </div> 


        <!-- Main Content Grid --> 
        <div class="grid lg:grid-cols-3 gap-8"> 
          <!-- Location Selection --> 
          <div class="lg:col-span-2"> 
            <div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8"> 
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Your Locations</h2> 


              <!-- Loading State --> 
              <div *ngIf="locationsLoading" class="text-center py-8"> 
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div> 
                <p class="mt-4 text-gray-600">Loading your locations...</p> 
              </div> 


              <!-- Error State --> 
              <div *ngIf="locationsError" class="text-center py-8"> 
                <div class="text-red-600 mb-4"> 
                  <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"> 
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14"></path> 
                  </svg> 
                </div> 
                <p class="text-red-600 font-medium">{{ locationsError }}</p> 
                <button (click)="loadUserLocations()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"> 
                  Try Again 
                </button> 
              </div> 


              <!-- Locations List --> 
              <div *ngIf="!locationsLoading && !locationsError" class="space-y-4"> 
                <div *ngFor="let location of availableLocations; trackBy: trackByLocationId"  
                     class="border border-gray-200 rounded-xl p-4 transition-colors" 
                     [class.border-blue-500]="location.selected" 
                     [class.bg-blue-50]="location.selected" 
                     [class.hover:border-blue-300]="location.is_active" 
                     [class.opacity-60]="!location.is_active" 
                     [class.bg-gray-50]="!location.is_active"> 
                  <label class="flex items-start space-x-3 cursor-pointer"> 
                    <input  
                      type="checkbox"  
                      [(ngModel)]="location.selected" 
                      (change)="onLocationSelectionChange()" 
                      [disabled]="!location.is_active" 
                      class="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"> 
                    <div class="flex-1"> 
                      <div class="flex items-center justify-between"> 
                        <h3 class="font-medium text-gray-900">{{ location.restaurant_name || location.location }}</h3> 
                        <div class="flex items-center space-x-2"> 
                          <!-- <span *ngIf="location.expiry_status" class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full"> 
                            Expired 
                          </span>  -->
                          <!-- <span *ngIf="!location.expiry_status && location.is_active" class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"> 
                            Active 
                          </span> 
                          <span *ngIf="!location.expiry_status && !location.is_active" class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full"> 
                            Inactive 
                          </span>  -->
                        </div> 
                      </div> 
                      <p class="text-sm text-gray-600 mt-1"> 
                        {{ location.zip_or_postal_code }} 
                        <span *ngIf="location.city && location.state"> • {{ location.city }}, {{ location.state }}</span> 
                      </p> 
                    </div> 
                  </label> 
                </div> 


                <!-- No locations message --> 
                <div *ngIf="availableLocations.length === 0" class="text-center py-8"> 
                  <div class="text-gray-400 mb-4"> 
                    <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"> 
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path> 
                    </svg> 
                  </div> 
                  <p class="text-gray-600">No locations found. Please add locations to your account first.</p> 
                  <button (click)="navigateToAddLocation()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"> 
                    Add Location 
                  </button> 
                </div> 
              </div> 


              <!-- Payment Form --> 
              <form [formGroup]="paymentForm" *ngIf="selectedLocations.length > 0" class="mt-8 pt-8 border-t border-gray-200"> 
                <h3 class="text-lg font-medium text-gray-900 mb-4">Payment Details</h3> 


                <div class="grid grid-cols-1 md:grid-cols-2 gap-6"> 
                  <!-- Email Field --> 
                  <div class="md:col-span-2"> 
                    <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label> 
                    <input 
                      type="email" 
                      formControlName="email" 
                      [readonly]="true" 
                      class="block w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50" 
                      placeholder="your@email.com" 
                    /> 
                  </div> 


                  <!-- Plan Interval --> 
                  <div class="md:col-span-2"> 
                    <label class="block text-sm font-medium text-gray-700 mb-2">Billing Cycle</label> 
                    <div class="flex space-x-4"> 
                      <label class="flex items-center"> 
                        <input type="radio" formControlName="planInterval" value="monthly" class="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"> 
                        <span class="ml-2 text-sm text-gray-700">Monthly</span> 
                        <span class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">1 month free</span> 
                      </label> 
                      <label class="flex items-center"> 
                        <input type="radio" formControlName="planInterval" value="yearly" class="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"> 
                        <span class="ml-2 text-sm text-gray-700">Yearly</span> 
                        <span class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">2 months free</span> 
                      </label> 
                    </div> 
                  </div> 
                </div> 


                <!-- Submit Button --> 
                <div class="mt-8"> 
                  <button  
                    type="button" 
                    (click)="processPayment()" 
                    [disabled]="isProcessing || selectedLocations.length === 0" 
                    class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-medium text-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"> 
                    <span *ngIf="!isProcessing">Continue to Payment ({{ selectedLocations.length }} location{{ selectedLocations.length !== 1 ? 's' : '' }})</span> 
                    <span *ngIf="isProcessing" class="flex items-center justify-center"> 
                      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> 
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle> 
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> 
                      </svg> 
                      Processing... 
                    </span> 
                  </button> 
                </div> 
              </form> 
            </div> 
          </div> 


          <!-- Summary Card --> 
          <div class="lg:col-span-1"> 
            <div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sticky top-8"> 
              <h3 class="text-xl font-bold text-gray-900 mb-6">Order Summary</h3> 


              <!-- Selected Locations --> 
              <div class="space-y-3 mb-6"> 
                <div *ngFor="let location of selectedLocations" class="flex justify-between items-center py-2 border-b border-gray-100"> 
                  <div> 
                    <p class="font-medium text-gray-900 text-sm">{{ location.location }}</p> 
                    <p class="text-xs text-gray-600">{{ location.zip_or_postal_code }}</p> 
                  </div> 
                  <p class="font-medium text-gray-900">\$150</p> 
                </div> 
              </div> 


              <!-- Pricing Summary --> 
              <div class="border-t border-gray-200 pt-4"> 
                <div class="flex justify-between items-center mb-2"> 
                  <span class="text-gray-600">Locations ({{ selectedLocations.length }})</span> 
                  <span class="font-medium">\${{ getTotalAmount() }}</span> 
                </div> 
                <!-- Monthly clarity: show next month charge --> 
                <div *ngIf="paymentForm.get('planInterval')?.value === 'monthly'" class="flex justify-between items-center mb-2 text-gray-700"> 
                  <span>Next month</span> 
                  <span>+\${{ getTotalAmount() }}</span> 
                </div> 
                <!-- Yearly clarity: show 12-month base --> 
                <div *ngIf="paymentForm.get('planInterval')?.value === 'yearly'" class="flex justify-between items-center mb-2 text-gray-700"> 
                  <span>Annual base (12 months)</span> 
                  <span>+\${{ getAnnualBaseAmount() }}</span> 
                </div> 
                <div *ngIf="paymentForm.get('planInterval')?.value === 'yearly'" class="flex justify-between items-center mb-2 text-green-600"> 
                  <span>Yearly Bonus (2 months free)</span> 
                  <span>Included</span> 
                </div> 
                <div *ngIf="paymentForm.get('planInterval')?.value === 'monthly'" class="flex justify-between items-center mb-2 text-green-600"> 
                  <span>1 month free</span> 
                  <span>-\${{ getMonthlyDiscount() }}</span> 
                </div> 
                <div class="flex justify-between items-center text-lg font-bold text-gray-900 pt-2 border-t border-gray-200"> 
                  <span>{{ paymentForm.get('planInterval')?.value === 'yearly' ? 'Total (14 months)' : 'Total (2 months)' }}</span> 
                  <span>\${{ getFinalAmount() }}</span> 
                </div> 
              </div> 


              <!-- Features --> 
              <div class="mt-6 pt-6 border-t border-gray-200"> 
                <h4 class="font-medium text-gray-900 mb-3">Included Features</h4> 
                <ul class="space-y-2 text-sm text-gray-600"> 
                  <li class="flex items-center"> 
                    <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20"> 
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path> 
                    </svg> 
                    Unlimited menu items 
                  </li> 
                  <li class="flex items-center"> 
                    <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20"> 
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path> 
                    </svg> 
                    No search limit 
                  </li> 
                  <li class="flex items-center"> 
                    <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20"> 
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path> 
                    </svg> 
                    Full radius coverage 
                  </li> 
                  <li class="flex items-center"> 
                    <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20"> 
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path> 
                    </svg> 
                    Market trend analysis 
                  </li> 
                </ul> 
              </div> 
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
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14"></path> 
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


      .animate-fade-in { 
        animation: fade-in 0.6s ease-out; 
      } 
    </style> 
  ` 
}) 
export class MultiLocationPaymentComponent implements OnInit { 
  @Input() selectedPlan: SubscriptionPlan | null = null; 
  @Output() paymentSuccess = new EventEmitter<CreateCheckoutSessionResponse>(); 
  @Output() paymentError = new EventEmitter<string>(); 


  paymentForm: FormGroup; 
  isProcessing = false; 
  showErrorModal = false; 
  errorMessage = ''; 


  // Location management 
  availableLocations: LocationOption[] = []; 
  locationsLoading = false; 
  locationsError: string | null = null; 


  // Pricing 
  readonly PRICE_PER_LOCATION = 150; 


  constructor( 
    private fb: FormBuilder, 
    private paymentService: PaymentService, 
    private route: ActivatedRoute, 
    private router: Router, 
    private authService: AuthService 
  ) { 
    this.paymentForm = this.fb.group({ 
      email: ['', [Validators.required, Validators.email]], 
      planInterval: ['monthly', Validators.required] 
    }); 
  } 


  async ngOnInit() { 
    // Prefill email from auth service 
    const storedEmail = this.authService.getUserEmail(); 
    if (storedEmail) { 
      this.paymentForm.patchValue({ email: storedEmail }); 
    } 


    // Load user locations 
    await this.loadUserLocations();

    // Preselect location(s) if provided via query params
    const preselectParam = this.route.snapshot.queryParamMap.get('preselect');
    if (preselectParam && this.availableLocations.length > 0) {
      const ids = preselectParam.split(',')
        .map(v => Number(v.trim()))
        .filter(n => !isNaN(n));
      this.availableLocations.forEach(loc => {
        if (ids.includes(loc.user_location_id)) {
          // Allow selecting for payment even if expired/unsubscribed
          loc.selected = true;
        }
      });
    }
  } 


  async loadUserLocations() { 
    this.locationsLoading = true; 
    this.locationsError = null; 


    try { 
      const email = this.authService.getUserEmail(); 
      if (!email) { 
        throw new Error('User email not found. Please log in again.'); 
      } 


      // Get user status to get user ID 
      const userStatus = await this.authService.checkUserStatusFull(email).toPromise(); 
      if (!userStatus?.user_id) { 
        throw new Error('User not found. Please log in again.'); 
      } 


      // Use the new getUserProfileDetails API to get complete location information 
      const profileResponse = await this.authService.getUserProfileDetails(userStatus.user_id).toPromise(); 
      if (profileResponse?.user_locations) { 
        this.availableLocations = profileResponse.user_locations.map(location => ({ 
          ...location, 
          selected: false 
        })); 
      } else { 
        this.availableLocations = []; 
      } 
    } catch (error) { 
      this.locationsError = error instanceof Error ? error.message : 'Failed to load locations'; 
      console.error('Error loading locations:', error); 
    } finally { 
      this.locationsLoading = false; 
    } 
  } 


  get selectedLocations(): LocationOption[] { 
    // Allow selecting active-but-unsubscribed or expired locations for payment
    return this.availableLocations.filter(location =>  
      location.selected && location.is_active
    ); 
  } 


  onLocationSelectionChange() { 
    // Ensure only active locations can be selected; expiry/unsubscribed are allowed for payment
    this.availableLocations.forEach(location => { 
      if (location.selected && (!location.is_active)) { 
        location.selected = false; 
      } 
    }); 
  } 


  getTotalAmount(): number { 
    return this.selectedLocations.length * this.PRICE_PER_LOCATION; 
  } 


  getYearlyDiscount(): number { 
    // For yearly: 2 months free = 2 * monthly price 
    const monthlyTotal = this.getTotalAmount(); 
    return this.paymentForm.get('planInterval')?.value === 'yearly' ? monthlyTotal * 2 : 0; 
  } 


  getMonthlyDiscount(): number { 
    // For monthly: 1 month free for first-time users 
    const monthlyTotal = this.getTotalAmount(); 
    return this.paymentForm.get('planInterval')?.value === 'monthly' ? monthlyTotal : 0; 
  } 


  getAnnualBaseAmount(): number { 
    // Base annual price before discount: 12 * monthly price 
    const monthlyTotal = this.getTotalAmount(); 
    return this.paymentForm.get('planInterval')?.value === 'yearly' ? monthlyTotal * 12 : 0; 
  } 


  getFinalAmount(): number { 
    const monthlyTotal = this.getTotalAmount(); 
    const planInterval = this.paymentForm.get('planInterval')?.value; 


    if (planInterval === 'yearly') { 
      // Yearly: charge for 12 months, 2 months free added (total coverage 14 months) 
      return monthlyTotal * 12; 
    } else { 
      // Monthly: Show 2-month clarity (1 paid + 1 free) → payable = monthlyTotal 
      return monthlyTotal; 
    } 
  } 


  trackByLocationId(index: number, location: LocationOption): number { 
    return location.user_location_id; 
  } 


  navigateToAddLocation() { 
    this.router.navigate(['/user-dashboard']); 
  } 






  async processPayment() { 
    if (this.selectedLocations.length === 0) { 
      this.showPaymentError('Please select at least one location'); 
      return; 
    } 


    if (!this.paymentForm.valid) { 
      this.paymentForm.markAllAsTouched(); 
      return; 
    } 


    this.isProcessing = true; 


    try { 
      const formValue = this.paymentForm.value; 
      const locationIds = this.selectedLocations.map(loc => loc.user_location_id); 


      const request: CreateCheckoutSessionRequest = { 
        location_id: locationIds, 
        user_email: formValue.email, 
        plan_interval: formValue.planInterval 
      }; 


      this.paymentService.createCheckoutSession(request).subscribe({ 
        next: (response) => { 
          if (response.status && response.url) { 
            // Emit success event with response details 
            this.paymentSuccess.emit(response); 


            // Show summary of what will be billed 
            if (response.skipped_active.length > 0) { 
              const skippedCount = response.skipped_active.length; 
              const billedCount = response.billed_location_ids.length; 
              alert(`${skippedCount} location(s) already have active subscriptions and were skipped. You will be charged for ${billedCount} location(s).`); 
            } 


            // Redirect to Stripe checkout 
            window.location.href = response.url; 
          } else { 
            this.showPaymentError('Failed to create checkout session'); 
          } 
        }, 
        error: (error) => { 
          this.isProcessing = false; 
          const errorMessage = error?.error?.message || 'Failed to create checkout session'; 
          this.showPaymentError(errorMessage); 
          this.paymentError.emit(errorMessage); 
        }, 
        complete: () => { 
          this.isProcessing = false; 
        } 
      }); 
    } catch (error) { 
      this.isProcessing = false; 
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error occurred'; 
      this.showPaymentError(errorMessage); 
      console.error('Payment error:', error); 
    } 
  } 


  private showPaymentError(message: string) { 
    this.errorMessage = message; 
    this.showErrorModal = true; 
  } 


  handleErrorModalOk() { 
    this.showErrorModal = false; 
  } 
}