import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MockApiService } from '../../services/mock-api.service';
import { UIPlan, ApiSubscribeRequest } from '../../models/api-types';

@Component({
  selector: 'app-pricing-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing-selection.component.html',
  styleUrls: ['./pricing-selection.component.css']
})
export class PricingSelectionComponent implements OnInit {
  @Output() planSelected = new EventEmitter<UIPlan>();
  @Output() quoteRequested = new EventEmitter<UIPlan>();
  @Output() subscriptionRequested = new EventEmitter<{plan: UIPlan, pricingId: number, email: string}>();

  serviceTiers: UIPlan[] = [];
  billingCycle: 'monthly' | 'yearly' = 'monthly';
  loading = true;
  error: string | null = null;
  subscriptionMessage: string | null = null;
  returnUrl: string | null = null;

  allFeatures = [
    { name: 'Comp Set Identification' },
    { name: 'Market Trend Analysis' },
    { name: 'Easy-to-Use Dashboard' },
    { name: 'Unlimited Menu Items' },
    { name: 'No Search Limit' },
    { name: 'Full Radius' },
    { name: 'Multiple Locations' },
    { name: 'AI-Driven Sales & Margin Analysis' },
    { name: 'Customer Traffic Insights' },
    { name: 'Forecasting' },
    { name: 'Automated Recommendations' },
    { name: 'Cost & Supply Chain Analysis' },
    { name: 'Custom Data Integration' },
    { name: 'Advanced Reporting' },
    { name: 'Dedicated Account Support' }
  ];

  constructor(
    private mockApiService: MockApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check for subscription requirement message from query parameters
    this.route.queryParams.subscribe(params => {
      this.subscriptionMessage = params['message'] || null;
      this.returnUrl = params['returnUrl'] || null;
    });
    this.loadPlans();
  }

  retryLoadPlans(): void {
    this.error = null;
    this.loadPlans();
  }

  private loadPlans(): void {
    this.loading = true;
    this.error = null;
    
    this.mockApiService.getPlans().subscribe({
      next: (response) => {
        this.serviceTiers = this.mockApiService.convertToUIPlans(response);
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load pricing plans. Please try again.';
        this.loading = false;
        console.error('Error loading plans:', error);
      }
    });
  }

  setBillingCycle(cycle: 'monthly' | 'yearly'): void {
    this.billingCycle = cycle;
  }

  // Choose a sensible default tier for top checkout CTA
  getDefaultCheckoutTier(): UIPlan | null {
    if (!this.serviceTiers || this.serviceTiers.length === 0) return null;
    const popularPaid = this.serviceTiers.find(t => !t.isCustomPricing && t.isPopular);
    if (popularPaid) return popularPaid;
    const firstPaid = this.serviceTiers.find(t => !t.isCustomPricing);
    return firstPaid || null;
  }

  // Top CTA handler: proceed with the default tier
  proceedToCheckoutTop(): void {
    const tier = this.getDefaultCheckoutTier();
    if (tier) {
      this.selectPlan(tier);
    }
  }

  selectPlan(tier: UIPlan): void {
    if (tier.isCustomPricing) {
      this.requestQuote(tier);
    } else {
      // Navigate to multi-location payment page with selected plan data
      const price = this.billingCycle === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;
      const priceId = this.billingCycle === 'yearly' ? tier.yearlyPriceId : tier.monthlyPriceId;
      
      this.router.navigate(['/multi-location-payment'], {
        queryParams: {
          planId: tier.id,
          planName: tier.name,
          billingCycle: this.billingCycle,
          price: price,
          priceId: priceId
        }
      });
      this.planSelected.emit(tier);
    }
  }

  selectSingleLocationPlan(tier: UIPlan): void {
    if (tier.isCustomPricing) {
      this.requestQuote(tier);
    } else {
      // Navigate to single location payment page
      const price = this.billingCycle === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;
      const priceId = this.billingCycle === 'yearly' ? tier.yearlyPriceId : tier.monthlyPriceId;
      
      this.router.navigate(['/payment'], {
        queryParams: {
          planId: tier.id,
          planName: tier.name,
          billingCycle: this.billingCycle,
          price: price,
          priceId: priceId
        }
      });
      this.planSelected.emit(tier);
    }
  }

  requestQuote(tier: UIPlan): void {
    // Navigate to Contact Us page for custom pricing
    this.router.navigate(['/contact'], { queryParams: { tier: tier.name } });
    this.quoteRequested.emit(tier);
  }

  // Method to handle subscription with pricing ID
  subscribeToplan(tier: UIPlan, email: string): void {
    if (tier.isCustomPricing) {
      this.requestQuote(tier);
      return;
    }

    const pricingId = this.getPricingIdFromStripeId(tier.monthlyPriceId);

    if (pricingId) {
      this.subscriptionRequested.emit({ plan: tier, pricingId, email });
    }
  }

  private getPricingIdFromStripeId(stripeId: string | null): number | null {
    if (!stripeId) return null;
    // Extract pricing ID from stripe price ID
    if (stripeId.includes('monthly')) return 1;
    if (stripeId.includes('yearly')) return 2;
    return null;
  }

  getCurrentPrice(tier: UIPlan): number | null {
    if (tier.isCustomPricing) return null;
    return this.billingCycle === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;
  }

  isFeatureIncluded(featureName: string, tier: UIPlan): boolean {
    // Check if feature is directly included
    if (tier.features.some((feature: string) => feature.includes(featureName))) {
      return true;
    }
    
    // Check inheritance for Pro tier
    if (tier.id === '2') {
      const basicFeatures = [
        'Comp Set Identification', 
        'Market Trend Analysis', 
        'Easy-to-Use Dashboard',
        'Unlimited Menu Items', 
        'No Search Limit', 
        'Full Radius', 
        'Multiple Locations'
      ];
      return basicFeatures.includes(featureName) || 
             tier.features.some((feature: string) => feature.includes(featureName));
    }
    
    // Check inheritance for Enterprise tier
    if (tier.id === '3') {
      const inheritedFeatures = [
        'Comp Set Identification', 
        'Market Trend Analysis', 
        'Easy-to-Use Dashboard',
        'Unlimited Menu Items', 
        'No Search Limit', 
        'Full Radius', 
        'Multiple Locations',
        'AI-Driven Sales & Margin Analysis', 
        'Customer Traffic Insights',
        'Forecasting', 
        'Automated Recommendations', 
        'Cost & Supply Chain Analysis'
      ];
      return inheritedFeatures.includes(featureName) || 
             tier.features.some((feature: string) => feature.includes(featureName));
    }
    
    return false;
  }
}