import { Component, Input, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PaymentService } from '../../services/payment.service';
import { jsPDF } from 'jspdf';
import { Observable, of } from 'rxjs';
import { catchError, map, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Clean Minimal Background -->
    <div class="min-h-screen bg-white relative overflow-hidden flex items-center justify-center p-4 mt-20 mb-20">
      
      <!-- Subtle Grid Pattern -->
      <div class="absolute inset-0 opacity-5">
        <div class="grid grid-cols-12 gap-4 h-full">
          <div class="col-span-1 bg-gray-200"></div>
          <div class="col-span-1 bg-gray-200"></div>
          <div class="col-span-1 bg-gray-200"></div>
          <div class="col-span-1 bg-gray-200"></div>
          <div class="col-span-1 bg-gray-200"></div>
          <div class="col-span-1 bg-gray-200"></div>
          <div class="col-span-1 bg-gray-200"></div>
          <div class="col-span-1 bg-gray-200"></div>
          <div class="col-span-1 bg-gray-200"></div>
          <div class="col-span-1 bg-gray-200"></div>
          <div class="col-span-1 bg-gray-200"></div>
          <div class="col-span-1 bg-gray-200"></div>
        </div>
      </div>
      
      <!-- Main Result Container -->
      <div class="w-full max-w-2xl mx-auto relative z-10">
        
        <!-- Loading State -->
        <div *ngIf="isLoading" class="bg-white border border-gray-200 rounded-3xl shadow-lg p-12 text-center relative overflow-hidden">
          <div class="flex flex-col items-center justify-center space-y-6">
            <div class="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
            <div>
              <p class="text-xl font-semibold text-gray-900">Processing your payment...</p>
              <p class="text-sm text-gray-500 mt-2">Please wait while we confirm your transaction</p>
            </div>
          </div>
        </div>

        <!-- Success State -->
         <div *ngIf="isSuccess && !isLoading" class="bg-white border border-gray-200 rounded-3xl shadow-lg p-8 text-center transform transition-all duration-300 hover:shadow-xl relative overflow-hidden">
           
           <!-- Content Container -->
           <div class="relative z-10">
             <!-- Futuristic Success Icon -->
             <div class="relative mb-12">
               <!-- Main Icon Container -->
               <div class="relative mx-auto w-32 h-32 bg-blue-500 rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-105">
                 
                 <!-- Check Icon -->
                 <svg class="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                 </svg>
               </div>
             </div>
   
             <!-- Success Content -->
             <div class="mb-12">
               <h1 class="text-4xl font-bold text-gray-800 mb-6 tracking-tight">
                  Payment Successful!
               </h1>
               <p class="text-xl text-gray-700 mb-3">Welcome to <span class="font-bold text-blue-600">{{ planName || 'MyMenu AI' }}</span>!</p>
               <p class="text-gray-600">Your subscription is now active and ready to use.</p>
               
               <!-- Status Indicator -->
               <div class="flex items-center justify-center mt-6 space-x-2">
                 <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                 <span class="text-green-600 font-medium">ACTIVE</span>
                 <div class="w-3 h-3 bg-green-500 rounded-full"></div>
               </div>
             </div>

              <!-- Subscription Details Card -->
              <div class="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8 relative overflow-hidden">
                
                <div class="grid grid-cols-2 gap-6 text-sm">
                  <div class="text-left">
                    <p class="text-gray-600 font-medium mb-1">Plan</p>
                    <p class="text-gray-800 font-bold text-lg">{{ planName || 'Premium' }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-gray-600 font-medium mb-1">Status</p>
                    <p class="text-green-600 font-bold flex items-center justify-end">
                      <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      ACTIVE
                    </p>
                  </div>
                  <div class="text-left">
                    <p class="text-gray-600 font-medium mb-1">Subscription ID</p>
                    <p class="text-gray-700 font-mono text-xs bg-gray-100 px-2 py-1 rounded">{{ subscriptionId || 'sub_xxxxxxxxxx' }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-gray-600 font-medium mb-1">Next Billing</p>
                    <p class="text-gray-800 font-bold">{{ getNextBillingDate() }}</p>
                  </div>
                </div>
              </div>
    
              <!-- Action Buttons -->
              <div class="space-y-6">
                <button
                  (click)="goToDashboard()"
                  class="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-lg transform hover:scale-105 hover:bg-blue-700 transition-all duration-300"
                >
                  <div class="flex items-center justify-center space-x-3">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                    </svg>
                    <span>Launch Dashboard</span>
                  </div>
                </button>
                
                <div class="grid grid-cols-2 gap-4">
                  <button
                    (click)="downloadReceipt()"
                    class="bg-gray-100 border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 hover:border-blue-400 transition-all duration-300 flex items-center justify-center space-x-2 group"
                  >
                    <svg class="w-4 h-4 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span>Receipt</span>
                  </button>
                  
                  <button
                    (click)="shareSuccess()"
                    class="bg-gray-100 border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 hover:border-green-400 transition-all duration-300 flex items-center justify-center space-x-2 group"
                  >
                    <svg class="w-4 h-4 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
                    </svg>
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>
        </div>

        <!-- Error State -->
        <div *ngIf="!isSuccess && !isLoading" class="bg-white border border-gray-200 rounded-2xl shadow-lg p-8 text-center transform transition-all duration-300 hover:shadow-xl relative">
          
          <!-- Content Container -->
          <div class="relative">
            <!-- Clean Error Icon -->
            <div class="relative mb-8">
              <!-- Main Icon Container -->
              <div class="mx-auto w-24 h-24 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                <!-- X Icon -->
                <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              
              <!-- Subtle Accent Ring -->
              <div class="absolute inset-0 w-28 h-28 mx-auto border-2 border-red-100 rounded-full"></div>
            </div>

            <!-- Error Content -->
            <div class="mb-8">
              <h1 class="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
                Payment Failed
              </h1>
              <p class="text-lg text-gray-700 mb-2">We couldn't process your payment for <span class="font-semibold text-red-600">{{ planName || 'Premium Plan' }}</span></p>
              <p class="text-gray-500">{{ errorMessage || 'There was an issue processing your payment. Please try again or contact support.' }}</p>
              
              <!-- Status Indicator -->
              <div class="flex items-center justify-center mt-4 space-x-2">
                <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                <span class="text-red-600 font-medium text-sm">FAILED</span>
                <div class="w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
            </div>

            <!-- Error Details Card -->
            <div class="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
              <div class="text-left">
                <p class="text-gray-600 font-medium mb-4">What happened?</p>
                <ul class="text-sm text-gray-700 space-y-2">
                  <li class="flex items-center space-x-2">
                    <span class="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span>{{ getErrorReason() }}</span>
                  </li>
                  <li class="flex items-center space-x-2">
                    <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>No charges were made to your account</span>
                  </li>
                  <li class="flex items-center space-x-2">
                    <span class="w-2 h-2 bg-gray-400 rounded-full"></span>
                    <span>You can try again with a different payment method</span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="space-y-4">
              <button
                (click)="tryAgain()"
                class="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span>Try Again</span>
              </button>
              
              <div class="grid grid-cols-2 gap-3">
                <button
                  (click)="contactSupport()"
                  class="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.456L3 21l2.456-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"></path>
                  </svg>
                  <span>Support</span>
                </button>
                
                <button
                  (click)="goBack()"
                  class="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                  </svg>
                  <span>Go Back</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
         <div class="text-center mt-8">
           <p class="text-sm text-gray-500">
             Need help? Contact us at 
             <a href="mailto:support@mymenu.ai" class="text-blue-600 hover:text-blue-800 font-medium">support&#64;mymenu.ai</a>
           </p>
         </div>
       </div>
     </div>
   `,
  styles: []
})
export class PaymentResultComponent implements OnInit {
  @Input() isSuccess: boolean = false;
  @Input() errorMessage: string = '';
  @Input() planName: string = '';
  @Input() subscriptionId: string = '';
  private isBrowser: boolean = false;
  isLoading: boolean = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private paymentService: PaymentService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
  // Log environment for debugging
  // console.log('Environment:', this.isBrowser ? 'Browser' : 'Server');

  // Skip API calls during SSR to avoid timeouts
  if (!this.isBrowser) {
    this.isSuccess = false;
    this.errorMessage = 'Payment status is being processed. Please wait...';
    // console.log('SSR: Setting default state (isSuccess=false)');
    this.isLoading = true;
    return;
  }

  // Process query parameters in browser only
  this.route.queryParams.subscribe(params => {
    // console.log('Query Params:', params); // Debug: Log query parameters
    const successParam = params['success'];
    const sessionId = params['session_id'];
    const status = params['status'];
    // Normalize planName: Replace "Location Base Plan" with "Base Plan"
    this.planName = params['planName'] === 'Location Base Plan' ? 'Base Plan' : params['planName'] || '';
    this.subscriptionId = params['subscriptionId'] || '';
    const routePath = this.route.snapshot.routeConfig?.path || '';
    const isSuccessPath = routePath.includes('subscription/success');
    const isCancelPath = routePath.includes('subscription/cancel');
    // console.log('Route Path:', routePath, 'isSuccessPath:', isSuccessPath, 'isCancelPath:', isCancelPath); // Debug: Log route info

    // Prioritize success=true query param or SUCCEEDED status
    if (successParam === 'true' || status === 'SUCCEEDED') {
      // console.log('Success case detected: success=true or status=SUCCEEDED');
      this.isSuccess = true;
      if (sessionId) {
        // console.log('Calling paymentService.paymentSuccess with sessionId:', sessionId);
        this.paymentService.paymentSuccess(sessionId).pipe(
          map(resp => {
            // console.log('paymentSuccess response:', resp); // Debug: Log API response
            this.isSuccess = true;
            this.subscriptionId = resp?.subscription_id ? String(resp.subscription_id) : this.subscriptionId;
          }),
          catchError(err => {
            console.error('paymentSuccess error:', err); // Debug: Log API error
            this.isSuccess = true; // Keep success state based on query param
            this.errorMessage = err?.error?.message || 'Payment success confirmation failed, but query parameters indicate success';
            return of(null);
          }),
          finalize(() => { this.isLoading = false; })
        ).subscribe();
      } else {
        // No server confirmation call; we can stop loading now
        this.isLoading = false;
      }
    } else if (successParam === 'false' || isCancelPath || status === 'FAILED') {
      // console.log('Failure case detected: success=false, cancel path, or status=FAILED');
      this.isSuccess = false;
      if (sessionId) {
        // console.log('Calling paymentService.paymentCancel with sessionId:', sessionId);
        this.paymentService.paymentCancel(sessionId).pipe(
          map(resp => {
            // console.log('paymentCancel response:', resp); // Debug: Log API response
            this.isSuccess = false;
            this.errorMessage = resp?.message || 'Payment was cancelled';
          }),
          catchError(err => {
            console.error('paymentCancel error:', err); // Debug: Log API error
            this.isSuccess = false;
            this.errorMessage = err?.error?.message || 'Payment cancellation handling failed';
            return of(null);
          }),
          finalize(() => { this.isLoading = false; })
        ).subscribe();
      } else {
        this.errorMessage = 'Payment was cancelled or failed';
        this.isLoading = false;
      }
    } else if (isSuccessPath) {
      // console.log('Success path detected:', routePath);
      if (sessionId) {
        // console.log('Calling paymentService.paymentSuccess with sessionId:', sessionId);
        this.paymentService.paymentSuccess(sessionId).pipe(
          map(resp => {
            // console.log('paymentSuccess response:', resp); // Debug: Log API response
            this.isSuccess = true;
            this.subscriptionId = resp?.subscription_id ? String(resp.subscription_id) : this.subscriptionId;
          }),
          catchError(err => {
            console.error('paymentSuccess error:', err); // Debug: Log API error
            this.isSuccess = false;
            this.errorMessage = err?.error?.message || 'Payment success confirmation failed';
            return of(null);
          }),
          finalize(() => { this.isLoading = false; })
        ).subscribe();
      } else {
        this.isSuccess = true; // Fallback to success for success path
        // console.log('No sessionId, defaulting to isSuccess=true for success path');
        this.isLoading = false;
      }
    } else {
      // console.log('Ambiguous state: setting isSuccess=false');
      this.isSuccess = false;
      this.errorMessage = 'Payment status could not be determined.';
      this.isLoading = false;
    }
  });
}

  goToDashboard() {
    // console.log('Navigating to dashboard'); // Debug: Log navigation
    this.router.navigate(['/user-dashboard']);
  }

  downloadReceipt() {
    if (!this.isBrowser) {
      // console.log('downloadReceipt: Skipped on server'); // Debug: Log SSR skip
      return;
    }

    // console.log('downloadReceipt: Fetching receipt for subscriptionId:', this.subscriptionId); // Debug: Log action
    if (this.subscriptionId) {
      this.paymentService.getReceipt(this.subscriptionId).subscribe({
        next: (blob: Blob) => {
          // console.log('getReceipt response:', blob.type); // Debug: Log blob type
          const fileName = `receipt_${this.subscriptionId}.pdf`;
          const isPdf = blob.type.toLowerCase().includes('pdf');

          if (isPdf) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            // console.log('Downloaded server-provided PDF receipt');
          } else {
            blob.text().then((text) => {
              // console.log('getReceipt blob text:', text.substring(0, 100)); // Debug: Log first 100 chars
              const doc = new jsPDF();
              const isHtml = /<\s*html|<!DOCTYPE html/i.test(text);
              if (isHtml) {
                const title = `Receipt Unavailable for Subscription ${this.subscriptionId}`;
                const msg = `We couldn't retrieve your receipt from the server.\n\nIf this persists, please contact support@mymenu.ai with your Subscription ID (${this.subscriptionId}).`;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(14);
                doc.text(title, 10, 15);
                doc.setFontSize(11);
                doc.text(doc.splitTextToSize(msg, 180), 10, 30);
                doc.save(fileName);
                // console.log('Generated fallback PDF due to HTML response');
                return;
              }
              const title = `Receipt for Subscription ${this.subscriptionId}`;
              const lines = doc.splitTextToSize(text || `Plan: ${this.planName || 'N/A'}\nSubscription ID: ${this.subscriptionId}\nStatus: SUCCESS\nThank you for your purchase!`, 180);
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(14);
              doc.text(title, 10, 15);
              doc.setFontSize(11);
              doc.text(lines, 10, 30);
              doc.save(fileName);
              // console.log('Generated PDF from blob text');
            }).catch((err) => {
              console.error('Error reading blob text:', err); // Debug: Log blob error
              const doc = new jsPDF();
              doc.text(`Plan: ${this.planName || 'N/A'}\nSubscription ID: ${this.subscriptionId}\nStatus: SUCCESS\nThank you for your purchase!`, 10, 15);
              doc.save(fileName);
              // console.log('Generated fallback PDF due to blob read error');
            });
          }
        },
        error: (err) => {
          console.error('getReceipt error:', err); // Debug: Log API error
          const fileName = `receipt_${this.subscriptionId}.pdf`;
          const doc = new jsPDF();
          doc.text(`Plan: ${this.planName || 'N/A'}\nSubscription ID: ${this.subscriptionId}\nStatus: SUCCESS\nThank you for your purchase!`, 10, 15);
          doc.save(fileName);
          // console.log('Generated fallback PDF due to API error');
        }
      });
    } else {
      const doc = new jsPDF();
      const fileName = 'receipt.pdf';
      doc.text(`Plan: ${this.planName || 'N/A'}\nSubscription ID: ${this.subscriptionId || 'N/A'}\nStatus: SUCCESS\nThank you for your purchase!`, 10, 15);
      doc.save(fileName);
      // console.log('Generated fallback PDF: no subscriptionId');
    }
  }

  tryAgain() {
    // console.log('Navigating to payment retry'); // Debug: Log navigation
    this.router.navigate(['/payment'], { 
      queryParams: { planName: this.planName } 
    });
  }

  contactSupport() {
    if (!this.isBrowser) {
      // console.log('contactSupport: Skipped on server'); // Debug: Log SSR skip
      return;
    }
    // console.log('Opening support email'); // Debug: Log action
    const subject = encodeURIComponent('Payment Issue - ' + this.planName);
    const body = encodeURIComponent(`Hello,\n\nI encountered an issue with my payment for the ${this.planName} plan.\n\nError: ${this.errorMessage}\n\nPlease assist me.\n\nThank you.`);
    window.open(`mailto:support@mymenu.ai?subject=${subject}&body=${body}`, '_blank');
  }

  shareSuccess() {
    if (!this.isBrowser) {
      // console.log('shareSuccess: Skipped on server'); // Debug: Log SSR skip
      return;
    }
    // console.log('Attempting to share success'); // Debug: Log action
    if (navigator.share) {
      navigator.share({
        title: 'MyMenu AI Subscription',
        text: `I just subscribed to ${this.planName} on MyMenu AI! 🎉`,
        url: window.location.origin
      }).catch((err) => {
        console.error('navigator.share error:', err); // Debug: Log share error
        const text = `I just subscribed to ${this.planName} on MyMenu AI! 🎉 Check it out at ${window.location.origin}`;
        navigator.clipboard.writeText(text).then(() => {
          alert('Success message copied to clipboard!');
          // console.log('Copied share text to clipboard');
        });
      });
    } else {
      const text = `I just subscribed to ${this.planName} on MyMenu AI! 🎉 Check it out at ${window.location.origin}`;
      navigator.clipboard.writeText(text).then(() => {
        alert('Success message copied to clipboard!');
        // console.log('Copied share text to clipboard (no navigator.share)');
      });
    }
  }

  goBack() {
    // console.log('Navigating back to pricing'); // Debug: Log navigation
    this.router.navigate(['/pricing']);
  }

  getNextBillingDate(): string {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getErrorReason(): string {
    if (!this.errorMessage) {
      return 'Payment processing error occurred';
    }
    if (this.errorMessage.toLowerCase().includes('card')) {
      return 'Your card was declined or expired';
    } else if (this.errorMessage.toLowerCase().includes('insufficient')) {
      return 'Insufficient funds on your payment method';
    } else if (this.errorMessage.toLowerCase().includes('network')) {
      return 'Network connection issue occurred';
    } else {
      return 'Payment processing error occurred';
    }
  }
}