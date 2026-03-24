import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../auth.service';
import { PaymentService } from '../../../../services/payment.service';
import { ProfileService, UserProfileDetails, UserLocation, AddLocationRequest, AddUserLocationsRequest, UpdateLocationStatusRequest } from '../../../../services/profile.service';
import { PaymentHistoryItem, PaymentHistoryResponse } from '../../../../models/api-types';

interface UserStatusFull {
  user_id: number;
  email: string;
  user_name: string;
  free_tier_user: boolean;
  search_count: number;
  search_count_exceeded: boolean;
}



interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
  context?: Array<{ id: string; text: string; short_code?: string }>;
}

interface MapboxResponse { 
  features: MapboxFeature[] 
}

@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.css']
})
export class MyAccountComponent implements OnInit {
  // Profile & status
  userId?: number;
  userEmail?: string;
  userName?: string;
  isFreeTierUser = true;
  searchCount = 0;
  readonly FREE_TIER_LIMIT = 10;
  searchesRemaining: number | null = null;

  // Profile details and locations
  userProfileDetails?: UserProfileDetails;
  userLocations: UserLocation[] = [];
  profileLoading = false;
  profileError: string | null = null;

  // Add location form
  showAddLocationForm = false;
  newLocation: AddLocationRequest = {
    zip_or_postal_code: '',
    latitude: '',
    longitude: '',
    location: '',
    restaurant_name: '',
    city: '',
    state: '',
    distance_from_zip_code: '0'
  };
  addingLocation = false;
  addLocationError: string | null = null;

  // Mapbox integration
  mapboxApiKey = 'pk.eyJ1IjoidmFzdXM5IiwiYSI6ImNtZXI3dmI5aTAzbWEybG9wcWdxeGh3cHkifQ.o1hKCj77fSd5GDDvFudIUA';
  addressSuggestions: MapboxFeature[] = [];
  showAddressSuggestions = false;
  selectedAddress: MapboxFeature | null = null;
  addressInput = '';

  // Refund window constants
  readonly REFUND_WINDOW_HOURS = 96;
  readonly REFUND_WINDOW_DAYS = 4;

  // Payment history
  payments: PaymentHistoryItem[] = [];
  paymentsLoading = false;
  paymentsError: string | null = null;
  // Track active subscription locations by user_location_id from payments API
  activeUserLocationIds: Set<number> = new Set();
  // Track active subscription locations by normalized address/name for fallback matching
  activeLocationNames: Set<string> = new Set();

  // Refund form state per payment
  refundForms: Record<number, { reason: string; submitting: boolean; error: string | null; success: string | null }> = {};
  refundNotices: Record<number, string> = {};

  statusLoading = false;
  statusError: string | null = null;

  constructor(
    private authService: AuthService, 
    private paymentService: PaymentService, 
    private location: Location,
    private profileService: ProfileService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAccount();
  }

  get pageLoading(): boolean {
    return this.paymentsLoading || this.statusLoading || this.profileLoading;
  }

  private loadAccount(): void {
    const email = this.authService.getUserEmail();
    if (!email) {
      this.statusError = 'No user email found. Please sign in again.';
      return;
    }
    this.userEmail = email;
    // First: fetch payments
    this.paymentsLoading = true;
    this.paymentsError = null;
    this.paymentService.getUserPayments(email).subscribe({
      next: (response: PaymentHistoryResponse) => {
        this.payments = (response.status && response.data) ? response.data : [];
        // Build active location cache from payments
        this.activeUserLocationIds.clear();
        this.activeLocationNames.clear();
        this.payments.forEach(p => {
          (p.locations || []).forEach(loc => {
            const status = String(loc.subloc_status || '').toUpperCase();
            if (status === 'ACTIVE' && typeof loc.user_location_id === 'number') {
              this.activeUserLocationIds.add(loc.user_location_id);
            }
            if (status === 'ACTIVE') {
              const name = this.normalizeAddress(String((loc as any).display_name || (loc as any).location_name || ''));
              if (name) this.activeLocationNames.add(name);
            }
          });
        });
        this.paymentsLoading = false;
        // Then: fetch full user status for profile and counters
        this.fetchUserStatus(email);
      },
      error: (err) => {
        console.error('Failed to fetch payments', err);
        this.paymentsError = 'Unable to fetch payments.';
        this.paymentsLoading = false;
        // Fallback: still fetch status to show free tier info
        this.fetchUserStatus(email);
      }
    });
  }

