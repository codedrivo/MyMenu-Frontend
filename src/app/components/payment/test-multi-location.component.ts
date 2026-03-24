import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../services/payment.service';
import { CreateCheckoutSessionRequest, CreateCheckoutSessionResponse } from '../../models/checkout-session';

@Component({
  selector: 'app-test-multi-location',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="test-container" style="padding: 20px; max-width: 600px; margin: 0 auto;">
      <h2>Multi-Location Payment API Test</h2>
      
      <div class="test-section" style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
        <h3>Test Single Location</h3>
        <button (click)="testSingleLocation()" 
                [disabled]="loading"
                style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          {{ loading ? 'Testing...' : 'Test Single Location Payment' }}
        </button>
      </div>

      <div class="test-section" style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
        <h3>Test Multiple Locations</h3>
        <button (click)="testMultipleLocations()" 
                [disabled]="loading"
                style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
          {{ loading ? 'Testing...' : 'Test Multiple Locations Payment' }}
        </button>
      </div>

      <div *ngIf="result" class="result-section" style="margin-top: 20px; padding: 15px; border-radius: 8px;"
           [style.background-color]="result.success ? '#d4edda' : '#f8d7da'"
           [style.border-color]="result.success ? '#c3e6cb' : '#f5c6cb'">
        <h3>{{ result.success ? 'Success' : 'Error' }}</h3>
        <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">{{ result.data | json }}</pre>
      </div>
    </div>
  `
})
export class TestMultiLocationComponent {
  loading = false;
  result: { success: boolean; data: any } | null = null;

  constructor(private paymentService: PaymentService) {}

  testSingleLocation() {
    this.loading = true;
    this.result = null;

    const request: CreateCheckoutSessionRequest = {
      location_id: [1],
      user_email: 'test@example.com',
      plan_interval: 'monthly'
    };

    this.paymentService.createCheckoutSession(request).subscribe({
      next: (response) => {
        this.result = { success: true, data: response };
        this.loading = false;
      },
      error: (error) => {
        this.result = { success: false, data: error };
        this.loading = false;
      }
    });
  }

  testMultipleLocations() {
    this.loading = true;
    this.result = null;

    const request: CreateCheckoutSessionRequest = {
      location_id: [1, 2, 3],
      user_email: 'test@example.com',
      plan_interval: 'yearly'
    };

    this.paymentService.createCheckoutSession(request).subscribe({
      next: (response) => {
        this.result = { success: true, data: response };
        this.loading = false;
      },
      error: (error) => {
        this.result = { success: false, data: error };
        this.loading = false;
      }
    });
  }
}