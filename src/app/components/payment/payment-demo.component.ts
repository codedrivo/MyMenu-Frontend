import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-payment-demo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8 mt-24">
      <div class="max-w-4xl mx-auto px-4">
        <div class="bg-white rounded-lg shadow-lg p-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-8 text-center">
            Payment System Demo
          </h1>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Pricing Selection -->
            <div class="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h2 class="text-xl font-semibold text-blue-900 mb-4">
                1. Pricing Selection
              </h2>
              <p class="text-gray-700 mb-4">
                Choose from different service tiers and pricing plans.
              </p>
              <a 
                routerLink="/pricing" 
                class="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                View Pricing
              </a>
            </div>

            <!-- Payment Processing -->
            <div class="bg-green-50 p-6 rounded-lg border border-green-200">
              <h2 class="text-xl font-semibold text-green-900 mb-4">
                2. Payment Processing
              </h2>
              <p class="text-gray-700 mb-4">
                Secure payment processing with Stripe integration.
              </p>
              <a 
                routerLink="/payment" 
                class="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                View Payment
              </a>
            </div>

            <!-- Subscription Management -->
            <div class="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <h2 class="text-xl font-semibold text-purple-900 mb-4">
                3. Subscription Management
              </h2>
              <p class="text-gray-700 mb-4">
                Manage active subscriptions and billing.
              </p>
              <a 
                routerLink="/subscription" 
                class="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
              >
                View Subscriptions
              </a>
            </div>

            <!-- Complete Flow -->
            <div class="bg-orange-50 p-6 rounded-lg border border-orange-200">
              <h2 class="text-xl font-semibold text-orange-900 mb-4">
                4. Complete Flow
              </h2>
              <p class="text-gray-700 mb-4">
                Experience the full payment workflow from start to finish.
              </p>
              <button 
                (click)="startPaymentFlow()"
                class="inline-block bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors"
              >
                Start Flow
              </button>
            </div>
          </div>

          <div class="mt-8 text-center">
            <a 
              routerLink="/user-dashboard" 
              class="text-gray-600 hover:text-gray-800 underline"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PaymentDemoComponent {
  startPaymentFlow() {
    // Navigate to pricing selection to start the complete flow
    window.location.href = '/pricing';
  }
}