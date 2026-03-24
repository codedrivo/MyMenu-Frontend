import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { 
  ApiPlansResponse, 
  ApiSubscribeRequest, 
  ApiSubscribeResponse, 
  ApiSubscriptionStatusRequest, 
  ApiSubscriptionStatusResponse,
  UIPlan 
} from '../models/api-types';

@Injectable({
  providedIn: 'root'
})
export class MockApiService {
  
  // Mock data matching the API documentation
  private mockPlansResponse: ApiPlansResponse = {
    plans: [
      {
        plan_id: 1,
        plan_title: "Basic Tier – Essential Insights",
        plan_description: "Get 1 month free for first-time monthly users or 2 months free with yearly subscription. Includes unlimited menu items, no search limit, full radius.",
        features: [
          {
            name: "Comp Set Identification",
            description: "Instantly identifies relevant competitor restaurants based on your geography, type, cuisine, and key services offered"
          },
          {
            name: "Market Trend Analysis",
            description: "Uncover pricing and menu trends using 1 year of real market data."
          },
          {
            name: "Easy-to-Use Dashboard",
            description: "Access all insights via a user-friendly dashboard."
          },
          { name: "Unlimited Menu Items", description: "Add and analyze as many items as you need." },
          { name: "No Search Limit", description: "Perform unlimited searches without restrictions." },
          { name: "Full Radius", description: "Search beyond 5 miles with configurable radius." },
          { name: "Multiple Locations", description: "Add additional locations during subscription for $150 each." }
        ],
        pricings: [
          {
            pricing_id: 1,
            billing_cycle: "MONTHLY",
            price: 150.0,
            stripe_price_id: "price_1SD1Ks6G5dEA41Tdi9X6wDka",
            discount: 0.0,
            currency: "USD"
          },
          {
            pricing_id: 2,
            billing_cycle: "YEARLY",
            price: 1500.0,
            stripe_price_id: "price_1SD1Ks6G5dEA41Tdi9X6wDkb",
            discount: 16.67,
            currency: "USD"
          }
        ]
      },
      {
        plan_id: 2,
        plan_title: "Pro Tier – AI-Powered Analytics",
        plan_description: "Advanced Tier – Pricing Upon Request / Custom Pricing",
        features: [
          { name: "Everything in Basic" },
          {
            name: "AI-Driven Sales & Margin Analysis",
            description: "See projected sales and margin impacts of your pricing decisions."
          },
          {
            name: "Customer Traffic Insights",
            description: "Understand how pricing changes may affect customer footfall and behavior."
          },
          {
            name: "Forecasting",
            description: "Predict future sales and margin performance based on current and historical trends."
          },
          {
            name: "Automated Recommendations",
            description: "AI-generated actionable suggestions for pricing optimization."
          }
        ],
        pricings: []
      },
      {
        plan_id: 3,
        plan_title: "Enterprise Tier – Strategic Operations & Supply Chain",
        plan_description: "Premium Tier – Pricing Upon Request / Custom Pricing",
        features: [
          { name: "Everything in Pro" },
          {
            name: "Cost & Supply Chain Impact Analysis",
            description: "Analyze how ingredient costs, supplier pricing, and logistics affect menu profitability."
          },
          {
            name: "Custom Data Integration",
            description: "Integrate with your POS, supplier, or inventory systems for end-to-end visibility."
          },
          {
            name: "Advanced Reporting",
            description: "Access tailored reports for multi-unit operators, CFOs, and supply chain managers."
          },
          {
            name: "Dedicated Account Support",
            description: "Priority onboarding, training, and ongoing consultative support."
          }
        ],
        pricings: []
      }
    ]
  };
  constructor() { }

  // GET /api/plans
  getPlans(): Observable<ApiPlansResponse> {
    return of(this.mockPlansResponse).pipe(delay(500)); // Simulate network delay
  }

  // POST /api/subscribe
  subscribe(request: ApiSubscribeRequest): Observable<ApiSubscribeResponse> {
    const mockResponse: ApiSubscribeResponse = {
      checkout_url: "https://checkout.stripe.com/c/pay/cs_test_a1pyYdrHnZyBl1evhVN0ma28wtsMzdoPOtQvLOC02vXGj3lAKlwR2WNwi8",
      session_id: "cs_test_a1pyYdrHnZyBl1evhVN0ma28wtsMzdoPOtQvLOC02vXGj3lAKlwR2WNwi8",
      subscription_id: 12
    };
    return of(mockResponse).pipe(delay(800));
  }

  // POST /api/subscription/status
  checkSubscriptionStatus(request: ApiSubscriptionStatusRequest): Observable<ApiSubscriptionStatusResponse> {
    // Mock different responses based on email for testing
    const mockActiveResponse: ApiSubscriptionStatusResponse = {
      has_subscription: true,
      status: "ACTIVE",
      is_active: true,
      message: "Subscription active",
      valid_until: "2025-11-06T09:11:27"
    };

    const mockNoSubscriptionResponse: ApiSubscriptionStatusResponse = {
      has_subscription: false,
      status: "NO_SUBSCRIPTION",
      is_active: false,
      message: "No subscription found",
      valid_until: null
    };

    // Return active subscription for specific test emails, otherwise no subscription
    const response = request.email.includes('subscribed') ? mockActiveResponse : mockNoSubscriptionResponse;
    return of(response).pipe(delay(300));
  }

  // Helper method to convert API plans to UI format
  convertToUIPlans(apiResponse: ApiPlansResponse): UIPlan[] {
    return apiResponse.plans.map(plan => {
      const monthlyPricing = plan.pricings.find(p => p.billing_cycle === 'MONTHLY');
      const yearlyPricing = plan.pricings.find(p => p.billing_cycle === 'YEARLY');
      
      return {
        id: plan.plan_id.toString(),
        name: this.extractPlanName(plan.plan_title),
        title: plan.plan_title,
        description: plan.plan_description,
        features: plan.features.map(f => f.description ? `${f.name}: ${f.description}` : f.name),
        monthlyPrice: monthlyPricing?.price || null,
        yearlyPrice: yearlyPricing?.price || null,
        monthlyPriceId: monthlyPricing?.stripe_price_id || null,
        yearlyPriceId: yearlyPricing?.stripe_price_id || null,
        discount: yearlyPricing?.discount || 0,
        isCustomPricing: plan.pricings.length === 0,
        isPopular: plan.plan_id === 1
      };
    });
  }

  private extractPlanName(title: string): string {
    if (title.includes('Basic')) return 'Basic';
    if (title.includes('Pro')) return 'Pro';
    if (title.includes('Enterprise')) return 'Enterprise';
    return title.split(' ')[0];
  }
}