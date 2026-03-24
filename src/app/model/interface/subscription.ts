export interface ServiceTier {
  id: string;
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyDiscount: number;
  features: string[];
  isPopular?: boolean;
  isCustomPricing?: boolean;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

export interface SubscriptionPlan {
  tier: ServiceTier;
  billingCycle: 'monthly' | 'yearly';
  price: number;
  stripePriceId: string;
}

export interface PaymentIntent {
  clientSecret: string;
  amount: number;
  currency: string;
}

export interface SubscriptionResponse {
  success: boolean;
  subscriptionId?: string;
  clientSecret?: string;
  error?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  tierId: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}