export interface ServiceTier {
  id: string;
  name: string;
  displayName: string;
  description: string;
  features: string[];
  pricing: {
    monthly: number;
    yearly: number;
    yearlyDiscount?: number;
    firstMonthFree?: boolean;
    customPricing?: boolean;
  };
  popular?: boolean;
  stripePriceId?: {
    monthly: string;
    yearly: string;
  };
}

export interface SubscriptionPlan {
  tierId: string;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  stripePriceId: string;
}

export interface PaymentIntent {
  clientSecret: string;
  amount: number;
  currency: string;
  subscriptionId?: string;
}