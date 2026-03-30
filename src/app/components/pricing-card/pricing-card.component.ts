import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MockApiService } from '../../services/mock-api.service';
import { UIPlan } from '../../models/api-types';

@Component({
  selector: 'app-pricing-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pricing-card.component.html',
  styleUrls: ['./pricing-card.component.css']
})
export class PricingCardComponent implements OnInit {

  loading = true;
  error: string | null = null;
  serviceTiers: UIPlan[] = [];
  selectedBillingCycle: 'monthly' | 'yearly' = 'monthly';

  constructor(
    private mockApiService: MockApiService,
    private router: Router
  ) {}

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
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load pricing plans. Please try again.';
        this.loading = false;
      }
    });
  }

  retryLoadPlans(): void {
    this.loadPlans();
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
}