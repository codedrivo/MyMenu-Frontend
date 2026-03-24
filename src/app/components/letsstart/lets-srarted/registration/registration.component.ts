import { Component, ViewChild, OnInit, HostListener, ElementRef } from '@angular/core'; 
import { Router, RouterModule } from '@angular/router'; 
import { CommonModule } from '@angular/common'; import { FormsModule } from '@angular/forms'; 
import { HttpClient, HttpClientModule } from '@angular/common/http'; 
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms'; 
import { IRole } from '../../../../model/interface/role'; 
import { RoleService } from '../../../../role.service'; 
import { AuthService } from '../../../../auth.service'; 
import { PaymentService } from '../../../../services/payment.service'; 
import { Pipe, PipeTransform } from '@angular/core'; 
import * as XLSX from 'xlsx'; 
import { jsPDF } from 'jspdf'; 
import 'jspdf-autotable'; 
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs'; 
import { MyAccountComponent } from './my-account.component'; 


@Pipe({ 
 name: 'monthLabel', 
 standalone: true 
}) 
export class MonthLabelPipe implements PipeTransform { 
 transform(value: string): string { 
  if (!value) return ''; 
  const [year, month] = value.split('-'); 
  const date = new Date(parseInt(year), parseInt(month) - 1); 
  return date.toLocaleString('default', { month: 'long', year: 'numeric' }); 
 } 
} 


interface MapboxFeature { 
 id: string; 
 place_name: string; 
 center: [number, number]; 
 place_type: string[]; 
 text: string; 
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


interface RestaurantGroup { 
 source: string; 
 restaurant_source: string; 
 restaurantName: string; 
 items: IRole[]; 
 expanded: boolean; 
 averageDistance: number; 
 minPrice: number; 
 maxPrice: number; 
 totalItems: number; 
} 


@Component({ 
 selector: 'app-registration', 
 standalone: true, 
 imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule, RouterModule, MonthLabelPipe], 
 templateUrl: './registration.component.html', 
 styleUrl: './registration.component.css', 
}) 
export class RegistrationComponent implements OnInit { 
 // Legal disclaimer constant 
 private readonly LEGAL_DISCLAIMER = `Legal Disclaimer 


The data, analytics, and information ("Information") provided by MyMenu.AI are intended solely to aid business decision-making. All decisions made and results thereof are the exclusive responsibility of the user and/or the user's organization. 


MyMenu.AI makes no guarantees, representations, or warranties of any kind, express or implied, regarding the accuracy, completeness, timeliness, or fitness for any particular purpose of the Information. All Information is provided "as is." Past performance or analytics do not guarantee future results; forecasts are estimates subject to uncertainty. 


MyMenu.AI shall not be liable for any direct, indirect, incidental, special, consequential, or other damages (including, but not limited to, lost profits or business interruption) arising from or in connection with the use of, reliance upon, or inability to use the Information, even if advised of the possibility of such damages. 


Some data may be obtained from third-party providers over whom MyMenu.AI has no direct control; as such, MyMenu.AI does not guarantee the completeness or accuracy of any third-party data. Users are strongly encouraged to independently verify any critical information and consult with professional advisors as needed. 


Use of MyMenu.AI services constitutes acceptance of this disclaimer.`; 


 myForm: FormGroup; 
 rolelist: IRole[] = []; 
 pagedList: IRole[] = []; 
 currentPage: number = 1; 
 itemsPerPage: number = 10; 
 isLoading: boolean = false; 
 error: string = ''; 
 hasSearched: boolean = false; 
 showSortMenu: boolean = false; 
 currentSort: string = 'distance_asc'; 
 showExportMenu: boolean = false; 
 priceRange: { min: number; max: number } = { min: 0, max: 100 }; 
 distanceRange: { min: number; max: number } = { min: 0, max: 5 }; 
 originalResults: IRole[] = []; 
 searchQuery: string = ''; 
 availableMonths: { value: string; label: string }[] = []; 
 Math = Math; 


 // Group by restaurant properties 
 groupByRestaurant: boolean = false; 
 restaurantGroups: RestaurantGroup[] = []; 
 pagedGroupedList: RestaurantGroup[] = []; 


 // Add getter for template compatibility 
 get isGroupedByRestaurant(): boolean { 
  return this.groupByRestaurant; 
 } 


 // Disable state when free-tier searches are exhausted 
 get isFreeTierExhausted(): boolean { 
  // Logged-in users now have unlimited searches, so never exhausted 
  return false; 
 } 


 // Disable state when anonymous users reach the search limit 
 get isAnonymousSearchExhausted(): boolean { 
  return this.isAnonymousUser && this.anonymousSearchCount >= this.FREE_TIER_LIMIT; 
 } 


 // For grouped results 
 groupedResults: RestaurantGroup[] = []; 


 // Restaurant filter properties 
 showRestaurantFilter = false; 
 restaurantSearchQuery = ''; 
 selectedRestaurants: string[] = []; 
 availableRestaurants: string[] = []; 
 filteredRestaurants: string[] = []; 


 // Category filter properties 
 availableCategories: string[] = []; 
 selectedCategories: string[] = []; 
 showCategoryFilter = false; 
 showSidebarCategoryFilter = false; // Add this new property 
 categorySearchQuery = ''; 
 filteredCategories: string[] = []; 
 isLoadingCategories: boolean = false; 


 // Removed predefined categories as they're now dynamically loaded 


 availablePageSizes: number[] = [10, 5, 25, 50, 100]; 


 jumpToPage: number = 1; 
 maxVisiblePages: number = 6; 


 // Mobile filter properties 
 showMobileFilters: boolean = false; 


 // Landscape mode properties 
 showLandscapePrompt: boolean = false; 
 isMobileDevice: boolean = false; 
 isTabletDevice: boolean = false; 
 isPortraitMode: boolean = false; 


 mapboxApiKey = 'pk.eyJ1IjoidmFzdXM5IiwiYSI6ImNtZXI3dmI5aTAzbWEybG9wcWdxeGh3cHkifQ.o1hKCj77fSd5GDDvFudIUA'; 
 addressSuggestions: MapboxFeature[] = []; 
 showAddressSuggestions: boolean = false; 
 selectedAddress: MapboxFeature | null = null; 
 isLoadingAddresses: boolean = false; 
 addressSelectionInProgress: boolean = false; 


 userId?: number; 
 userEmail?: string; 
 userLocations: { user_location_id: number; location: string; zip_or_postal_code?: string; latitude?: string; longitude?: string; expiry_status?: boolean; }[] = []; 
 selectedUserLocation: { user_location_id: number; location: string; zip_or_postal_code?: string; latitude?: string; longitude?: string; expiry_status?: boolean; } | null = null; 
 isLocationsLoading: boolean = false; 
 locationsError: string = ''; 


 // New payment API related properties 
 activeLocations: any[] = []; 
 hasActiveSubscription: boolean = false; 
  subscriptionLoading: boolean = false; 
  subscriptionError: string = ''; 
 
  // Cache of active user_location_id derived from payments/subscription mapping
  activeUserLocationIds: Set<number> = new Set();
  // Cache of active location names/addresses to match when IDs are not available
  activeLocationNames: Set<string> = new Set();


 userSearchRemaining: number | null = null; 
 userSearchCompleted: number | null = null; 
 isSearchCountLoading: boolean = false; 
 searchCountError: string = ''; 
 isFreeTierUser: boolean = false; 
 readonly FREE_TIER_LIMIT: number = 10; 


 // Anonymous user properties 
 anonymousToken: string | null = null; 
 isAnonymousUser: boolean = false; 
 anonymousSearchCount: number = 0; 
 anonymousLocationConfirmed: boolean = false; 
 showAddressConfirmationPopup: boolean = false; 
 selectedMapboxAddress: MapboxFeature | null = null; 
 isAddressLocked: boolean = false; 


 constructor( 
  private fb: FormBuilder,  
  private router: Router, 
  private roleService: RoleService, 
  private http: HttpClient, 
  private authService: AuthService, 
  private paymentService: PaymentService 
 ) { 
  this.myForm = this.fb.group({ 
   menuname: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9.,()'\-&\s]*$/)]],  
   includeDescription: [false], 
   exactMatch: [false], 
   description: [''], 
   price: ['', [Validators.pattern(/^\d{1,4}(\.\d{1,2})?$/)]], // Updated validation pattern 
   address: ['', [Validators.required]], 
   userLocationId: [null], 
   restaurantStyle: [''], 
   allRestaurantTypes: [false], 
   casualDining: [false], 
   qsr: [false], 
   fineDining: [false], 
   menuCategory: [''], 
   categories: [[]], 
   month: [''], 
   minPrice: [this.priceRange.min], 
   maxPrice: [this.priceRange.max], 
   minDistance: [this.distanceRange.min], 
   maxDistance: [this.distanceRange.max], 
   searchQuery: [''], 
  }); 
 } 


 ngOnInit(): void { 
  this.generateAvailableMonths(); 
  this.setDefaultMonth(); 
  this.initializeUserContext(); 
  this.loadCategories(); // Add this line 
  this.checkDeviceType(); 
  this.checkOrientation(); 
  this.initializeAnonymousUserFlow(); 
  this.setupAddressAutocomplete(); // Initialize Mapbox address search 
 } 


