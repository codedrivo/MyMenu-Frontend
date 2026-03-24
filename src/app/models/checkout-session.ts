// Interfaces for the updated create-checkout-session API

export interface CreateCheckoutSessionRequest {
  location_id: number[];
  user_email: string;
  plan_interval: 'monthly' | 'yearly';
}

export interface CreateCheckoutSessionResponse {
  status: boolean;
  url: string;
  amount: number;
  billed_location_ids: number[];
  subscription_location_ids: number[];
  skipped_active: number[];
}

export interface CheckoutSessionError {
  status: boolean;
  message: string;
  error_code?: string;
}

// For backward compatibility with existing components
export interface LegacyCheckoutSessionRequest {
  location_id: number;
  user_email: string;
  quantity: number;
  amount_override?: number;
}

// Extended interface for frontend use
export interface ExtendedCheckoutSessionRequest extends CreateCheckoutSessionRequest {
  quantity?: number;
  amount_override?: number;
}