import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ServiceTier, SubscriptionPlan, PaymentIntent, SubscriptionResponse } from '../model/interface/subscription';
import { AppEnv } from '../config/env';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private apiUrl = `${AppEnv.API_BASE_URL}/api`; // Replace with your backend URL

  constructor(private http: HttpClient) {}

  getServiceTiers(): ServiceTier[] {
    return [
      {
        id: 'basic',
        name: 'basic',
        displayName: 'Basic Tier',
        description: 'Essential Insights',
        monthlyPrice: 150,
        yearlyPrice: 1530,
        yearlyDiscount: 15,
        features: [
          'Comp Set Identification: Instantly identifies relevant competitor restaurants based on your geography, type, cuisine, and key services offered',
          'Market Trend Analysis: Uncover pricing and menu trends using 1 year of real market data',
          'Easy-to-Use Dashboard: Access all insights via a user-friendly dashboard'
        ],
        stripePriceIdMonthly: 'price_basic_monthly',
        stripePriceIdYearly: 'price_basic_yearly'
      },
      {
        id: 'pro',
        name: 'pro',
        displayName: 'Pro Tier',
        description: 'AI-Powered Analytics',
        monthlyPrice: 0,
        yearlyPrice: 0,
        yearlyDiscount: 0,
        isCustomPricing: true,
        isPopular: true,
        features: [
          'Everything in Basic, plus:',
          'AI-Driven Sales & Margin Analysis: See projected sales and margin impacts of your pricing decisions',
          'Customer Traffic Insights: Understand how pricing changes may affect customer footfall and behavior',
          'Forecasting: Predict future sales and margin performance based on current and historical trends',
          'Automated Recommendations: AI-generated actionable suggestions for pricing optimization'
        ]
      },
      {
        id: 'enterprise',
        name: 'enterprise',
        displayName: 'Enterprise Tier',
        description: 'Strategic Operations & Supply Chain',
        monthlyPrice: 0,
        yearlyPrice: 0,
        yearlyDiscount: 0,
        isCustomPricing: true,
        features: [
          'Everything in Pro, plus:',
          'Cost & Supply Chain Impact Analysis: Analyze how ingredient costs, supplier pricing, and logistics affect menu profitability',
          'Custom Data Integration: Integrate with your POS, supplier, or inventory systems for end-to-end visibility',
          'Advanced Reporting: Access tailored reports for multi-unit operators, CFOs, and supply chain managers',
          'Dedicated Account Support: Priority onboarding, training, and ongoing consultative support'
        ]
      }
    ];
  }

  createPaymentIntent(plan: SubscriptionPlan): Observable<PaymentIntent> {
    return this.http.post<PaymentIntent>(`${this.apiUrl}/create-payment-intent`, {
      priceId: plan.stripePriceId,
      tier: plan.tier.id,
      billingCycle: plan.billingCycle
    });
  }

  createSubscription(paymentMethodId: string, plan: SubscriptionPlan): Observable<SubscriptionResponse> {
    return this.http.post<SubscriptionResponse>(`${this.apiUrl}/create-subscription`, {
      paymentMethodId,
      priceId: plan.stripePriceId,
      tier: plan.tier.id,
      billingCycle: plan.billingCycle
    });
  }

  requestCustomQuote(tier: string, requirements: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/request-quote`, {
      tier,
      requirements
    });
  }
}