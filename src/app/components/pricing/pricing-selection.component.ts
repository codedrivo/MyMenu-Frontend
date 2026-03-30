import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MockApiService } from '../../services/mock-api.service';
import { UIPlan, ApiSubscribeRequest } from '../../models/api-types';

@Component({
  selector: 'app-pricing-selection',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pricing-selection.component.html',
  styleUrls: ['./pricing-selection.component.css']
})
export class PricingSelectionComponent implements OnInit {
  @Output() planSelected = new EventEmitter<UIPlan>();
  @Output() quoteRequested = new EventEmitter<UIPlan>();
  @Output() subscriptionRequested = new EventEmitter<{plan: UIPlan, pricingId: number, email: string}>();

  loading = true;
  error: string | null = null;
  serviceTiers: UIPlan[] = [];
  selectedBillingCycle: 'monthly' | 'yearly' = 'monthly';

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
    this.loadPlans();
  }

  retryLoadPlans(): void {
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
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load pricing plans. Please try again.';
        this.loading = false;
      }
    });
  }

// MAIN FLOW (LOGIN + PAYMENT)
  selectTier(tier: UIPlan): void {

    // Custom plan → Contact
    if (tier.isCustomPricing) {
      this.router.navigate(['/contact'], {
        queryParams: { tier: tier.name }
      });
      return;
    }

    const isLoggedIn = !!localStorage.getItem('token'); //

    const price =
      this.selectedBillingCycle === 'yearly'
        ? tier.yearlyPrice
        : tier.monthlyPrice;

    const priceId =
      this.selectedBillingCycle === 'yearly'
        ? tier.yearlyPriceId
        : tier.monthlyPriceId;

    const planData = {
      planId: tier.id,
      planName: tier.name,
      billingCycle: this.selectedBillingCycle,
      price,
      priceId
    };

    // Not logged in → go login first
    if (!isLoggedIn) {
      localStorage.setItem('pendingPlan', JSON.stringify(planData));
      this.router.navigate(['/login']);
      return;
    }

    // Logged in → go payment
    this.router.navigate(['/payment'], {
      queryParams: planData
    });
  }

  // Toggle
  toggleBillingCycle(): void {
    this.selectedBillingCycle =
      this.selectedBillingCycle === 'monthly' ? 'yearly' : 'monthly';
  }

  // Dynamic price
  getPrice(tier: UIPlan): number | null {
    if (tier.isCustomPricing) return null;

    return this.selectedBillingCycle === 'yearly'
      ? tier.yearlyPrice
      : tier.monthlyPrice;
  }

  // Savings
  getSavings(tier: UIPlan): number {
    if (!tier.yearlyPrice || !tier.monthlyPrice) return 0;
    return (tier.monthlyPrice * 12) - tier.yearlyPrice;
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