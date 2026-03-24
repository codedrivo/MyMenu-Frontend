import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { PaymentIntent, SubscriptionPlan } from '../models/subscription';
import { PaymentHistoryResponse, PaymentHistoryItem, PaymentLocation, SubscriptionStatusCheck, RefundResponse } from '../models/api-types';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private readonly backendBase = AppEnv.API_BASE_URL;
  private readonly apiUrl = `${this.backendBase}/api`;
  private stripePublishableKey = 'pk_test_your_stripe_key'; // Replace with your actual key

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    // Initialize Stripe only in the browser to avoid SSR "window is not defined"
    if (isPlatformBrowser(this.platformId)) {
      this.initializeStripe();
    }
  }

  private async initializeStripe() {
    this.stripe = await loadStripe(this.stripePublishableKey);
  }

  createPaymentIntent(data: {
    plan: SubscriptionPlan;
    customerEmail: string;
    customerName: string;
  }): Observable<PaymentIntent> {
    return this.http.post<PaymentIntent>(`${this.apiUrl}/create-payment-intent`, data);
  }

  createSubscription(data: {
    plan: SubscriptionPlan;
    customerEmail: string;
    customerName: string;
    paymentMethodId: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/create-subscription`, data);
  }

  updateSubscription(subscriptionId: string, newPlan: SubscriptionPlan): Observable<any> {
    return this.http.post(`${this.apiUrl}/update-subscription`, { subscriptionId, newPlan });
  }

  async getCurrentSubscription(): Promise<SubscriptionPlan | null> {
    try {
      const response = await fetch('/api/subscription/current', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch current subscription');
      }

      const data = await response.json();
      return data.subscription || null;
    } catch (error) {
      console.error('Error fetching current subscription:', error);
      throw error;
    }
  }

  async upgradeSubscription(tierId: string, billingCycle: 'monthly' | 'yearly'): Promise<{success: boolean, message?: string}> {
    try {
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          tierId,
          billingCycle
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upgrade subscription');
      }

      // If payment confirmation is required
      if (data.requiresPaymentConfirmation && data.clientSecret) {
        const result = await this.stripe?.confirmCardPayment(data.clientSecret);
        
        if (result?.error) {
          throw new Error(result.error.message);
        }
        
        return { success: true, message: 'Subscription upgraded successfully' };
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  async downgradeSubscription(tierId: string, billingCycle: 'monthly' | 'yearly'): Promise<{success: boolean, message?: string}> {
    try {
      const response = await fetch('/api/subscription/downgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          tierId,
          billingCycle
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to downgrade subscription');
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error downgrading subscription:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  async cancelSubscription(): Promise<{success: boolean, message?: string}> {
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel subscription');
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  async reactivateSubscription(): Promise<{success: boolean, message?: string}> {
    try {
      const response = await fetch('/api/subscription/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reactivate subscription');
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  private getAuthToken(): string {
    try {
      // Guard for SSR: localStorage is only available in the browser
      if (typeof window !== 'undefined' && window?.localStorage) {
        return localStorage.getItem('authToken') || '';
      }
      return '';
    } catch {
      return '';
    }
  }

  // Create Stripe Checkout Session (Multi-location subscription)
  createCheckoutSession(request: { 
    location_id: number[] | number; 
    user_email: string; 
    plan_interval: 'monthly' | 'yearly';
    quantity?: number; 
    amount_override?: number 
  }): Observable<{
    status: boolean;
    url: string;
    amount: number;
    billed_location_ids: number[];
    subscription_location_ids: number[];
    skipped_active: number[];
    session_id?: string;
    location_name?: string;
    description?: string;
    message?: string;
  }> {
    // Convert single location_id to array for backward compatibility
    const location_ids = Array.isArray(request.location_id) ? request.location_id : [request.location_id];
    
    const payload = {
      location_id: location_ids,
      user_email: request.user_email,
      plan_interval: request.plan_interval
    };

    return this.http.post<{
      status: boolean;
      url: string;
      amount: number;
      billed_location_ids: number[];
      subscription_location_ids: number[];
      skipped_active: number[];
      session_id?: string;
      location_name?: string;
      description?: string;
      message?: string;
    }>(`${this.apiUrl}/create-checkout-session`, payload);
  }

  // Handle Payment Success
  paymentSuccess(sessionId: string): Observable<{
    status: string;
    message: string;
    subscription_id?: number;
  }> {
    const url = `${this.backendBase}/subscription/success`;
    const params = new HttpParams().set('session_id', sessionId);
    return this.http.get<{ status: string; message: string; subscription_id?: number }>(url, { params });
  }

  // Handle Payment Cancellation
  paymentCancel(sessionId: string): Observable<{
    status: string;
    message: string;
    subscription_id?: number;
  }> {
    const url = `${this.backendBase}/subscription/cancel`;
    const params = new HttpParams().set('session_id', sessionId);
    return this.http.get<{ status: string; message: string; subscription_id?: number }>(url, { params });
  }

  // Get User Payments (Updated for new API structure)
  getUserPayments(userEmail: string): Observable<PaymentHistoryResponse> {
    const params = new HttpParams().set('user_email', userEmail);
    return this.http.get<PaymentHistoryResponse>(`${this.apiUrl}/user/payments`, { params }).pipe(
      // Normalize differing backend field names to our expected model
      map((resp: any) => {
        if (!resp || !resp.data) return resp as PaymentHistoryResponse;

        const normalizedData = resp.data.map((p: any) => {
          const normalizedLocations = (p.locations || []).map((loc: any) => ({
            // PSL and subscription location identifiers
            psl_id: typeof loc.psl_id === 'number' ? loc.psl_id : undefined,
            subscription_locations_id: Number(loc.subscription_locations_id),
            // Optional user location id if backend provides direct mapping
            user_location_id: typeof loc.user_location_id === 'number' ? loc.user_location_id : undefined,
            // Normalize name/address
            display_name: String(loc.location_name ?? loc.display_name ?? ''),
            // Amounts at time of payment and convenience field
            price_cents_at_payment: Number(loc.price_cents_at_payment ?? loc.price_cents ?? 0),
            price_cents: Number(loc.price_cents ?? loc.price_cents_at_payment ?? 0),
            refunded_cents: Number(loc.refunded_cents ?? 0),
            // Prefer new field names from API, fallback to older ones
            subloc_status: String(
              (loc.psl_payment_status ?? loc.subloc_status ?? loc.status_current ?? loc.status ?? '')
            ).toUpperCase() as PaymentLocation['subloc_status'],
            // Per-location refund status
            loc_refund_status: loc.psl_refund_status
              ? String(loc.psl_refund_status).toUpperCase()
              : undefined,
            current_period_end: String(loc.current_period_end ?? ''),
            auto_renew: Boolean(loc.auto_renew ?? false),
            cancel_at_period_end: Boolean(loc.cancel_at_period_end ?? false),
            last_invoiced_at: loc.last_invoiced_at ?? null,
          }));

          return {
            history_id: Number(p.history_id ?? 0),
            payment_id: Number(p.payment_id),
            subscription_id: Number(p.subscription_id),
            user_email: String(p.user_email ?? ''),
            prev_status: p.prev_status ? String(p.prev_status).toUpperCase() : null,
            // Use payment status for new_status, not refund_status
            new_status: String(p.status ?? p.new_status ?? '').toUpperCase(),
            // Keep refund_status separately
            refund_status: p.refund_status ? String(p.refund_status).toUpperCase() : undefined,
            // Preserve subscription_status when provided
            subscription_status: p.subscription_status ? String(p.subscription_status).toUpperCase() : undefined,
            amount: Number(p.amount ?? 0),
            amount_cents: typeof p.amount_cents === 'number' ? p.amount_cents : null,
            currency: String(p.currency ?? 'usd'),
            actor: String(p.actor ?? ''),
            reason: String(p.reason ?? ''),
            // Support both `changed_at` and legacy `payment_date`
            changed_at: p.changed_at ?? p.payment_date ?? '',
            metadata: p.metadata ?? {},
            locations: normalizedLocations,
          } as PaymentHistoryItem;
        });

        return { ...resp, data: normalizedData } as PaymentHistoryResponse;
      })
    );
  }

  // Check subscription status based on active locations
  checkSubscriptionStatus(userEmail: string): Observable<SubscriptionStatusCheck> {
    return this.getUserPayments(userEmail).pipe(
      map((response: PaymentHistoryResponse) => {
        if (!response.status || !response.data || response.data.length === 0) {
          return {
            hasActiveSubscription: false,
            activeLocations: [],
            allLocations: [],
            latestPayment: null
          };
        }

        // Get all locations from all payment history items
        const allLocations: PaymentLocation[] = [];
        const activeLocations: PaymentLocation[] = [];
        
        // Find the latest payment with locations
        let latestPayment: PaymentHistoryItem | null = null;
        let latestDateMs = 0;

        response.data.forEach(payment => {
          if (payment.locations && payment.locations.length > 0) {
            // Check if this is the latest payment
            const changeDateStr = payment.changed_at ?? (payment as any).payment_date ?? '';
            const changeDate = new Date(changeDateStr);
            if (!isNaN(changeDate.getTime()) && changeDate.getTime() > latestDateMs) {
              latestDateMs = changeDate.getTime();
              latestPayment = payment;
            }

            payment.locations.forEach(location => {
              // Add to all locations if not already present
              const existingLocation = allLocations.find(
                loc => loc.subscription_locations_id === location.subscription_locations_id
              );
              if (!existingLocation) {
                allLocations.push(location);
              }

              // Add to active locations if status is ACTIVE
              const status = (location as any).subloc_status ?? (location as any).status_current ?? (location as any).status;
              if (String(status).toUpperCase() === 'ACTIVE') {
                const existingActiveLocation = activeLocations.find(
                  loc => loc.subscription_locations_id === location.subscription_locations_id
                );
                if (!existingActiveLocation) {
                  activeLocations.push(location);
                }
              }
            });
          }
        });

        return {
          hasActiveSubscription: activeLocations.length > 0,
          activeLocations,
          allLocations,
          latestPayment
        };
      })
    );
  }

  // Get active locations for a user
  getActiveLocations(userEmail: string): Observable<PaymentLocation[]> {
    return this.checkSubscriptionStatus(userEmail).pipe(
      map(status => status.activeLocations)
    );
  }

  // Download receipt as a Blob via backend base to avoid proxy mismatch
  getReceipt(subscriptionId: string): Observable<Blob> {
    // Prefer calling the same backend base used for other payment APIs
    return this.http.get(`${this.apiUrl}/receipt/${subscriptionId}`, { responseType: 'blob' });
  }

  // Request Refund (supports multi-location refunds on a single payment)
  refundPayment(paymentId: number, subscriptionLocationIds?: number[]): Observable<RefundResponse> {
    const payload: any = { payment_id: String(paymentId) };
    if (Array.isArray(subscriptionLocationIds) && subscriptionLocationIds.length > 0) {
      payload.subscription_location_ids = subscriptionLocationIds;
    }

    return this.http.post<RefundResponse>(
      `${this.apiUrl}/refund`,
      payload
    ).pipe(
      map((resp: any) => {
        if (!resp) return resp as RefundResponse;

        const refundedIds: number[] = Array.isArray(resp.refunded_location_ids)
          ? resp.refunded_location_ids
              .map((x: any) => Number(x))
              .filter((n: number) => !isNaN(n))
          : [];
        const refundStatus = String(resp.refund_status ?? resp.status ?? '').toUpperCase();
        const appliesAllRaw = resp.applies_to_all_locations;
        const appliesAll = typeof appliesAllRaw === 'boolean'
          ? appliesAllRaw
          : (refundedIds.length === 0 ? true : undefined);

        const normalized: RefundResponse = {
          ...resp,
          refund_status: refundStatus,
          refunded_location_ids: refundedIds.length ? refundedIds : resp.refunded_location_ids,
          applies_to_all_locations: appliesAll === undefined ? true : appliesAll,
          refunded_count: typeof resp.refunded_count === 'number' ? resp.refunded_count : (refundedIds.length || undefined),
          expected_refund_date: resp.expected_refund_date,
          stripe_refund_id: resp.stripe_refund_id,
        };
        return normalized;
      })
    );
  }
}
import { AppEnv } from '../config/env';