  private fetchUserStatus(email: string): void {
    this.statusLoading = true;
    this.authService.checkUserStatusFull(email).subscribe({
      next: (status: UserStatusFull) => {
        this.userId = status.user_id;
        this.userEmail = status.email || email;
        this.userName = status.user_name;
        this.searchCount = status.search_count ?? 0;
        // Evaluate subscription state from payments list
        const hasActiveSubscriptionFromPayments = this.payments.some(p =>
          p.subscription_status === 'ACTIVE' || (p.locations || []).some(l => String(l.subloc_status).toUpperCase() === 'ACTIVE')
        );
        const hasSucceededPayment = this.payments.some(p => p.new_status === 'SUCCEEDED');
        const hasPendingPayment = this.payments.some(p => p.new_status === 'PENDING');
        if (hasActiveSubscriptionFromPayments) {
          this.isFreeTierUser = false;
        } else if (hasSucceededPayment) {
          // Succeeded payment but no active sub reported in payments
          this.isFreeTierUser = false;
        } else if (hasPendingPayment) {
          // Pending payment: treat as Free Tier
          this.isFreeTierUser = true;
        } else {
          // No qualifying payments or none available: use backend free tier flag
          this.isFreeTierUser = !!status.free_tier_user;
        }
        this.searchesRemaining = this.isFreeTierUser ? Math.max(0, this.FREE_TIER_LIMIT - this.searchCount) : null;
        this.statusLoading = false;
        
        // Load profile details after user status is loaded
        if (this.userId) {
          this.loadProfileDetails(this.userId);
        }
      },
      error: (err) => {
        console.error('Failed to load account status', err);
        this.statusError = 'Failed to load account status.';
        this.statusLoading = false;
      }
    });
  }

  private loadPayments(userEmail: string): void {
    this.paymentsLoading = true;
    this.paymentsError = null;
    this.paymentService.getUserPayments(userEmail).subscribe({
      next: (response: PaymentHistoryResponse) => {
        this.payments = (response.status && response.data) ? response.data : [];
        // Rebuild active location cache
        this.activeUserLocationIds.clear();
        this.activeLocationNames.clear();
        this.payments.forEach(p => {
          (p.locations || []).forEach(loc => {
            const status = String(loc.subloc_status || '').toUpperCase();
            if (status === 'ACTIVE' && typeof loc.user_location_id === 'number') {
              this.activeUserLocationIds.add(loc.user_location_id);
            }
            if (status === 'ACTIVE') {
              const name = this.normalizeAddress(String((loc as any).display_name || (loc as any).location_name || ''));
              if (name) this.activeLocationNames.add(name);
            }
          });
        });
        this.paymentsLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch payments', err);
        this.paymentsError = 'Unable to fetch payments.';
        this.paymentsLoading = false;
      }
    });
  }

  showRefundForm(paymentId: number): void {
    if (!this.refundForms[paymentId]) {
      this.refundForms[paymentId] = { reason: '', submitting: false, error: null, success: null };
    }
  }

  cancelRefund(paymentId: number): void {
    if (this.refundForms[paymentId]) {
      delete this.refundForms[paymentId];
    }
  }

  isWithinRefundWindow(p: PaymentHistoryItem): boolean {
    try {
      const paidAt = new Date(p.changed_at);
      if (isNaN(paidAt.getTime())) {
        // fallback if date isn't parseable
        const hasActiveLocation = Array.isArray(p.locations) && p.locations.some(l => String(l.subloc_status).toUpperCase() === 'ACTIVE');
        return p.new_status === 'SUCCEEDED' && hasActiveLocation;
      }
      const diffMs = Date.now() - paidAt.getTime();
      const diffHours = diffMs / 36e5;
      const hasActiveLocation = Array.isArray(p.locations) && p.locations.some(l => String(l.subloc_status).toUpperCase() === 'ACTIVE');
      return diffHours <= this.REFUND_WINDOW_HOURS && p.new_status === 'SUCCEEDED' && hasActiveLocation;
    } catch {
      const hasActiveLocation = Array.isArray(p.locations) && p.locations.some(l => String(l.subloc_status).toUpperCase() === 'ACTIVE');
      return p.new_status === 'SUCCEEDED' && hasActiveLocation;
    }
  }

