export interface ServiceTier {
  id: string;
  name: string;
  level: number; // 1 = Basic, 2 = Pro, 3 = Enterprise
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  description: string;
  isPopular?: boolean;
  customPricing?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  userId: string;
  tierId: string;
  tierName: string;
  status: SubscriptionStatus;
  billingCycle: 'monthly' | 'yearly';
  price: number;
  currency: string;
  startDate: Date;
  endDate?: Date;
  nextBillingDate?: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'unpaid' | 'incomplete' | 'trialing' | 'inactive';

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  subscriptionId?: string;
  error?: string;
}