import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockApiService } from '../../services/mock-api.service';
import { UIPlan, ApiSubscribeRequest } from '../../models/api-types';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css'
})
export class PricingComponent implements OnInit {
  @Output() tierSelected = new EventEmitter<UIPlan>();
  @Output() subscriptionRequested = new EventEmitter<{plan: UIPlan, pricingId: number, email: string}>();
  
  serviceTiers: UIPlan[] = [];
  selectedBillingCycle: 'monthly' | 'yearly' = 'monthly';
  loading = true;
  error: string | null = null;

  constructor(private mockApiService: MockApiService) {}

  ngOnInit(): void {
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

  retryLoadPlans(): void {
    this.error = null;
    this.loadPlans();
  }

  selectTier(tier: UIPlan): void {
    if (tier.isCustomPricing) {
      this.handleCustomPricing(tier);
    } else {
      this.tierSelected.emit(tier);
    }
  }

  private handleCustomPricing(tier: UIPlan): void {
    // You can implement a contact form modal or redirect to contact page
    alert(`Please contact us for ${tier.name} pricing. We'll provide a custom quote based on your needs.`);
  }

  // Billing cycle fixed to monthly; toggle disabled
  toggleBillingCycle(): void {
    this.selectedBillingCycle = 'monthly';
  }

  getPrice(tier: UIPlan): number | null {
    if (tier.isCustomPricing) return null;
    return tier.monthlyPrice;
  }

  getSavingsText(tier: UIPlan): string {
    if (tier.discount > 0) {
      return `Save ${tier.discount}%`;
    }
    return '';
  }

  // Method to handle subscription with pricing ID
  subscribeToplan(tier: UIPlan, email: string): void {
    if (tier.isCustomPricing) {
      this.handleCustomPricing(tier);
      return;
    }

    const pricingId = this.getPricingIdFromStripeId(tier.monthlyPriceId);

    if (pricingId) {
      this.subscriptionRequested.emit({ plan: tier, pricingId, email });
    }
  }

  private getPricingIdFromStripeId(stripeId: string | null): number | null {
    if (!stripeId) return null;
    // Extract pricing ID from stripe price ID (this would be handled by the backend in real implementation)
    if (stripeId.includes('monthly')) return 1;
    if (stripeId.includes('yearly')) return 2;
    return null;
  }
}