  async submitRefund(payment: PaymentHistoryItem): Promise<void> {
    const form = this.refundForms[payment.payment_id];
    if (!form) {
      this.refundForms[payment.payment_id] = { reason: '', submitting: false, error: null, success: null };
    }
    form.submitting = true;
    form.error = null;
    form.success = null;
    try {
      // Include subscription location IDs to support per-location refunds when backend expects them
      const locationIds = Array.isArray(payment.locations)
        ? payment.locations.map(l => Number(l.subscription_locations_id)).filter(n => !isNaN(n))
        : [];
      const resp = await this.paymentService.refundPayment(payment.payment_id, locationIds).toPromise();
      // Show processing notice (multi-location refunds supported)
      const count = (resp && typeof resp.refunded_count === 'number') ? resp.refunded_count : (Array.isArray(resp?.refunded_location_ids) ? resp!.refunded_location_ids!.length : undefined);
      const appliesAll = resp?.applies_to_all_locations ?? (count === undefined);
      const baseMsg = appliesAll
        ? 'The refund for all locations on this payment is being processed.'
        : `The refund is being processed for ${count} location(s) on this payment.`;
      const refMsg = resp?.refund_id ? ` Reference: ${resp.refund_id}.` : '';
      this.refundNotices[payment.payment_id] = `${baseMsg} You should see the amount in your payment account within 2–3 business days.${refMsg}`;
      delete this.refundForms[payment.payment_id];
      // Refresh payments to reflect refund status update
      if (this.userEmail) {
        this.loadPayments(this.userEmail);
      }
      // Navigate to refund transaction page with details
      this.router.navigate(['/refund-result'], {
        queryParams: {
          status: resp?.status === true || resp?.status === 'true' || resp?.status === 'success',
          refund_status: resp?.refund_status || 'processing',
          message: resp?.message || 'Your refund request has been submitted.',
          expected_refund_date: resp?.expected_refund_date || '',
          refund_id: resp?.refund_id || '',
          stripe_refund_id: resp?.stripe_refund_id || '',
          payment_id: payment.payment_id
        }
      });
    } catch (err: any) {
      console.error('Refund request failed', err);
      // Surface backend error details when available (e.g., Stripe errors)
      const backendMsg = err?.error?.detail || err?.error?.message;
      form.error = backendMsg || err?.message || 'Refund request failed.';
      form.submitting = false;
    }
  }