 private checkDeviceType(): void { 
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') { 
   const userAgent = navigator.userAgent; 


   // Check for tablet devices (iPad, Android tablets) 
   this.isTabletDevice = /iPad|Android(?!.*Mobile)/i.test(userAgent) ||  
              (window.innerWidth >= 768 && window.innerWidth <= 1024); 


   // Check for mobile phones (excluding tablets) 
   this.isMobileDevice = (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||  
              window.innerWidth <= 768) && !this.isTabletDevice; 
  } else { 
   this.isMobileDevice = false; 
   this.isTabletDevice = false; 
  } 
 } 


 private checkOrientation(): void { 
  if (typeof window !== 'undefined') { 
   this.isPortraitMode = window.innerHeight > window.innerWidth; 
  } else { 
   this.isPortraitMode = false; 
  } 
 } 


 @HostListener('window:resize', ['$event']) 
 onResize(event: any): void { 
  this.checkDeviceType(); 
  this.checkOrientation(); 
 } 


 @HostListener('window:orientationchange', ['$event']) 
 onOrientationChange(event: any): void { 
  // Small delay to ensure the orientation change is complete 
  setTimeout(() => { 
   this.checkOrientation(); 
   if (this.showLandscapePrompt && !this.isPortraitMode) { 
    // Hide prompt when rotating to landscape 
    this.hideLandscapePrompt(); 
   } else if (this.shouldShowLandscapePrompt()) { 
    // Show prompt when rotating back to portrait after search 
    this.showLandscapePromptModal(); 
   } 
  }, 100); 
 } 


 private shouldShowLandscapePrompt(): boolean { 
  // Only show landscape prompt for mobile phones, not tablets 
  return this.isMobileDevice && !this.isTabletDevice && this.isPortraitMode && this.hasSearched; 
 } 


 private showLandscapePromptModal(): void { 
  this.showLandscapePrompt = true; 
 } 


 hideLandscapePrompt(): void { 
  this.showLandscapePrompt = false; 
 } 


 navigateToHome(): void { 
  this.router.navigate(['/']); 
 } 


 goToPricing(): void { 
  this.router.navigate(['/pricing']); 
 } 


 navigateToExtendedSearch(): void { 
  // Check if user is logged in by checking if we have userId or userEmail 
  if (this.userId || this.userEmail) { 
   // User is logged in, navigate to user dashboard 
   this.router.navigate(['/user-dashboard']); 
  } else { 
   // User is not logged in, navigate to login page 
   this.router.navigate(['/login']); 
  } 
 } 


 redirectToGoogleSignup(): void { 
  // Redirect within the app to signup/login page 
  this.router.navigate(['/signup']); // '/signup' redirects to '/login' in route config 
 } 


 private initializeUserContext(): void { 
  const email = this.authService.getUserEmail(); 
  if (!email) { 
   console.warn('No stored user email, cannot load locations.'); 
   return; 
  } 
  this.isLocationsLoading = true; 
  this.authService.checkUserStatusFull(email).subscribe({ 
   next: (status) => { 
    this.userId = status.user_id; 
    this.userEmail = status.email; 
    this.isFreeTierUser = !!status.free_tier_user; 
    this.isAnonymousUser = false; 


    // Update form validation for logged-in users 
    this.updateFormValidation(); 


    this.refreshUserSearchRemaining(status.user_id); 
    this.loadUserLocations(status.user_id); 
    this.loadSubscriptionStatus(email); 
   }, 
   error: (err) => { 
    console.error('User status fetch failed', err); 
    this.isLocationsLoading = false; 
    this.locationsError = 'Unable to fetch user status'; 
   } 
  }); 
 } 


 private updateFormValidation(): void { 
  if (this.isAnonymousUser) { 
   // For anonymous users, userLocationId is not required 
   this.myForm.get('userLocationId')?.clearValidators(); 
   this.myForm.get('userLocationId')?.updateValueAndValidity(); 


   // For anonymous users, address is required 
   this.myForm.get('address')?.setValidators([Validators.required]); 
   this.myForm.get('address')?.updateValueAndValidity(); 
  } else { 
   // For logged-in users, userLocationId is required 
   this.myForm.get('userLocationId')?.setValidators([Validators.required]); 
   this.myForm.get('userLocationId')?.updateValueAndValidity(); 


   // For logged-in users, address is not required (they use saved locations) 
   this.myForm.get('address')?.clearValidators(); 
   this.myForm.get('address')?.updateValueAndValidity(); 
  } 
 } 


 private initializeAnonymousUserFlow(): void { 
  // Check if user is logged in 
  if (!this.userId && !this.userEmail) { 
   // User is not logged in, check for existing anonymous token 
   this.anonymousToken = this.authService.getAnonymousToken(); 
   this.isAnonymousUser = true; 


   // Update form validation for anonymous users 
   this.updateFormValidation(); 


   if (this.anonymousToken) { 
    // Load existing anonymous user data 
    this.loadAnonymousUserData(this.anonymousToken); 
   } 
  } 
 } 


 private loadAnonymousUserData(uuid: string): void { 
  this.authService.getUUIDSearchCount(uuid).subscribe({ 
   next: (response) => { 
    this.anonymousSearchCount = response.search_count; 
    this.anonymousLocationConfirmed = true; 
    this.isAddressLocked = true; 


    // Pre-fill the form with the saved location 
    this.myForm.patchValue({ 
     address: response.location, 
     zipCode: response.zip_or_postal_code 
    }); 


    // Set the selected address for internal use 
    this.selectedAddress = { 
     id: '', 
     place_name: response.location, 
     center: [parseFloat(response.longitude), parseFloat(response.latitude)], 
     place_type: [], 
     text: response.location, 
     properties: {}, 
     context: [] 
    }; 
   }, 
   error: (error) => { 
    console.error('Error loading anonymous user data:', error); 
    // If UUID not found, it means this is a new anonymous user 
    this.anonymousLocationConfirmed = false; 
    this.isAddressLocked = false; 
   } 
  }); 
 } 


 confirmAddressSelection(): void { 
  if (!this.selectedMapboxAddress) return; 


  // Generate anonymous token if not exists 
  if (!this.anonymousToken) { 
   this.authService.generateAnonymousToken().subscribe({ 
    next: (response) => { 
     this.anonymousToken = response.token; 
     this.authService.storeAnonymousToken(response.token); 
     this.registerUUIDWithLocation(); 
    }, 
    error: (error) => { 
     console.error('Error generating anonymous token:', error); 
     this.showAddressConfirmationPopup = false; 
    } 
   }); 
  } else { 
   this.registerUUIDWithLocation(); 
  } 
 } 


 private registerUUIDWithLocation(): void { 
  if (!this.selectedMapboxAddress || !this.anonymousToken) return; 


  const address = this.selectedMapboxAddress; 
  const zipContext = address.context?.find(ctx => ctx.id.includes('postcode')); 
  const cityContext = address.context?.find(ctx => ctx.id.includes('place')); 
  const stateContext = address.context?.find(ctx => ctx.id.includes('region')); 


  const payload = { 
   uuid: this.anonymousToken, 
   latitude: address.center[1].toString(), 
   longitude: address.center[0].toString(), 
   location: address.place_name, 
   zip_or_postal_code: zipContext?.text || '', 
   restaurant_name: '', // This might be filled later or left empty 
   city: cityContext?.text || '', 
   state: stateContext?.text || '', 
   distance_from_zip_code: '5', // Default distance 
   search_count: 0 
  }; 


  this.authService.registerUUIDTracking(payload).subscribe({ 
   next: (response) => { 
    // console.log('UUID tracking registered:', response); 
    this.anonymousLocationConfirmed = true; 
    this.isAddressLocked = true; 
    this.showAddressConfirmationPopup = false; 


    // Update form with selected address 
    this.selectedAddress = address; 
    this.myForm.patchValue({ 
     address: address.place_name, 
     zipCode: zipContext?.text || '' 
    }); 


    // Permanently hide address suggestions and clear them 
    this.showAddressSuggestions = false; 
    this.addressSuggestions = []; 
    this.addressSelectionInProgress = false; 


    // Clear the selected Mapbox address to prevent re-selection 
    this.selectedMapboxAddress = null; 
   }, 
   error: (error) => { 
    console.error('Error registering UUID tracking:', error); 
    this.showAddressConfirmationPopup = false; 
   } 
  }); 
 } 


 cancelAddressSelection(): void { 
  this.showAddressConfirmationPopup = false; 
  this.selectedMapboxAddress = null; 
 } 


 private refreshUserSearchRemaining(userId: number): void { 
  this.isSearchCountLoading = true; 
  this.searchCountError = ''; 
  this.authService.getUserSearchCount(userId).subscribe({ 
   next: (resp) => { 
    const usedCount = resp?.search_count ?? 0; 
    this.userSearchCompleted = usedCount; 
    // Set userSearchRemaining to null for unlimited searches for logged-in users 
    this.userSearchRemaining = null; 
    // Always enable form for logged-in users (unlimited searches) 
    this.myForm.enable({ emitEvent: false }); 
    this.isSearchCountLoading = false; 
   }, 
   error: (err) => { 
    console.error('Failed to fetch search count', err); 
    this.userSearchRemaining = null; 
    this.searchCountError = 'Unable to fetch remaining searches'; 
    this.isSearchCountLoading = false; 
   } 
  }); 
 } 


 private loadUserLocations(userId: number): void { 
  this.authService.getUserLocations(userId).subscribe({ 
   next: (resp) => { 
    this.userLocations = Array.isArray(resp?.locations) ? resp.locations : []; 
    this.isFreeTierUser = !!resp?.free_tier_user; 
    const usedCount = resp?.search_count ?? 0; 
    this.userSearchCompleted = usedCount; 
    this.userSearchRemaining = this.isFreeTierUser ? Math.max(0, this.FREE_TIER_LIMIT - usedCount) : null; 
    this.isLocationsLoading = false; 
    // Now that locations have finished loading, filter with subscription data 
    this.filterActiveLocations(); 
   }, 
   error: (err) => { 
    console.error('User locations fetch failed', err); 
    this.isLocationsLoading = false; 
    this.locationsError = 'Unable to fetch user locations'; 
   } 
  }); 
 } 


 private loadSubscriptionStatus(email: string): void { 
  this.subscriptionLoading = true; 
  this.subscriptionError = ''; 


  this.paymentService.checkSubscriptionStatus(email).subscribe({ 
   next: (status) => { 
     this.hasActiveSubscription = status.hasActiveSubscription; 
     this.activeLocations = status.activeLocations || []; 
     // Derive and cache active user_location_ids for robust mapping
     this.activeUserLocationIds = this.deriveActiveUserLocationIds(this.activeLocations);
     // Derive and cache active location names for address-based matching
     this.activeLocationNames = this.deriveActiveLocationNames(this.activeLocations);
     // Mark subscription loading complete before filtering 
     this.subscriptionLoading = false; 
     this.filterActiveLocations(); // Update location filtering 
   }, 
   error: (err) => { 
     console.error('Subscription status fetch failed', err); 
     this.subscriptionError = 'Unable to fetch subscription status'; 
     this.hasActiveSubscription = false; 
     this.activeLocations = []; 
     this.activeUserLocationIds.clear();
     this.activeLocationNames.clear();
     // Mark subscription loading complete before filtering 
     this.subscriptionLoading = false; 
     this.filterActiveLocations(); 
   } 
  }); 
 } 

  // Normalize various possible active location shapes to a set of user_location_id numbers
  private deriveActiveUserLocationIds(activeLocs: any[]): Set<number> {
    const ids = new Set<number>();
    if (!Array.isArray(activeLocs)) return ids;

    for (const loc of activeLocs) {
      // Direct mapping: user_location_id present
      const directId = Number((loc as any).user_location_id);
      if (!isNaN(directId)) {
        ids.add(directId);
        continue;
      }
    }

    return ids;
  }

  // Derive active location names (addresses) for matching userLocations when IDs are absent
  private deriveActiveLocationNames(activeLocs: any[]): Set<string> {
    const names = new Set<string>();
    if (!Array.isArray(activeLocs)) return names;
    for (const loc of activeLocs) {
      const status = String((loc as any).subloc_status || '').toUpperCase();
      if (status !== 'ACTIVE') continue;
      const raw = String((loc as any).display_name || (loc as any).location_name || '').trim();
      if (!raw) continue;
      names.add(this.normalizeAddress(raw));
    }
    return names;
  }

  // Normalize address strings for robust comparison
  private normalizeAddress(str: string): string {
    return String(str)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .trim();
  }

  // De-duplicate user locations by normalized address string
  private dedupeUserLocations<T extends { user_location_id: number; location: string }>(locations: T[]): T[] {
    const seen = new Set<string>();
    const result: T[] = [];
    for (const loc of locations) {
      const key = this.normalizeAddress(loc.location || '');
      if (!key) {
        // If no address text, include once and skip further empties
        if (!seen.has('')) {
          seen.add('');
          result.push(loc);
        }
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(loc);
    }
    return result;
  }


  private filterActiveLocations(): void { 
    // Avoid filtering while data is still loading to prevent premature UI clearing 
    if (this.subscriptionLoading || this.isLocationsLoading) { 
      return; 
    } 


    if (!this.hasActiveSubscription || this.activeLocations.length === 0) { 
      // No active subscription - disable form and show pricing message 
      this.userLocations = []; 
      this.selectedUserLocation = null; 
      this.myForm.patchValue({ 
        userLocationId: null, 
        address: '' 
      }); 
      this.myForm.disable({ emitEvent: false }); 
      this.locationsError = 'No active subscription found. Please purchase a plan to use quick search.'; 
      return; 
    } 


    // Filter user locations to only show those with active subscriptions
    const activeIds = Array.from(this.activeUserLocationIds.values());
    const hasIdMapping = activeIds.length > 0;
    const activeNames = this.activeLocationNames;
    let filteredLocations = this.userLocations.filter(loc => {
      const idMatch = hasIdMapping ? activeIds.includes(Number(loc.user_location_id)) : false;
      const nameKey = this.normalizeAddress(loc.location || '');
      const nameMatch = activeNames.size > 0 ? activeNames.has(nameKey) : false;
      return idMatch || nameMatch;
    });

    // Remove duplicates so the dropdown shows unique addresses
    filteredLocations = this.dedupeUserLocations(filteredLocations);


    if (filteredLocations.length === 0) { 
      // User has locations but none are active 
      this.userLocations = []; 
      this.selectedUserLocation = null; 
      this.myForm.patchValue({ 
        userLocationId: null, 
        address: '' 
      }); 
      this.myForm.disable({ emitEvent: false }); 
      this.locationsError = ''; 
      return; 
    } 


  // Update locations to only show active ones 
  this.userLocations = filteredLocations; 
  const defaultLoc = filteredLocations[0]; 
  this.selectedUserLocation = defaultLoc; 
  this.myForm.patchValue({ 
   userLocationId: defaultLoc ? defaultLoc.user_location_id : null, 
   address: defaultLoc ? defaultLoc.location : '' 
  }); 


  // Enable form for users with active subscriptions 
  this.myForm.enable({ emitEvent: false }); 
  this.locationsError = ''; 
 } 


 onLocationSelectChange(event?: Event): void { 
  const value = event && (event.target as HTMLSelectElement)?.value; 
  const selectedId = Number(value ?? this.myForm.get('userLocationId')?.value); 
  const loc = this.userLocations.find(l => l.user_location_id === selectedId) || null; 
  this.selectedUserLocation = loc; 
  this.myForm.patchValue({ address: loc?.location ?? '' }); 
 } 
 private setupAddressAutocomplete() { 
  this.myForm.get('address')?.valueChanges.pipe( 
   debounceTime(300), 
   distinctUntilChanged(), 
   switchMap((query: string) => { 
    if (this.addressSelectionInProgress) { 
     return of([] as MapboxFeature[]); 
    } 
    if (query && query.length >= 3) { 
     this.isLoadingAddresses = true; 
     return this.searchAddresses(query); 
    } else { 
     this.addressSuggestions = []; 
     this.showAddressSuggestions = false; 
     this.isLoadingAddresses = false; 
     return of([] as MapboxFeature[]); 
    } 
   }) 
  ).subscribe({ 
   next: (suggestions: MapboxFeature[]) => { 
    if (!this.addressSelectionInProgress) { 
     this.addressSuggestions = suggestions; 
     this.showAddressSuggestions = suggestions.length > 0; 
    } 
    this.isLoadingAddresses = false; 
   }, 
   error: (error: any) => { 
    console.error('Address search error:', error); 
    this.isLoadingAddresses = false; 
   } 
  }); 
 } 


 selectAddress(address: MapboxFeature) { 
  this.addressSelectionInProgress = true; 


  // For anonymous users, show confirmation popup 
  if (this.isAnonymousUser && !this.anonymousLocationConfirmed) { 
   this.selectedMapboxAddress = address; 
   this.showAddressConfirmationPopup = true; 
   this.addressSelectionInProgress = false; 
   return; 
  } 


  // For logged-in users or already confirmed anonymous users 
  this.selectedAddress = address; 
  this.myForm.patchValue({ 
   address: address.place_name 
  }); 
  this.showAddressSuggestions = false; 
  this.addressSuggestions = []; 
  setTimeout(() => { 
   this.addressSelectionInProgress = false; 
  }, 100); 
 } 


 onAddressInputFocus() { 
  // Only show suggestions if address is not locked and user hasn't confirmed location 
  if (!this.isAddressLocked && !this.anonymousLocationConfirmed && this.addressSuggestions.length > 0 && !this.selectedAddress) { 
   this.showAddressSuggestions = true; 
  } 
 } 


 private searchAddresses(query: string) { 
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.mapboxApiKey}&types=address,poi&limit=5&country=US`; 
  // console.log('Mapbox API URL:', url); 


  return this.http.get<MapboxResponse>(url).pipe( 
   switchMap((response: MapboxResponse) => { 
    // console.log('Mapbox API response:', response); 
    return of(response.features || []); 
   }), 
   catchError((error: any) => { 
    console.error('Mapbox API error:', error); 
    if (error.status === 401) { 
     console.error('Mapbox API key is invalid or expired'); 
    } else if (error.status === 429) { 
     console.error('Mapbox API rate limit exceeded'); 
    } else if (error.status === 0) { 
     console.error('Network error - check CORS or internet connection'); 
    } 
    return of([]); 
   }) 
  ); 
 } 


 toggleRestaurantFilter() { 
  this.showRestaurantFilter = !this.showRestaurantFilter; 
  if (this.showRestaurantFilter) { 
   this.updateAvailableRestaurants(); 
   this.filteredRestaurants = [...this.availableRestaurants]; 
  } 
 } 


 closeRestaurantFilter() { 
  this.showRestaurantFilter = false; 
 } 


 updateAvailableRestaurants() { 
  const restaurants = new Set<string>(); 
  this.originalResults.forEach(item => { 
   if (item.restaurant_name) { 
    restaurants.add(item.restaurant_name); 
   } 
  }); 
  this.availableRestaurants = Array.from(restaurants).sort(); 
 } 


 onRestaurantSearchChange() { 
  const query = this.restaurantSearchQuery.toLowerCase(); 
  this.filteredRestaurants = this.availableRestaurants.filter(restaurant =>  
   restaurant.toLowerCase().includes(query) 
  ); 
 } 


 isRestaurantSelected(restaurant: string): boolean { 
  return this.selectedRestaurants.includes(restaurant); 
 } 


 toggleRestaurantSelection(restaurant: string, event?: Event) { 
  if (event) { 
   event.stopPropagation(); 
  } 
  const index = this.selectedRestaurants.indexOf(restaurant); 
  if (index > -1) { 
   this.selectedRestaurants.splice(index, 1); 
  } else { 
   this.selectedRestaurants.push(restaurant); 
  } 
 } 


 clearRestaurantSelection() { 
  this.selectedRestaurants = []; 
  // Don't apply filters immediately - let user click Apply button 
 } 


 applyRestaurantFilter() { 
  this.applyAllFilters(); 
  this.currentPage = 1; 
  this.updatePagedList(); 
  // Close restaurant filter when Apply is clicked 
  this.showRestaurantFilter = false; 
 } 


 // applySortFilter() { 
 //  // Close sort menu when Apply is clicked 
 //  this.showSortMenu = false; 
 // } 


 applyAllFilters(): void { 
 const minPrice = parseFloat(this.myForm.get('minPrice')?.value || 0); 
 const maxPrice = parseFloat(this.myForm.get('maxPrice')?.value || 1000); 
 const minDistance = parseFloat(this.myForm.get('minDistance')?.value || 0); 
 const maxDistance = parseFloat(this.myForm.get('maxDistance')?.value || 1000); 
 const searchQueryLower = this.searchQuery.toLowerCase(); 


 this.rolelist = this.originalResults.filter(item => { 
  const casualDining = this.myForm.get('casualDining')?.value; 
  const qsr = this.myForm.get('qsr')?.value; 
  const fineDining = this.myForm.get('fineDining')?.value; 


  let passesTypeFilter = true; 
  if (casualDining || qsr || fineDining) { 
   const itemType = item.restaurant_type?.toLowerCase(); 
   passesTypeFilter = ( 
    (casualDining && (itemType?.includes('casual') || itemType?.includes('dining'))) || 
    (qsr && (itemType?.includes('qsr') || itemType?.includes('quick'))) || 
    (fineDining && (itemType?.includes('fine') || itemType?.includes('upscale'))) 
   ); 
  } 


  const price = parseFloat(item.price?.toString() || '0'); 
  const passesPrice = price >= minPrice && price <= maxPrice; 


  const distance = parseFloat(item.distance_from_zipcode?.toString() || '0'); 
  const passesDistance = distance === undefined || distance === null ||  
   (distance >= minDistance && distance <= maxDistance); 


  const passesSearch = !searchQueryLower || ( 
   (item.menu_item_name?.toLowerCase().includes(searchQueryLower) ||  
   item.restaurant_name?.toLowerCase().includes(searchQueryLower) ||  
   item.description?.toLowerCase().includes(searchQueryLower)) 
  ); 


  const passesRestaurantFilter = this.selectedRestaurants.length === 0 ||  
   this.selectedRestaurants.includes(item.restaurant_name || ''); 


  const passesCategoryFilter = this.selectedCategories.length === 0 || 
   this.selectedCategories.includes(item.standardized_category || ''); 


  const addOnTerms = ['add', 'adds', 'add-ons', 'add ons', 'addon', 'addons', 'add-on']; 
  const menuItemName = item.menu_item_name?.toLowerCase() || ''; 
  const description = item.description?.toLowerCase() || ''; 


  const passesAddOnFilter = !addOnTerms.some(term =>  
   menuItemName.includes(term) || description.includes(term) 
  ); 


  const extraTerms = ['extra', 'extras']; 
  const menuSection = item.menu_section?.toLowerCase() || ''; 


  const passesMenuSectionFilter = !extraTerms.some(term =>  
   menuSection.includes(term) 
  ); 


  return passesTypeFilter && passesPrice && passesDistance && passesSearch &&  
      passesRestaurantFilter && passesAddOnFilter && passesMenuSectionFilter &&  
      passesCategoryFilter; 
 }); 


 this.currentPage = 1; 


 // Handle both grouped and ungrouped views after filtering 
 if (this.groupByRestaurant) { 
  this.groupResultsByRestaurant(); 
  this.sortGroupedResults(this.currentSort); 
  this.updatePagedGroupedList(); 
 } else { 
  this.sortResults(this.currentSort); // Sort results after filtering 
  this.updatePagedList(); 
 } 
} 


 onItemsPerPageChange(newSize: number): void { 
  this.itemsPerPage = newSize; 
  this.currentPage = 1; 


  // Handle both grouped and ungrouped views 
  if (this.groupByRestaurant) { 
   this.updatePagedGroupedList(); 
  } else { 
   this.updatePagedList(); 
  } 


  // Scroll to top when changing page size 
  if (typeof window !== 'undefined') { 
   window.scrollTo({ top: 0, behavior: 'smooth' }); 
  } 
 } 


 applyFilters(): void { 
  this.applyAllFilters(); 
 } 


 @HostListener('document:click', ['$event']) 
 onDocumentClick(event: Event) { 
  const target = event.target as HTMLElement; 


  // Check for sort dropdown - improved detection with new CSS classes 
  const sortContainer = target.closest('.sort-container'); 
  const sortDropdownMenu = target.closest('.sort-dropdown-menu'); 
  const mobileDropdown = target.closest('.mobile-sort-dropdown'); 
  const sortButton = target.closest('.sort-toggle-button'); 


  // Check if click is inside any sort-related element 
  const isClickInsideSortDropdown = sortContainer || sortDropdownMenu || mobileDropdown || sortButton; 


  // Close sort menu if clicking outside 
  if (this.showSortMenu && !isClickInsideSortDropdown) { 
   this.showSortMenu = false; 
  } 


  // Check for export menu 
  const exportMenu = document.querySelector('.export-menu'); 
  if (exportMenu && !exportMenu.contains(target)) { 
   this.showExportMenu = false; 
  } 


  // Check for restaurant filter dropdown 
  const restaurantFilter = target.closest('.restaurant-filter-container'); 
  const restaurantDropdown = target.closest('[class*="absolute"][class*="left-0"][class*="mt-2"][class*="w-80"]'); 
  if (!restaurantFilter && !restaurantDropdown && this.showRestaurantFilter) { 
   this.showRestaurantFilter = false; 
  } 


  // Check for category filter 
  const categoryFilter = target.closest('.category-filter-container'); 
  if (!categoryFilter && this.showCategoryFilter) { 
   this.showCategoryFilter = false; 
  } 


  // Check for sidebar category filter 
  const sidebarCategoryFilter = target.closest('.relative'); 
  const isInsideSidebarCategory = target.closest('[class*="sidebar-category"]'); 
  if (!sidebarCategoryFilter && !isInsideSidebarCategory && this.showSidebarCategoryFilter) { 
   this.showSidebarCategoryFilter = false; 
  } 
 } 


 // Mobile filter methods 
 toggleMobileFilters(): void { 
  this.showMobileFilters = !this.showMobileFilters; 
  if (this.showMobileFilters) { 
   document.body.style.overflow = 'hidden'; // Prevent background scrolling 
  } else { 
   document.body.style.overflow = 'auto'; 
  } 
 } 


 closeMobileFilters(): void { 
  this.showMobileFilters = false; 
 } 


 closeAllMobileDropdowns(): void { 
  this.showRestaurantFilter = false; 
  this.showSortMenu = false; 
  document.body.style.overflow = 'auto'; 
 } 


 applySortFilter() { 
  // Close sort menu when Apply is clicked 
  this.showSortMenu = false; 
 } 


 onAllRestaurantTypesChange(): void { 
  const allSelected = this.myForm.get('allRestaurantTypes')?.value; 
  this.myForm.patchValue({ 
   casualDining: allSelected, 
   qsr: allSelected, 
   fineDining: allSelected 
  }); 
  if (this.hasSearched) { 
   this.applyFilters(); 
   this.updatePagedList(); 
  } 
 } 


 onIndividualRestaurantTypeChange(): void { 
  const casualDining = this.myForm.get('casualDining')?.value; 
  const qsr = this.myForm.get('qsr')?.value; 
  const fineDining = this.myForm.get('fineDining')?.value; 
  const allSelected = casualDining && qsr && fineDining; 
  this.myForm.patchValue({ allRestaurantTypes: allSelected }, { emitEvent: false }); 
  if (this.hasSearched) { 
   this.applyFilters(); 
   this.updatePagedList(); 
  } 
 } 


 generateAvailableMonths(): void { 
  const currentDate = new Date(); 
  const currentYear = currentDate.getFullYear(); 
  const currentMonth = currentDate.getMonth(); 
  for (let i = 1; i <= 3; i++) { 
   const date = new Date(currentYear, currentMonth - i); 
   const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; 
   const label = date.toLocaleString('default', { month: 'long', year: 'numeric' }); 
   this.availableMonths.push({ value, label }); 
  } 
 } 


 setDefaultMonth(): void { 
  if (this.availableMonths.length > 0) { 
   this.myForm.patchValue({ 
    // Default to previous-to-previous month (index 1). Fallback to previous month if not available. 
    month: this.availableMonths[1]?.value ?? this.availableMonths[0].value 
   }); 
  } 
 } 


 onMonthChange(): void { 
  if (this.hasSearched) { 
   this.onSubmit(); 
  } 
 } 


 onSubmit() { 
  // console.log('onSubmit called'); 
  // console.log('Form valid:', this.myForm.valid); 
  // console.log('Form value:', this.myForm.value); 
  // console.log('isAnonymousUser:', this.isAnonymousUser); 
  // console.log('anonymousLocationConfirmed:', this.anonymousLocationConfirmed); 
  // console.log('anonymousToken:', this.anonymousToken); 


  // For anonymous users, check if address is selected and confirmed 
  if (this.isAnonymousUser && !this.anonymousLocationConfirmed) { 
  //  console.log('Anonymous user address not confirmed'); 
   this.error = 'Please select and confirm your address before searching.'; 
   return; 
  } 


  // Check if anonymous user has reached the 10-search limit 
  if (this.isAnonymousUser && this.anonymousSearchCount >= this.FREE_TIER_LIMIT) { 
   this.error = 'Your searches have been completed. Please sign up with Google to continue searching.'; 
   setTimeout(() => { 
    this.redirectToGoogleSignup(); 
   }, 2000); // Show message for 2 seconds before redirecting 
   return; 
  } 


  // For logged-in users, check if they have an active subscription 
  if (!this.isAnonymousUser && !this.hasActiveSubscription) { 
   this.error = 'You need an active subscription to use the search feature. Please purchase a plan to continue.'; 
   setTimeout(() => { 
    this.goToPricing(); 
   }, 2000); // Show message for 2 seconds before redirecting 
   return; 
  } 


  if (this.myForm.invalid) { 
  //  console.log('Form is invalid, marking all as touched'); 
   this.myForm.markAllAsTouched(); 
   return; 
  } 


  if (this.myForm.valid) { 
   this.hasSearched = true; 


   // For mobile portrait mode, automatically start search in background 
   // and show rotate screen message 
   if (this.shouldShowLandscapePrompt()) { 
    this.showLandscapePrompt = true; 
    // Start search automatically in background 
    this.fetchSearchResults(this.myForm.value); 
    return; 
   } 


   this.fetchSearchResults(this.myForm.value); 
  } else { 
   Object.keys(this.myForm.controls).forEach(key => { 
    const control = this.myForm.get(key); 
    if (control && control.invalid) { 
     control.markAsTouched(); 
    } 
   }); 
  } 
 } 


 proceedWithSearch(): void { 
  this.hideLandscapePrompt(); 
  // Search already completed in background, no need to fetch again 
 } 


 toggleSortMenu(): void { 
  this.showSortMenu = !this.showSortMenu; 
 } 


 getSortLabel(): string { 
  switch (this.currentSort) { 
   case 'price_asc': return 'Price (Low to High)'; 
   case 'price_desc': return 'Price (High to Low)'; 
   case 'distance_asc': return 'Distance (Nearest↑)'; 
   case 'distance_desc': return 'Distance (Farthest↓)'; 
   case 'name_asc': return 'Restaurant Name(↑)'; 
   case 'name_desc': return 'Restaurant Name(↓)'; 
   default: return 'Price (Low to High)'; 
  } 
 } 


 sortResults(sortOption: string): void { 
  this.currentSort = sortOption; 


  // Apply the sorting 
  if (this.groupByRestaurant) { 
   this.sortGroupedResults(sortOption); 
   this.updatePagedGroupedList(); 
  } else { 
   this.rolelist.sort((a, b) => { 
    switch (sortOption) { 
     case 'price_asc': 
      return (parseFloat(a.price?.toString() || '0')) - (parseFloat(b.price?.toString() || '0')); 
     case 'price_desc': 
      return (parseFloat(b.price?.toString() || '0')) - (parseFloat(a.price?.toString() || '0')); 
     case 'distance_asc': 
      return (parseFloat(a.distance_from_zipcode?.toString() || '0')) - (parseFloat(b.distance_from_zipcode?.toString() || '0')); 
     case 'distance_desc': 
      return (parseFloat(b.distance_from_zipcode?.toString() || '0')) - (parseFloat(a.distance_from_zipcode?.toString() || '0')); 
     case 'name_asc': 
      return (a.restaurant_name || '').localeCompare(b.restaurant_name || ''); 
     case 'name_desc': 
      return (b.restaurant_name || '').localeCompare(a.restaurant_name || ''); 
     case 'restaurant_asc': 
      return (a.restaurant_name || '').localeCompare(b.restaurant_name || ''); 
     case 'restaurant_desc': 
      return (b.restaurant_name || '').localeCompare(a.restaurant_name || ''); 
     default: 
      return (parseFloat(a.distance_from_zipcode?.toString() || '0')) - (parseFloat(b.distance_from_zipcode?.toString() || '0')); 
    } 
   }); 
   this.updatePagedList(); 
  } 


  // Auto-close dropdown on desktop/laptop (not on mobile) 
  if (!this.isMobileDevice && !this.isTabletDevice) { 
   setTimeout(() => { 
    this.showSortMenu = false; 
   }, 150); // Small delay to allow the UI to update 
  } 
 } 


 private fetchSearchResults(formValue: any): void { 
 this.isLoading = true; 
 this.error = ''; 
 this.rolelist = []; 
 this.pagedList = []; 
 this.currentPage = 1; 


 const menunameSafe = formValue.menuname?.trim() || ''; 
 const monthSafe = formValue.month || ''; 
 const selectedTypes: string[] = []; 
 if (formValue.casualDining) selectedTypes.push('Casual Dining'); 
 if (formValue.qsr) selectedTypes.push('QSR'); 
 if (formValue.fineDining) selectedTypes.push('Fine Dining'); 
 const priceNum = formValue.price ? parseFloat(formValue.price.toString()) : null; // Ensure decimal precision 
 const descriptionSafe = formValue.description || ''; 
 const categorySafe = formValue.menuCategory || ''; 
 const includeDescriptionValue = formValue.includeDescription || false; 
 const exactMatchValue = formValue.exactMatch || false; 
 const selectedCategoryString = this.selectedCategories.length > 0 ? this.selectedCategories[0] : ''; 


 // For anonymous users, use UUID-based search 
 if (this.isAnonymousUser) { 
  // Check if we have an anonymous token 
  if (!this.anonymousToken) { 
   this.error = 'Anonymous token not found. Please refresh the page and try again.'; 
   this.isLoading = false; 
   return; 
  } 


  // Get location from selected address for anonymous users 
  let zipCode = ''; 
  let latitude: number | undefined; 
  let longitude: number | undefined; 


  if (this.selectedAddress) { 
   // Extract zip code from place_name 
   const zipMatch = this.selectedAddress.place_name.match(/\b\d{5}(-\d{4})?\b/); 
   zipCode = zipMatch ? zipMatch[0] : ''; 
   latitude = this.selectedAddress.center[1]; 
   longitude = this.selectedAddress.center[0]; 
  } else { 
   this.error = 'Location not found. Please select an address and try again.'; 
   this.isLoading = false; 
   return; 
  } 


  // console.log('Starting anonymous search with:', { 
  //  uuid: this.anonymousToken, 
  //  menuname: menunameSafe, 
  //  zipCode: zipCode, 
  //  latitude: latitude, 
  //  longitude: longitude, 
  //  month: monthSafe 
  // }); 


  this.roleService.searchWithUUID( 
    this.anonymousToken, 
    menunameSafe, 
    zipCode, 
    latitude || 0, 
    longitude || 0, 
    monthSafe, 
    includeDescriptionValue, 
    exactMatchValue, 
    5000, 
    5 // distance_from_zip_code 
   ).subscribe({ 
   next: (res: IRole[]) => { 
    // console.log('Anonymous search results received:', res); 
    // console.log('Number of results:', res ? res.length : 0); 


    this.originalResults = res || []; 
    this.initializeRanges(this.originalResults); 
    this.selectedRestaurants = []; 
    this.updateAvailableRestaurants(); 
    this.filteredRestaurants = [...this.availableRestaurants]; 
    this.applyFilters(); 
    this.isLoading = false; 


    // console.log('After processing - originalResults:', this.originalResults.length); 
    // console.log('After processing - pagedList:', this.pagedList.length); 


    if (this.originalResults.length === 0) { 
     this.error = 'No menu items found matching your search criteria.'; 
    } 
    // Update anonymous search count 
    if (this.anonymousToken) { 
     this.authService.getUUIDSearchCount(this.anonymousToken).subscribe({ 
      next: (countRes) => { 
       this.anonymousSearchCount = countRes.search_count; 
      }, 
      error: (error) => { 
       console.error('Error fetching anonymous search count:', error); 
      } 
     }); 
    } 
   }, 
   error: (error) => { 
    console.error('Anonymous search error:', error); 
    this.error = 'An error occurred while searching. Please try again.'; 
    this.isLoading = false; 
   } 
  }); 
 } else { 
  // For logged-in users, use existing search method 
  let zipCode = ''; 
  let latitude: number | undefined; 
  let longitude: number | undefined; 
  if (this.selectedUserLocation) { 
   zipCode = this.selectedUserLocation.zip_or_postal_code || ''; 
   latitude = this.selectedUserLocation.latitude ? parseFloat(this.selectedUserLocation.latitude) : undefined; 
   longitude = this.selectedUserLocation.longitude ? parseFloat(this.selectedUserLocation.longitude) : undefined; 
  } 


  this.roleService.getForm1( 
   menunameSafe, 
   zipCode, 
   '', 
   priceNum, 
   descriptionSafe, 
   categorySafe, 
   monthSafe, 
   5000, 
   includeDescriptionValue, 
   latitude, 
   longitude, 
   selectedCategoryString, 
   exactMatchValue, 
   25, 
   this.userId ?? undefined, 
   this.userEmail ?? undefined 
  ).subscribe({ 
   next: (res: IRole[]) => { 
    this.originalResults = res || []; 
    this.initializeRanges(this.originalResults); 
    this.selectedRestaurants = []; 
    this.updateAvailableRestaurants(); 
    this.filteredRestaurants = [...this.availableRestaurants]; 
    this.applyFilters(); 
    this.isLoading = false; 
    if (this.originalResults.length === 0) { 
     this.error = 'No menu items found matching your search criteria.'; 
    } 
    if (this.userId) { 
     this.refreshUserSearchRemaining(this.userId); 
    } 
   }, 
   error: (error) => { 
     console.error('Search error:', error); 
     this.isLoading = false; 
     this.error = 'An error occurred while searching. Please try again.'; 
     this.rolelist = []; 
     this.pagedList = []; 
     if (this.userId) { 
      this.refreshUserSearchRemaining(this.userId); 
     } 
    } 
   }); 
  } 
 } 


 private extractCategoriesFromResults(results: IRole[]): void { 
  const categorySet = new Set<string>(); 
  results.forEach(item => { 
   if (item.standardized_category && item.standardized_category.trim()) { 
    categorySet.add(item.standardized_category.trim()); 
   } 
  }); 
  this.availableCategories = Array.from(categorySet).sort(); 
  this.filteredCategories = [...this.availableCategories]; 
 } 


 addressValidator(control: any): { [key: string]: boolean } | null { 
  if (!control.value) { 
   return { 'required': true }; 
  } 
  return null; 
 } 


 onPriceRangeChange(): void { 
  this.applyFilters(); 
 } 


 onDistanceRangeChange(): void { 
  this.applyFilters(); 
 } 


 onSearchQueryChange(): void { 
  this.applyFilters(); 
 } 


 clearSearchQuery(): void { 
  this.searchQuery = ''; 
  this.applyFilters(); 
 } 


 loadCategories(): void { 
  this.isLoadingCategories = true; 
  this.roleService.getDistinctCategories().subscribe({ 
   next: (categories: string[]) => { 
    this.availableCategories = categories; 
    this.filteredCategories = [...categories]; 
    this.isLoadingCategories = false; 
   }, 
   error: (error) => { 
    console.error('Error loading categories:', error); 
    this.availableCategories = []; 
    this.filteredCategories = []; 
    this.isLoadingCategories = false; 
   } 
  }); 
 } 


 fetchCategories(): void { 
  // Removed API call since we're using categories from results 
  this.isLoadingCategories = false; 
  this.filteredCategories = [...this.availableCategories]; 
 } 


 toggleCategoryFilter() { 
  this.showCategoryFilter = !this.showCategoryFilter; 
  if (this.showCategoryFilter) { 
   this.filteredCategories = [...this.availableCategories]; 
  } 
 } 


 closeCategoryFilter() { 
  this.showCategoryFilter = false; 
 } 


 onCategorySearchChange() { 
  const query = this.categorySearchQuery.toLowerCase(); 
  this.filteredCategories = this.availableCategories.filter(category =>  
   category.toLowerCase().includes(query) 
  ); 
 } 


 isCategorySelected(category: string): boolean { 
  return this.selectedCategories.includes(category); 
 } 


 toggleCategorySelection(category: string, event?: Event) { 
  if (event) { 
   event.stopPropagation(); 
  } 
  const index = this.selectedCategories.indexOf(category); 
  if (index > -1) { 
   this.selectedCategories.splice(index, 1); 
  } else { 
   this.selectedCategories.push(category); 
  } 
  this.myForm.patchValue({ categories: this.selectedCategories }); 
 } 


 clearCategorySelection() { 
  this.selectedCategories = []; 
  this.myForm.patchValue({ categories: [] }); 
  this.applyAllFilters(); 
 } 


 applyCategoryFilter() { 
  this.showCategoryFilter = false; 
  if (this.hasSearched) { 
   this.applyAllFilters(); 
  } 
 } 


 clearSearch(): void { 
  // Store current address for anonymous users to prevent search count reset 
  const currentAddress = this.isAnonymousUser ? this.selectedAddress : null; 


  this.myForm.reset(); 
  this.setDefaultMonth(); 
  this.rolelist = []; 
  this.pagedList = []; 
  this.hasSearched = false; 
  this.error = ''; 
  this.currentPage = 1; 
  this.selectedRestaurants = []; 
  this.availableRestaurants = []; 
  this.filteredRestaurants = []; 
  this.selectedCategories = []; 
  this.filteredCategories = [...this.availableCategories]; 


  // Clear address-related properties, but preserve address for anonymous users 
  if (this.isAnonymousUser) { 
   // For anonymous users, preserve the selected address to prevent search count reset 
   this.selectedAddress = currentAddress; 
   // Restore the address in the form if it exists 
   if (currentAddress) { 
    this.myForm.patchValue({ address: currentAddress.place_name }); 
   } 
  } else { 
   // For logged-in users, clear address normally 
   this.selectedAddress = null; 
  } 


  this.addressSuggestions = []; 
  this.showAddressSuggestions = false; 
  this.isLoadingAddresses = false; 
  this.addressSelectionInProgress = false; 


  // Clear grouped results 
  this.restaurantGroups = []; 
  this.pagedGroupedList = []; 
  this.groupedResults = []; 
  this.originalResults = []; 


  // Reset search query 
  this.searchQuery = ''; 
 } 


 formatPrice(price: number | string | undefined): string { 
  if (!price && price !== 0) return 'N/A'; 
  return '$' + Number(price).toFixed(2); 
 } 


 formatDistance(distance: number | string | undefined): string { 
  if (!distance && distance !== 0) return 'N/A'; 
  return Number(distance).toFixed(2) + ' miles'; 
 } 


 formatDistanceValue(distance: number | string | undefined): string { 
  if (!distance && distance !== 0) return '0.00'; 
  return Number(distance).toFixed(2); 
 } 


 toggleGroupByRestaurant(): void { 
  this.groupByRestaurant = !this.groupByRestaurant; 
  if (this.groupByRestaurant) { 
   this.groupResultsByRestaurant(); 
   this.sortGroupedResults(this.currentSort); 
   this.updatePagedGroupedList(); 
  } else { 
   this.currentPage = 1; 
   this.updatePagedList(); 
  } 
 } 


 private groupResultsByRestaurant(): void { 
  const groups = new Map<string, RestaurantGroup>(); 


  this.rolelist.forEach(item => { 
   const restaurantName = item.restaurant_name || 'Unknown Restaurant'; 


   if (!groups.has(restaurantName)) { 
    groups.set(restaurantName, { 
     source: item.source || '', 
     restaurant_source: item.restaurant_source || '', 
     restaurantName, 
     items: [], 
     expanded: false, 
     averageDistance: 0, 
     minPrice: Infinity, 
     maxPrice: -Infinity, 
     totalItems: 0 
    }); 
   } 


   const group = groups.get(restaurantName)!; 
   group.items.push(item); 
   group.totalItems++; 


   // Update price range 
   const price = parseFloat(item.price?.toString() || '0'); 
   if (price > 0) { 
    group.minPrice = Math.min(group.minPrice, price); 
    group.maxPrice = Math.max(group.maxPrice, price); 
   } 
  }); 


  // Calculate average distances and finalize groups 
  this.restaurantGroups = Array.from(groups.values()).map(group => { 
   const distances = group.items 
    .map(item => parseFloat(item.distance_from_zipcode?.toString() || '0')) 
    .filter(d => d > 0); 


   group.averageDistance = distances.length > 0  
    ? distances.reduce((sum, d) => sum + d, 0) / distances.length  
    : 0; 


   // Handle case where no valid prices found 
   if (group.minPrice === Infinity) { 
    group.minPrice = 0; 
    group.maxPrice = 0; 
   } 


   return group; 
  }); 


  // Store in groupedResults for compatibility 
  this.groupedResults = [...this.restaurantGroups]; 
 } 


 private sortGroupedResults(sortOption: string): void { 
  this.restaurantGroups.sort((a, b) => { 
   switch (sortOption) { 
    case 'price_asc': 
     return a.minPrice - b.minPrice; 
    case 'price_desc': 
     return b.maxPrice - a.maxPrice; 
    case 'distance_asc': 
     return a.averageDistance - b.averageDistance; 
    case 'distance_desc': 
     return b.averageDistance - a.averageDistance; 
    case 'name_asc': 
     return a.restaurantName.localeCompare(b.restaurantName); 
    case 'name_desc': 
     return b.restaurantName.localeCompare(a.restaurantName); 
    case 'restaurant_asc': 
     return a.restaurantName.localeCompare(b.restaurantName); 
    case 'restaurant_desc': 
     return b.restaurantName.localeCompare(a.restaurantName); 
    default: 
     return a.averageDistance - b.averageDistance; 
   } 
  }); 
 } 


 private updatePagedGroupedList(): void { 
  const startIndex = (this.currentPage - 1) * this.itemsPerPage; 
  const endIndex = startIndex + this.itemsPerPage; 
  this.pagedGroupedList = this.restaurantGroups.slice(startIndex, endIndex); 
  // Reset expand/collapse state for grouped view when changing pages 
  this.pagedGroupedList.forEach(group => { 
   group.expanded = false; 
  }); 
  this.areAllGroupsExpanded = false; 
 } 


 toggleGroupExpansion(restaurantName: string): void { 
  const group = this.pagedGroupedList.find(g => g.restaurantName === restaurantName); 
  if (group) { 
   group.expanded = !group.expanded; 
  } 
 } 


 private getTotalGroupPages(): number { 
  return Math.ceil(this.restaurantGroups.length / this.itemsPerPage); 
 } 


 private getTotalPagesGrouped(): number { 
  return Math.ceil(this.restaurantGroups.length / this.itemsPerPage); 
 } 


 // Update existing updatePagedList method 
 updatePagedList(): void { 
  if (this.isGroupedByRestaurant) { 
   this.updatePagedGroupedList(); 
   return; 
  } 


  const startIndex = (this.currentPage - 1) * this.itemsPerPage; 
  const endIndex = startIndex + this.itemsPerPage; 
  this.pagedList = this.rolelist.slice(startIndex, endIndex); 


  // Reset expand/collapse state for individual rows when changing pages 
  this.expandedRows = new Array(this.pagedList.length).fill(false); 
  this.areAllRowsExpanded = false; 
 } 


 // Update existing getTotalPages method 
 // getTotalPages(): number { 
 //  if (this.isGroupedByRestaurant) { 
 //   return this.getTotalPagesGrouped(); 
 //  } 
 //  return Math.ceil(this.rolelist.length / this.itemsPerPage); 
 // } 


 // sortResults(sortOption: string): void { 
 //  this.currentSort = sortOption; 
 //  this.showSortMenu = false; 


 //  if (this.groupByRestaurant) { 
 //   this.sortGroupedResults(sortOption); 
 //   this.updatePagedGroupedList(); 
 //  } else { 
 //   // Existing individual item sorting 
 //   this.rolelist.sort((a, b) => { 
 //    switch (sortOption) { 
 //     case 'price_asc': 
 //      return (parseFloat(a.price?.toString() || '0')) - (parseFloat(b.price?.toString() || '0')); 
 //     case 'price_desc': 
 //      return (parseFloat(b.price?.toString() || '0')) - (parseFloat(a.price?.toString() || '0')); 
 //     case 'distance_asc': 
 //      return (parseFloat(a.distance_from_zipcode?.toString() || '0')) - (parseFloat(b.distance_from_zipcode?.toString() || '0')); 
 //     case 'distance_desc': 
 //      return (parseFloat(b.distance_from_zipcode?.toString() || '0')) - (parseFloat(a.distance_from_zipcode?.toString() || '0')); 
 //     case 'name_asc': 
 //      return (a.restaurant_name || '').localeCompare(b.restaurant_name || ''); 
 //     case 'name_desc': 
 //      return (b.restaurant_name || '').localeCompare(a.restaurant_name || ''); 
 //     case 'restaurant_asc': 
 //      return (a.restaurant_name || '').localeCompare(b.restaurant_name || ''); 
 //     case 'restaurant_desc': 
 //      return (b.restaurant_name || '').localeCompare(a.restaurant_name || ''); 
 //     default: 
 //      return (parseFloat(a.distance_from_zipcode?.toString() || '0')) - (parseFloat(b.distance_from_zipcode?.toString() || '0')); 
 //    } 
 //   }); 
 //   this.updatePagedList(); 
 //  } 
 // } 


 // applyAllFilters(): void { 
 //  const minPrice = this.myForm.get('minPrice')?.value || 0; 
 //  const maxPrice = this.myForm.get('maxPrice')?.value || 1000; 
 //  const minDistance = this.myForm.get('minDistance')?.value || 0; 
 //  const maxDistance = this.myForm.get('maxDistance')?.value || 1000; 
 //  const searchQueryLower = this.searchQuery.toLowerCase(); 


 //  this.rolelist = this.originalResults.filter(item => { 
 //   const casualDining = this.myForm.get('casualDining')?.value; 
 //   const qsr = this.myForm.get('qsr')?.value; 
 //   const fineDining = this.myForm.get('fineDining')?.value; 


 //   let passesTypeFilter = true; 
 //   if (casualDining || qsr || fineDining) { 
 //    const itemType = item.restaurant_type?.toLowerCase(); 
 //    passesTypeFilter = ( 
 //     (casualDining && (itemType?.includes('casual') || itemType?.includes('dining'))) || 
 //     (qsr && (itemType?.includes('qsr') || itemType?.includes('quick'))) || 
 //     (fineDining && (itemType?.includes('fine') || itemType?.includes('upscale'))) 
 //    ); 
 //   } 


 //   const price = parseFloat(item.price?.toString() || '0'); 
 //   const passesPrice = price >= minPrice && price <= maxPrice; 


 //   const distance = parseFloat(item.distance_from_zipcode?.toString() || '0'); 
 //   const passesDistance = distance === undefined || distance === null ||  
 //    (distance >= minDistance && distance <= maxDistance); 


 //   const passesSearch = !searchQueryLower || ( 
 //    (item.menu_item_name?.toLowerCase().includes(searchQueryLower) ||  
 //    item.restaurant_name?.toLowerCase().includes(searchQueryLower) ||  
 //    item.description?.toLowerCase().includes(searchQueryLower)) 
 //   ); 


 //   const passesRestaurantFilter = this.selectedRestaurants.length === 0 ||  
 //    this.selectedRestaurants.includes(item.restaurant_name || ''); 


 //   const passesCategoryFilter = this.selectedCategories.length === 0 || 
 //    this.selectedCategories.includes(item.standardized_category || ''); 


 //   const addOnTerms = ['add','adds','add-ons', 'add ons', 'addon', 'addons', 'add-on']; 
 //   const menuItemName = item.menu_item_name?.toLowerCase() || ''; 
 //   const description = item.description?.toLowerCase() || ''; 


 //   const passesAddOnFilter = !addOnTerms.some(term =>  
 //    menuItemName.includes(term) || description.includes(term) 
 //   ); 


 //   const extraTerms = ['extra', 'extras']; 
 //   const menuSection = item.menu_section?.toLowerCase() || ''; 


 //   const passesMenuSectionFilter = !extraTerms.some(term =>  
 //    menuSection.includes(term) 
 //   ); 


 //   return passesTypeFilter && passesPrice && passesDistance && passesSearch &&  
 //      passesRestaurantFilter && passesAddOnFilter && passesMenuSectionFilter &&  
 //      passesCategoryFilter; 
 //  }); 


 //  this.currentPage = 1; 


 //  if (this.groupByRestaurant) { 
 //   this.groupResultsByRestaurant(); 
 //   this.sortGroupedResults(this.currentSort); 
 //   this.updatePagedGroupedList(); 
 //  } else { 
 //   this.updatePagedList(); 
 //  } 
 // } 


 // addressValidator(control: any): { [key: string]: boolean } | null { 
 //  if (!control.value) { 
 //   return { 'required': true }; 
 //  } 
 //  return null; 
 // } 


 // onPriceRangeChange(): void { 
 //  this.applyFilters(); 
 // } 


 // onDistanceRangeChange(): void { 
 //  this.applyFilters(); 
 // } 


 // onSearchQueryChange(): void { 
 //  this.applyFilters(); 
 // } 


 // clearSearchQuery(): void { 
 //  this.searchQuery = ''; 
 //  this.applyFilters(); 
 // } 


 // fetchCategories(): void { 
 //  // Removed API call since we're using categories from results 
 //  this.isLoadingCategories = false; 
 //  this.filteredCategories = [...this.availableCategories]; 
 // } 


 // toggleCategoryFilter() { 
 //  this.showCategoryFilter = !this.showCategoryFilter; 
 //  if (this.showCategoryFilter) { 
 //   this.filteredCategories = [...this.availableCategories]; 
 //  } 
 // } 


 // closeCategoryFilter() { 
 //  this.showCategoryFilter = false; 
 // } 


 // onCategorySearchChange() { 
 //  const query = this.categorySearchQuery.toLowerCase(); 
 //  this.filteredCategories = this.availableCategories.filter(category =>  
 //   category.toLowerCase().includes(query) 
 //  ); 
 // } 


 // isCategorySelected(category: string): boolean { 
 //  return this.selectedCategories.includes(category); 
 // } 


 // toggleCategorySelection(category: string, event?: Event) { 
 //  if (event) { 
 //   event.stopPropagation(); 
 //  } 
 //  const index = this.selectedCategories.indexOf(category); 
 //  if (index > -1) { 
 //   this.selectedCategories.splice(index, 1); 
 //  } else { 
 //   this.selectedCategories.push(category); 
 //  } 
 //  this.myForm.patchValue({ categories: this.selectedCategories }); 
 // } 


 // clearCategorySelection() { 
 //  this.selectedCategories = []; 
 //  this.myForm.patchValue({ categories: [] }); 
 //  this.applyAllFilters(); 
 // } 


 // applyCategoryFilter() { 
 //  this.showCategoryFilter = false; 
 //  if (this.hasSearched) { 
 //   this.applyAllFilters(); 
 //  } 
 // } 


 // clearSearch(): void { 
 //  this.myForm.reset(); 
 //  this.setDefaultMonth(); 
 //  this.rolelist = []; 
 //  this.pagedList = []; 
 //  this.hasSearched = false; 
 //  this.error = ''; 
 //  this.currentPage = 1; 
 //  this.selectedRestaurants = []; 
 //  this.availableRestaurants = []; 
 //  this.filteredRestaurants = []; 
 //  this.selectedCategories = []; 
 //  this.filteredCategories = [...this.availableCategories]; 
 // } 


 // formatPrice(price: number | string | undefined): string { 
 //  if (!price && price !== 0) return 'N/A'; 
 //  return '$' + Number(price).toFixed(2); 
 // } 


 // formatDistance(distance: number | string | undefined): string { 
 //  if (!distance && distance !== 0) return 'N/A'; 
 //  return Number(distance).toFixed(2) + ' miles'; 
 // } 


 // updatePagedList(): void { 
 //  if (this.isGroupedByRestaurant) { 
 //   this.updatePagedGroupedList(); 
 //   return; 
 //  } 


 //  const startIndex = (this.currentPage - 1) * this.itemsPerPage; 
 //  const endIndex = startIndex + this.itemsPerPage; 
 //  this.pagedList = this.rolelist.slice(startIndex, endIndex); 


 //  // Reset expanded rows when changing pages 
 //  this.expandedRows = new Array(this.pagedList.length).fill(false); 
 //  this.areAllRowsExpanded = false; 
 // } 


 changePage(page: number): void { 
  if (page >= 1 && page <= this.getTotalPages()) { 
   this.currentPage = page; 
   if (this.groupByRestaurant) { 
    this.updatePagedGroupedList(); 
   } else { 
    this.updatePagedList(); 
   } 
   // Scroll to top of the page 
   if (typeof window !== 'undefined') { 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
   } 
  } 
 } 


 getTotalPages(): number { 
  if (this.isGroupedByRestaurant) { 
   return this.getTotalPagesGrouped(); 
  } 
  return Math.ceil(this.rolelist.length / this.itemsPerPage); 
 } 


 getPageNumbers(): number[] { 
  const totalPages = this.getTotalPages(); 
  const maxVisible = this.maxVisiblePages; 
  if (totalPages <= maxVisible) { 
   return Array.from({ length: totalPages }, (_, i) => i + 1); 
  } 
  let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2)); 
  let endPage = startPage + maxVisible - 1; 
  if (endPage > totalPages) { 
   endPage = totalPages; 
   startPage = Math.max(1, endPage - maxVisible + 1); 
  } 
  return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i); 
 } 


 goToFirstVisiblePage(): void { 
  const pageNumbers = this.getPageNumbers(); 
  if (pageNumbers.length > 0) { 
   this.changePage(pageNumbers[0]); 
  } 
 } 


 goToLastVisiblePage(): void { 
  const pageNumbers = this.getPageNumbers(); 
  if (pageNumbers.length > 0) { 
   this.changePage(pageNumbers[pageNumbers.length - 1]); 
  } 
 } 


 goBackwardPages(): void { 
  const newPage = Math.max(1, this.currentPage - this.maxVisiblePages); 
  this.changePage(newPage); 
 } 


 goForwardPages(): void { 
  const totalPages = this.getTotalPages(); 
  const newPage = Math.min(totalPages, this.currentPage + this.maxVisiblePages); 
  this.changePage(newPage); 
 } 


 jumpToSpecificPage(): void { 
  const totalPages = this.getTotalPages(); 
  if (this.jumpToPage >= 1 && this.jumpToPage <= totalPages) { 
   this.changePage(this.jumpToPage); 
  } else { 
   this.jumpToPage = this.currentPage; 
  } 
 } 


 canGoBackward(): boolean { 
  const pageNumbers = this.getPageNumbers(); 
  return pageNumbers.length > 0 && pageNumbers[0] > 1; 
 } 


 canGoForward(): boolean { 
  const pageNumbers = this.getPageNumbers(); 
  const totalPages = this.getTotalPages(); 
  return pageNumbers.length > 0 && pageNumbers[pageNumbers.length - 1] < totalPages; 
 } 


 // onItemsPerPageChange(newSize: number): void { 
 //  this.itemsPerPage = newSize; 
 //  this.currentPage = 1; 


 //  // Handle both grouped and ungrouped views 
 //  if (this.groupByRestaurant) { 
 //   this.updatePagedGroupedList(); 
 //  } else { 
 //   this.updatePagedList(); 
 //  } 


 //  // Scroll to top when changing page size 
 //  window.scrollTo({ top: 0, behavior: 'smooth' }); 
 // } 


 openVideoInNewTab(): void { 
  if (typeof window !== 'undefined') { 
   window.open('assets/letstart-demovideo.mp4', '_blank'); 
  } 
 } 


 expandedRows: boolean[] = []; 


 toggleExpand(index: number): void { 
  this.expandedRows[index] = !this.expandedRows[index]; 
 } 


 getDistanceClass(distance: number): string { 
  if (distance <= 1) return 'bg-green-100 text-green-800'; 
  if (distance <= 3) return 'bg-yellow-100 text-yellow-800'; 
  return 'bg-red-100 text-red-800'; 
 } 


 areAllRowsExpanded: boolean = false; 


 // Add new property for grouped restaurant expand/collapse state 
 areAllGroupsExpanded: boolean = false; 


 toggleAllRows(): void { 
  if (this.isGroupedByRestaurant) { 
   // Handle grouped restaurant view 
   const currentlyAllExpanded = this.areAllRestaurantGroupsExpanded; 
   const newExpandedState = !currentlyAllExpanded; 


   this.pagedGroupedList.forEach(group => { 
    group.expanded = newExpandedState; 
   }); 
   // Also update the main restaurant groups array to maintain consistency 
   this.restaurantGroups.forEach(group => { 
    group.expanded = newExpandedState; 
   }); 


   // Update the boolean property to match 
   this.areAllGroupsExpanded = newExpandedState; 
  } else { 
   // Handle individual rows view 
   this.areAllRowsExpanded = !this.areAllRowsExpanded; 
   this.expandedRows = new Array(this.pagedList.length).fill(this.areAllRowsExpanded); 
  } 
 } 


 // Add method to check if all groups are expanded (for template) 
 get areAllRestaurantGroupsExpanded(): boolean { 
  if (!this.isGroupedByRestaurant || this.pagedGroupedList.length === 0) { 
   return false; 
  } 
  return this.pagedGroupedList.every(group => group.expanded); 
 } 


 toggleExportMenu(): void { 
  this.showExportMenu = !this.showExportMenu; 
 } 


 formatRestaurantType(restaurantType: string | undefined): string { 
  if (!restaurantType) return 'N/A'; 
  const typeMap: { [key: string]: string } = { 
   'qsr': 'Quick Service Restaurant', 
   'casual_dining': 'Casual Dining', 
   'fine_dining': 'Fine Dining', 
   'fast_casual': 'Fast Casual', 
   'family_dining': 'Family Dining' 
  }; 
  const lowerType = restaurantType.toLowerCase(); 
  return typeMap[lowerType] || restaurantType; 
 } 


 formatRestaurantSource(source: string | undefined): string { 
  if (!source) return ''; 
  return source.charAt(0).toUpperCase() + source.slice(1).toLowerCase(); 
 } 


 private exportToCSV(headers: string[], data: any[][], fileName: string): void { 
  // Add disclaimer as header rows 
  const disclaimerRows = this.LEGAL_DISCLAIMER.split('\n').map(line => [line]); 
  const separatorRow = ['']; 
  const csvContent = [...disclaimerRows, separatorRow, [headers.join(',')], ...data] 
   .map(row => { 
    if (row.length === 1 && row[0] !== '') { 
     // For disclaimer text, just return the text as is 
     return row[0]; 
    } 
    return row.map(cell => { 
     const cellStr = String(cell || ''); 
     return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')  
      ? `"${cellStr.replace(/"/g, '""')}"`  
      : cellStr; 
    }).join(','); 
   }) 
   .join('\n'); 


  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); 
  const url = URL.createObjectURL(blob); 
  const link = document.createElement('a'); 
  link.setAttribute('href', url); 
  link.setAttribute('download', `${fileName}.csv`); 
  link.style.visibility = 'hidden'; 
  document.body.appendChild(link); 
  link.click(); 
  document.body.removeChild(link); 
  URL.revokeObjectURL(url); 
 } 


 private exportToXLSX(headers: string[], data: any[][], fileName: string): void { 
  // Create disclaimer sheet 
  const disclaimerLines = this.LEGAL_DISCLAIMER.split('\n'); 
  const disclaimerData = disclaimerLines.map(line => [line]); 


  // Add empty rows for separation 
  disclaimerData.push(['']); 
  disclaimerData.push(['']); 


  // Add data with headers 
  const fullData = [...disclaimerData, [headers.join(' | ')], ...data]; 


  const worksheet = XLSX.utils.aoa_to_sheet(fullData); 
  const workbook = XLSX.utils.book_new(); 
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Menu Comparison'); 


  // Set column widths 
  const colWidths = headers.map((_, colIndex) => { 
   const maxLength = Math.max( 
    headers[colIndex].length, 
    ...data.map(row => String(row[colIndex] || '').length) 
   ); 
   return { wch: Math.min(maxLength + 2, 50) }; 
  }); 
  worksheet['!cols'] = colWidths; 


  XLSX.writeFile(workbook, `${fileName}.xlsx`); 
 } 


 exportData(format: 'csv' | 'xlsx' | 'pdf'): void { 
  this.showExportMenu = false; 
  if (this.rolelist.length === 0) { 
   alert('No data to export. Please perform a search first.'); 
   return; 
  } 


  // Define different headers based on format 
  let headers: string[]; 
  let data: any[][]; 


  if (format === 'pdf') { 
   // PDF format - exclude Description and Cuisine Type 
   headers = [ 
    'Menu Item', 
    'Restaurant Name',  
    'Price', 
    'Distance (miles)', 
    'Menu Section', 
    'Restaurant Type', 
    'Address', 
    'Category', 
    'Restaurant Source', 
   ]; 
   data = this.rolelist.map(item => [ 
    item.menu_item_name || '', 
    item.restaurant_name || '', 
    this.formatPrice(item.price), 
    this.formatDistance(item.distance_from_zipcode), 
    item.menu_section || '', 
    this.formatRestaurantType(item.restaurant_type), 
    item.address || '', 
    item.standardized_category || '', 
    this.formatRestaurantSource(item.restaurant_source), 
   ]); 
  } else { 
   // CSV and Excel formats - include all columns 
   headers = [ 
    'Menu Item', 
    'Restaurant Name',  
    'Price', 
    'Distance (miles)', 
    'Description', 
    'Menu Section', 
    'Cuisine Type', 
    'Restaurant Type', 
    'Address', 
    'Category', 
    'Restaurant Source', 
   ]; 
   data = this.rolelist.map(item => [ 
    item.menu_item_name || '', 
    item.restaurant_name || '', 
    this.formatPrice(item.price), 
    this.formatDistance(item.distance_from_zipcode), 
    item.description || '', 
    item.menu_section || '', 
    item.cuisine_type || '', 
    this.formatRestaurantType(item.restaurant_type), 
    item.address || '', 
    item.standardized_category || '', 
    this.formatRestaurantSource(item.restaurant_source), 
   ]); 
  } 


  const fileName = `menu-comparison-${new Date().toISOString().split('T')[0]}`; 
  switch (format) { 
   case 'csv': 
    this.exportToCSV(headers, data, fileName); 
    break; 
   case 'xlsx': 
    this.exportToXLSX(headers, data, fileName); 
    break; 
   case 'pdf': 
    this.exportToPDF(headers, data, fileName); 
    break; 
  } 
 } 


 private exportToPDF(headers: string[], data: any[][], fileName: string): void { 
  const jsPDFScript = document.createElement('script'); 
  jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; 
  jsPDFScript.async = true; 
  jsPDFScript.onload = () => { 
   const autoTableScript = document.createElement('script'); 
   autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'; 
   autoTableScript.async = true; 
   autoTableScript.onload = () => { 
    const { jsPDF } = (window as any).jspdf; 
    const doc = new jsPDF(); 


    // Add Legal Disclaimer at the top 
    doc.setFontSize(14); 
    doc.text('Legal Disclaimer', 14, 15); 


    doc.setFontSize(8); 
    const disclaimerLines = this.LEGAL_DISCLAIMER.split('\n'); 
    let yPosition = 25; 


    disclaimerLines.forEach(line => { 
     if (line.trim() === '') { 
      yPosition += 4; // Add space for empty lines 
     } else { 
      const splitText = doc.splitTextToSize(line, 180); 
      doc.text(splitText, 14, yPosition); 
      yPosition += splitText.length * 3; 
     } 
    }); 


    // Add some space before the report content 
    yPosition += 10; 


    // Add report title and date 
    doc.setFontSize(16); 
    doc.text('Menu Price Comparison', 14, yPosition); 
    yPosition += 10; 


    doc.setFontSize(10); 
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, yPosition); 
    yPosition += 10; 


    // Add the data table 
    (doc as any).autoTable({ 
     head: [headers], 
     body: data, 
     startY: yPosition, 
     theme: 'grid', 
     styles: { fontSize: 8, cellPadding: 2 }, 
     headStyles: { fillColor: [66, 139, 202], textColor: 255 }, 
     columnStyles: { 2: { halign: 'right' } } 
    }); 


    doc.save(`${fileName}.pdf`); 
   }; 
   autoTableScript.onerror = () => { 
    alert('Failed to load PDF export library. Please try CSV format instead.'); 
   }; 
   document.body.appendChild(autoTableScript); 
  }; 
  jsPDFScript.onerror = () => { 
   alert('Failed to load PDF export library. Please try CSV format instead.'); 
  }; 
  document.body.appendChild(jsPDFScript); 
 } 


 private initializeRanges(results: IRole[]): void { 
  if (results && results.length > 0) { 
   const prices = results.map(item => parseFloat(item.price?.toString() || '0')).filter(p => !isNaN(p)); 
   const distances = results.map(item => parseFloat(item.distance_from_zipcode?.toString() || '0')).filter(d => !isNaN(d)); 


   if (prices.length > 0) { 
    this.priceRange = { 
     min: Math.min(...prices), 
     max: Math.max(...prices) 
    }; 
    // Update form controls to match the actual data range 
    this.myForm.patchValue({ 
     minPrice: this.priceRange.min, 
     maxPrice: this.priceRange.max 
    }); 
   } 


   if (distances.length > 0) { 
    this.distanceRange = { 
     min: Math.min(...distances), 
     max: Math.max(...distances) 
    }; 
    // Update form controls to match the actual data range 
    this.myForm.patchValue({ 
     minDistance: this.distanceRange.min, 
     maxDistance: this.distanceRange.max 
    }); 
   } 
  } 
 } 






 // Add new methods for sidebar category filter 
 toggleSidebarCategoryFilter() { 
  this.showSidebarCategoryFilter = !this.showSidebarCategoryFilter; 
  if (this.showSidebarCategoryFilter) { 
   this.onCategorySearchChange(); 
  } 
 } 


 applySidebarCategoryFilter() { 
  this.showSidebarCategoryFilter = false; 
  // Trigger a new search with updated categories 
  if (this.hasSearched) { 
   this.onSubmit(); 
  } 
 } 


 getAvailableCategoriesForSidebar(): string[] { 
  // Return all available categories 
  return this.availableCategories; 
 } 


 unlockAddress() { 
  // Prevent unlocking if location has been confirmed for anonymous users 
  if (this.isAnonymousUser && this.anonymousLocationConfirmed) { 
   return; // Do nothing - address cannot be changed once confirmed 
  } 


  this.isAddressLocked = false; 
  this.anonymousLocationConfirmed = false; 
  this.selectedAddress = null; 
  this.selectedMapboxAddress = null; 
  this.showAddressSuggestions = false; 
  this.addressSuggestions = []; 
  this.myForm.patchValue({ 
   address: '', 
   zipCode: '' 
  }); 
 } 


 onAddressInput(event: Event) { 
  const target = event.target as HTMLInputElement; 
  const value = target.value; 


  // Prevent changes if location is confirmed for anonymous users 
  if (this.isAnonymousUser && this.anonymousLocationConfirmed) { 
   // Restore the original value 
   if (this.selectedAddress) { 
    target.value = this.selectedAddress.place_name; 
   } 
   return; 
  } 


  // Reset address selection state when user types 
  if (!this.addressSelectionInProgress) { 
   this.selectedAddress = null; 
   this.selectedMapboxAddress = null; 
   this.anonymousLocationConfirmed = false; 
   this.isAddressLocked = false; 
  } 


  // The setupAddressAutocomplete method will handle the debounced search 
  // This method is just for immediate UI state updates 
 } 


 trackBySuggestion(index: number, suggestion: MapboxFeature): string { 
  return suggestion.id; 
 } 
} 
// Removed AppEnv import as OAuth redirect is no longer used.