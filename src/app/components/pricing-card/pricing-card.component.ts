import { Component } from '@angular/core';

@Component({
  selector: 'app-pricing-card',
  standalone: true,
  imports: [],
  templateUrl: './pricing-card.component.html',
  styleUrl: './pricing-card.component.css'
})
export class PricingCardComponent {
  selectedBillingCycle: 'monthly' | 'yearly' = 'monthly';
  loading = true;
  error: string | null = null;
  subscriptionMessage: string | null = null;
  returnUrl: string | null = null;


}
