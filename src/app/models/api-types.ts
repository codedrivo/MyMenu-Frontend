// API Types based on the documentation
export interface ApiPlanFeature {
  name: string;
  description?: string;
}

export interface ApiPricing {
  pricing_id: number;
  billing_cycle: 'MONTHLY' | 'YEARLY';
  price: number;
  stripe_price_id: string;
  discount: number;
  currency: string;
}

export interface ApiPlan {
  plan_id: number;
  plan_title: string;
  plan_description: string;
  features: ApiPlanFeature[];
  pricings: ApiPricing[];
}

export interface ApiPlansResponse {
  plans: ApiPlan[];
}

export interface ApiSubscribeRequest {
  email: string;
  pricing_id: number;
}

export interface ApiSubscribeResponse {
  checkout_url: string;
  session_id: string;
  subscription_id: number;
}

export interface ApiSubscriptionStatusRequest {
  email: string;
}

export interface ApiSubscriptionStatusResponse {
  has_subscription: boolean;
  status: 'ACTIVE' | 'NO_SUBSCRIPTION' | 'EXPIRED' | 'CANCELLED';
  is_active: boolean;
  message: string;
  valid_until: string | null;
}

// Frontend UI Types (converted from API types)
export interface UIPlan {
  id: string;
  name: string;
  title: string;
  description: string;
  features: string[];
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  discount: number;
  isCustomPricing: boolean;
  isPopular: boolean;
}

export interface UISubscriptionStatus {
  hasSubscription: boolean;
  status: string;
  isActive: boolean;
  message: string;
  validUntil: Date | null;
}

// New Payment History API Types
export interface PaymentLocation {
  // Backend PSL identifier for this location within a payment
  psl_id?: number;
  subscription_locations_id: number;
  user_location_id?: number;
  display_name: string;
  price_cents_at_payment: number;
  subloc_status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'REFUNDED' | 'PENDING';
  // Per-location refund status, mapped from `psl_refund_status`
  loc_refund_status?: 'NONE' | 'PENDING' | 'PROCESSING' | 'REFUNDED';
  current_period_end: string;
  price_cents: number;
  refunded_cents: number;
  auto_renew: boolean;
  cancel_at_period_end: boolean;
  last_invoiced_at: string | null;
}

export interface PaymentHistoryItem {
  history_id: number;
  payment_id: number;
  subscription_id: number;
  user_email: string;
  prev_status: string | null;
  new_status: string;
  // Optional subscription status from backend (e.g., 'ACTIVE')
  subscription_status?: string;
  // Optional refund status for the payment (e.g., 'NONE', 'SUCCEEDED')
  refund_status?: string;
  amount: number;
  amount_cents: number | null;
  currency: string;
  actor: string;
  reason: string;
  changed_at: string;
  metadata: any;
  locations: PaymentLocation[];
}

export interface PaymentHistoryResponse {
  status: boolean;
  data: PaymentHistoryItem[];
}

// Subscription Status Check Result
export interface SubscriptionStatusCheck {
  hasActiveSubscription: boolean;
  activeLocations: PaymentLocation[];
  allLocations: PaymentLocation[];
  latestPayment: PaymentHistoryItem | null;
}

// Refund API response (normalized to support multi-location refunds)
export interface RefundResponse {
  status: string | boolean;
  refund_status?: string; // e.g., 'REFUND_REQUESTED' | 'REFUNDED' | 'FAILED'
  message?: string;
  refund_id?: string;
  stripe_refund_id?: string;
  expected_refund_date?: string;
  payment_id?: string | number;
  subscription_id?: number;
  applies_to_all_locations?: boolean; // true when refund applies to all locations in the payment
  refunded_location_ids?: number[]; // optional list of affected locations
  refunded_count?: number; // optional convenience count
  changed_at?: string; // timestamp of refund request/processing
}