  formatAmount(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
    } catch {
      return `$${amount}`;
    }
  }
  goBack(): void {
    this.location.back();
  }

  // Profile Details Methods
  private loadProfileDetails(userId: number): void {
    this.profileLoading = true;
    this.profileError = null;
    
    this.profileService.getUserProfileDetails(userId).subscribe({
      next: (profileDetails) => {
        this.userProfileDetails = profileDetails;
        const rawLocations = profileDetails.user_locations || [];
        this.userLocations = this.dedupeUserLocations(rawLocations);
        this.profileLoading = false;
      },
      error: (err) => {
        console.error('Failed to load profile details', err);
        this.profileError = 'Failed to load profile details.';
        this.profileLoading = false;
      }
    });
  }

  // Determine if a location currently has an active subscription
  hasActiveSubscription(loc: UserLocation): boolean {
    const uid = Number((loc as any).user_location_id);
    if (!isNaN(uid) && this.activeUserLocationIds.has(uid)) {
      return true;
    }
    // Match by normalized address/name strictly from payments-derived active cache
    const nameKey = this.normalizeAddress(loc.location || '');
    if (nameKey && this.activeLocationNames.has(nameKey)) {
      return true;
    }
    // Do not fall back to profile subscription dates; rely on payments for accuracy
    return false;
  }

  // Navigate to multi-location payment, preselecting this location
  navigateToPaymentForLocation(loc: UserLocation): void {
    this.router.navigate(['/multi-location-payment'], {
      queryParams: { preselect: loc.user_location_id }
    });
  }

  // De-duplicate locations: if duplicates exist, prefer the one with an active subscription
  private dedupeUserLocations(locations: UserLocation[]): UserLocation[] {
    const byKey = new Map<string, UserLocation[]>();
    const makeKey = (l: UserLocation) => {
      const name = (l.restaurant_name || '').trim().toLowerCase();
      const zip = (l.zip_or_postal_code || '').trim().toLowerCase();
      const city = (l.city || '').trim().toLowerCase();
      const state = (l.state || '').trim().toLowerCase();
      // Use address tuple as identity to catch duplicates across user_location_id
      return `${name}|${zip}|${city}|${state}`;
    };

    for (const l of locations) {
      const key = makeKey(l);
      const arr = byKey.get(key) || [];
      arr.push(l);
      byKey.set(key, arr);
    }

    const result: UserLocation[] = [];
    for (const group of byKey.values()) {
      // Pick any with active subscription first
      const active = group.find(g => this.hasActiveSubscription(g));
      if (active) {
        result.push(active);
      } else {
        // Otherwise, pick the first one
        result.push(group[0]);
      }
    }
    return result;
  }

  // Show note when there are active locations without an active subscription
  hasUnsubscribedActiveLocations(): boolean {
    return this.userLocations.some(loc => loc.is_active && !this.hasActiveSubscription(loc));
  }

  // Location Management Methods
  toggleAddLocationForm(): void {
    this.showAddLocationForm = !this.showAddLocationForm;
    if (!this.showAddLocationForm) {
      this.resetNewLocationForm();
    }
  }

  private resetNewLocationForm(): void {
    this.newLocation = {
      zip_or_postal_code: '',
      latitude: '',
      longitude: '',
      location: '',
      restaurant_name: '',
      city: '',
      state: '',
      distance_from_zip_code: '0'
    };
    this.addLocationError = null;
    this.selectedAddress = null;
    this.addressInput = '';
    this.addressSuggestions = [];
    this.showAddressSuggestions = false;
  }

  // Mapbox address autocomplete methods
  onAddressInput(value: string): void {
    this.addressInput = value;
    if (!value || value.trim().length < 3) {
      this.addressSuggestions = [];
      this.showAddressSuggestions = false;
      this.selectedAddress = null;
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
    this.addressInput = address.place_name;
    this.showAddressSuggestions = false;
    this.addressSuggestions = [];

    // Auto-populate form fields
    const lat = address.center[1];
    const lng = address.center[0];
    const zip = this.extractPostalCode(address);
    const city = this.extractCity(address);
    const state = this.extractState(address);

    this.newLocation.location = address.place_name;
    this.newLocation.latitude = String(lat);
    this.newLocation.longitude = String(lng);
    this.newLocation.zip_or_postal_code = zip;
    this.newLocation.city = city;
    this.newLocation.state = state;
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

  addLocation(): void {
    if (!this.userId) {
      this.addLocationError = 'User ID not found.';
      return;
    }

    // Basic validation
    if (!this.newLocation.restaurant_name) {
      this.addLocationError = 'Please enter a restaurant name.';
      return;
    }

    if (!this.selectedAddress) {
      this.addLocationError = 'Please select a valid address from the suggestions.';
      return;
    }

    if (!this.newLocation.location || !this.newLocation.zip_or_postal_code) {
      this.addLocationError = 'Please select a complete address with postal code.';
      return;
    }

    this.addingLocation = true;
    this.addLocationError = null;

    const request: AddUserLocationsRequest = {
      user_id: this.userId,
      locations: [this.newLocation]
    };

    this.profileService.addUserLocations(request).subscribe({
      next: (response) => {
        // console.log('Location added successfully:', response);
        this.addingLocation = false;
        this.showAddLocationForm = false;
        this.resetNewLocationForm();
        
        // Reload profile details to show the new location
        this.loadProfileDetails(this.userId!);
      },
      error: (err) => {
        console.error('Failed to add location', err);
        this.addLocationError = err?.error?.message || 'Failed to add location.';
        this.addingLocation = false;
      }
    });
  }

  toggleLocationStatus(location: UserLocation): void {
    if (!this.userId) {
      console.error('User ID not found');
      return;
    }

    const request: UpdateLocationStatusRequest = {
      user_id: this.userId,
      location_id: location.user_location_id,
      status: !location.is_active
    };

    this.profileService.updateLocationStatus(request).subscribe({
      next: (response) => {
        // console.log('Location status updated:', response);
        // Update the local location status
        location.is_active = response.status;
      },
      error: (err) => {
        console.error('Failed to update location status', err);
        // You might want to show an error message to the user
      }
    });
  }

  // Normalize address strings for robust comparison
  private normalizeAddress(str: string): string {
    return String(str)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .trim();
  }

  // Map refund status to badge classes
  getRefundBadgeClass(status: string | undefined | null): string {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200';
      case 'PROCESSING':
        return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
      case 'REFUNDED':
      case 'SUCCEEDED':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
      case 'PARTIAL_REFUNDED':
        return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';
      case 'NONE':
      default:
        return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
    }
  }
}