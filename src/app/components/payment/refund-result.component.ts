import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-refund-result',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-white flex items-center justify-center p-4 mt-20 mb-20">
      <div class="w-full max-w-2xl mx-auto">
        <div *ngIf="isSuccess; else errorState" class="bg-white border border-gray-200 rounded-3xl shadow-lg p-8 text-center">
          <div class="mb-8">
            <div class="mx-auto w-28 h-28 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <svg class="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 mb-3">Refund Request Submitted</h1>
          <p class="text-gray-700 mb-6">{{ message || 'Your refund has been initiated and is being processed.' }}</p>

          <div class="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8 text-left">
            <div class="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p class="text-gray-600 font-medium mb-1">Refund Status</p>
                <p class="text-emerald-700 font-bold capitalize">{{ refundStatus || 'processing' }}</p>
              </div>
              <div>
                <p class="text-gray-600 font-medium mb-1">Payment ID</p>
                <p class="text-gray-800 font-mono text-xs bg-gray-100 px-2 py-1 rounded">{{ paymentId || '-' }}</p>
              </div>
              <div>
                <p class="text-gray-600 font-medium mb-1">Refund ID</p>
                <p class="text-gray-800 font-mono text-xs bg-gray-100 px-2 py-1 rounded">{{ refundId || '-' }}</p>
              </div>
              <div>
                <p class="text-gray-600 font-medium mb-1">Stripe Refund</p>
                <p class="text-gray-800 font-mono text-xs bg-gray-100 px-2 py-1 rounded">{{ stripeRefundId || '-' }}</p>
              </div>
              <div class="col-span-2" *ngIf="expectedRefundDate">
                <p class="text-gray-600 font-medium mb-1">Expected Completion</p>
                <p class="text-gray-800 font-bold">{{ expectedRefundDate }}</p>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <button (click)="goToDashboard()" class="w-full bg-blue-600 text-white py-3 px-6 rounded-2xl font-bold hover:bg-blue-700">Go to Dashboard</button>
            <button (click)="goToMyAccount()" class="w-full bg-gray-100 border border-gray-300 text-gray-700 py-3 px-6 rounded-2xl font-medium hover:bg-gray-200">Back to My Account</button>
          </div>
        </div>

        <ng-template #errorState>
          <div class="bg-white border border-gray-200 rounded-2xl shadow-lg p-8 text-center">
            <div class="mx-auto w-24 h-24 bg-red-500 rounded-full flex items-center justify-center shadow-lg mb-6">
              <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-3">Refund Request Failed</h1>
            <p class="text-gray-700">{{ message || 'There was an issue initiating your refund. Please try again or contact support.' }}</p>
            <div class="mt-6">
              <button (click)="goToMyAccount()" class="bg-gray-100 border border-gray-300 text-gray-700 py-2 px-4 rounded-xl font-medium hover:bg-gray-200">Back to My Account</button>
            </div>
          </div>
        </ng-template>
        
        <div class="text-center mt-8">
          <p class="text-sm text-gray-500">Need help? Contact <a href="mailto:support&#64;mymenu.ai" class="text-blue-600 hover:text-blue-800 font-medium">support&#64;mymenu.ai</a></p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class RefundResultComponent implements OnInit {
  isSuccess: boolean = true;
  message: string = '';
  refundStatus: string = '';
  expectedRefundDate: string = '';
  refundId: string = '';
  stripeRefundId: string = '';
  paymentId?: number;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const statusParam = params.get('status');
      this.isSuccess = statusParam === 'true' || statusParam === 'success' || statusParam === '1';
      this.message = params.get('message') || '';
      this.refundStatus = params.get('refund_status') || '';
      this.expectedRefundDate = params.get('expected_refund_date') || '';
      this.refundId = params.get('refund_id') || '';
      this.stripeRefundId = params.get('stripe_refund_id') || '';
      const pid = params.get('payment_id');
      this.paymentId = pid ? Number(pid) : undefined;
    });
  }

  goToDashboard() {
    this.router.navigate(['/user-dashboard']);
  }

  goToMyAccount() {
    this.router.navigate(['/my-account']);
  }
}