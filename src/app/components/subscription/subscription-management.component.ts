import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { ServiceTiersService } from '../../services/service-tiers.service';
import { ServiceTier, SubscriptionPlan, SubscriptionStatus } from '../../models/subscription';
import { PaymentHistoryItem, PaymentLocation, SubscriptionStatusCheck } from '../../models/api-types';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-subscription-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe, DatePipe],
  templateUrl: './subscription-management.component.html',
  styleUrls: ['./subscription-management.component.css']
})
export class SubscriptionManagementComponent implements OnInit {
  currentSubscription: SubscriptionPlan | null = null;
  availableTiers: ServiceTier[] = [];
  isLoading = false;
  showUpgradeModal = false;
  showDowngradeModal = false;
  showCancelModal = false;
  selectedTier: ServiceTier | null = null;
  billingCycle: 'monthly' | 'yearly' = 'monthly';

  // Payments API data (Updated for new structure)
  payments: PaymentHistoryItem[] = [];
  subscriptionStatus: SubscriptionStatusCheck | null = null;
  activeLocations: PaymentLocation[] = [];
  paymentsLoading = false;
  paymentsError: string | null = null;
  subscriptionStartDate: Date | null = null;
  subscriptionEndDate: Date | null = null;
  userEmail: string | null = null;
  // User locations
  userId: number | null = null;
  userLocations: Array<{ user_location_id: number; location: string; zip_or_postal_code?: string; latitude?: string; longitude?: string; expiry_status?: boolean; }> = [];
  primaryAddress: string | null = null;
  addressLoading = false;
  addressError: string | null = null;

  constructor(
    private paymentService: PaymentService,
    private serviceTiersService: ServiceTiersService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCurrentSubscription();
    this.loadAvailableTiers();
    this.loadUserPayments();
    this.loadUserAddress();
  }

  async loadCurrentSubscription() {
    try {
      this.isLoading = true;
      this.currentSubscription = await this.paymentService.getCurrentSubscription();
    } catch (error) {
      console.error('Error loading current subscription:', error);
    } finally {
      this.isLoading = false;
    }
  }

  loadAvailableTiers() {
    // Convert the service tier format to match our interface
    const serviceTiers = this.serviceTiersService.getServiceTiers();
    this.availableTiers = serviceTiers.map(tier => ({
      id: tier.id,
      name: tier.name,
      level: tier.id === 'basic' ? 1 : tier.id === 'pro' ? 2 : 3,
      monthlyPrice: tier.pricing?.monthly || 0,
      yearlyPrice: tier.pricing?.yearly || 0,
      features: tier.features,
      description: tier.description,
      isPopular: tier.popular,
      customPricing: tier.pricing?.customPricing
    }));
  }

  getCurrentTierName(): string {
    const status = this.getSubscriptionStatus();
    if (status === 'active') {
      return this.currentSubscription?.tierName || 'Basic';
    }
    return 'No active subscription';
  }

  getCurrentTierPrice(): number {
    if (!this.currentSubscription) return 0;
    return this.currentSubscription.price;
  }

  getNextBillingDate(): string {
    if (!this.currentSubscription?.nextBillingDate) return 'N/A';
    return new Date(this.currentSubscription.nextBillingDate).toLocaleDateString();
  }

  getSubscriptionStatus(): string {
    // Check subscription status from new API structure
    if (this.subscriptionStatus?.hasActiveSubscription) {
      return 'active';
    }
    const raw = this.currentSubscription?.status;
    if (!raw) return 'inactive';
    return String(raw).toLowerCase();
  }

  canUpgrade(): boolean {
    if (!this.currentSubscription) return true;
    const currentTier = this.availableTiers.find(tier => tier.name === this.currentSubscription?.tierName);
    return currentTier ? currentTier.level < 3 : true;
  }

  canDowngrade(): boolean {
    if (!this.currentSubscription) return false;
    const currentTier = this.availableTiers.find(tier => tier.name === this.currentSubscription?.tierName);
    return currentTier ? currentTier.level > 1 : false;
  }

  openUpgradeModal() {
    this.showUpgradeModal = true;
    this.selectedTier = null;
  }

  openDowngradeModal() {
    this.showDowngradeModal = true;
    this.selectedTier = null;
  }

  openCancelModal() {
    this.showCancelModal = true;
  }

  closeModals() {
    this.showUpgradeModal = false;
    this.showDowngradeModal = false;
    this.showCancelModal = false;
    this.selectedTier = null;
  }

  selectTier(tier: ServiceTier) {
    this.selectedTier = tier;
  }

  getFilteredTiers(direction: 'upgrade' | 'downgrade'): ServiceTier[] {
    if (!this.currentSubscription) return this.availableTiers;
    
    const currentTier = this.availableTiers.find(tier => tier.name === this.currentSubscription?.tierName);
    if (!currentTier) return this.availableTiers;

    if (direction === 'upgrade') {
      return this.availableTiers.filter(tier => tier.level > currentTier.level);
    } else {
      return this.availableTiers.filter(tier => tier.level < currentTier.level);
    }
  }

  async confirmUpgrade() {
    if (!this.selectedTier) return;

    try {
      this.isLoading = true;
      const result = await this.paymentService.upgradeSubscription(
        this.selectedTier.id,
        this.billingCycle
      );
      
      if (result.success) {
        await this.loadCurrentSubscription();
        this.closeModals();
        alert('Subscription upgraded successfully!');
      } else {
        alert('Failed to upgrade subscription. Please try again.');
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      alert('An error occurred while upgrading. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async confirmDowngrade() {
    if (!this.selectedTier) return;

    try {
      this.isLoading = true;
      const result = await this.paymentService.downgradeSubscription(
        this.selectedTier.id,
        this.billingCycle
      );
      
      if (result.success) {
        await this.loadCurrentSubscription();
        this.closeModals();
        alert('Subscription downgraded successfully! Changes will take effect at the end of your current billing period.');
      } else {
        alert('Failed to downgrade subscription. Please try again.');
      }
    } catch (error) {
      console.error('Error downgrading subscription:', error);
      alert('An error occurred while downgrading. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async confirmCancel() {
    try {
      this.isLoading = true;
      const result = await this.paymentService.cancelSubscription();
      
      if (result.success) {
        await this.loadCurrentSubscription();
        this.closeModals();
        alert('Subscription cancelled successfully! You will retain access until the end of your current billing period.');
      } else {
        alert('Failed to cancel subscription. Please try again.');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('An error occurred while cancelling. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async reactivateSubscription() {
    try {
      this.isLoading = true;
      const result = await this.paymentService.reactivateSubscription();
      
      if (result.success) {
        await this.loadCurrentSubscription();
        alert('Subscription reactivated successfully!');
      } else {
        alert('Failed to reactivate subscription. Please try again.');
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      alert('An error occurred while reactivating. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  private loadUserAddress(): void {
    try {
      const email = this.authService.getUserEmail();
      if (!email) {
        this.addressError = 'No user email found.';
        return;
      }
      this.addressLoading = true;
      this.authService.checkUserStatusFull(email).subscribe({
        next: (resp) => {
          this.userId = resp?.user_id ?? null;
          if (this.userId === null) {
            this.addressLoading = false;
            this.addressError = 'Unable to determine user ID.';
            return;
          }
          this.authService.getUserLocations(this.userId).subscribe({
            next: (locResp) => {
              const locs = Array.isArray(locResp?.locations) ? locResp.locations : [];
              this.userLocations = locs;
              const valid = locs.filter(l => !l.expiry_status);
              const defaultLoc = valid.length ? valid[0] : (locs[0] || null);
              this.primaryAddress = defaultLoc ? (defaultLoc.zip_or_postal_code ? `${defaultLoc.location}, ${defaultLoc.zip_or_postal_code}` : defaultLoc.location) : null;
              this.addressLoading = false;
            },
            error: (err) => {
              console.error('Error fetching user locations', err);
              this.addressError = 'Error fetching user locations';
              this.addressLoading = false;
            }
          });
        },
        error: (err) => {
          console.error('Error fetching user status', err);
          this.addressError = 'Error fetching user status';
          this.addressLoading = false;
        }
      });
    } catch (e) {
      this.addressError = 'Unexpected error while fetching address';
      this.addressLoading = false;
    }
  }

  private loadUserPayments(): void {
    this.userEmail = this.authService.getUserEmail();
    if (!this.userEmail) {
      this.paymentsError = 'No user email found. Please sign in again.';
      return;
    }
    this.paymentsLoading = true;
    this.paymentsError = null;
    
    // Load payment history and subscription status
    this.paymentService.getUserPayments(this.userEmail).subscribe({
      next: (response) => {
        if (response.status && response.data) {
          this.payments = response.data;
        } else {
          this.payments = [];
        }
        this.paymentsLoading = false;
        this.computeSubscriptionWindow();
      },
      error: (err) => {
        console.error('Error fetching payments', err);
        this.paymentsError = err?.error?.detail || 'Error fetching payments';
        this.paymentsLoading = false;
        this.computeSubscriptionWindow();
      }
    });

    // Load subscription status
    this.paymentService.checkSubscriptionStatus(this.userEmail).subscribe({
      next: (status) => {
        this.subscriptionStatus = status;
        this.activeLocations = status.activeLocations;
      },
      error: (err) => {
        console.error('Error checking subscription status', err);
      }
    });
  }

  private computeSubscriptionWindow(): void {
    try {
      // Use active locations to determine subscription window
      if (this.activeLocations && this.activeLocations.length > 0) {
        // Find the earliest current_period_end from active locations
        const earliestEnd = this.activeLocations
          .map(loc => new Date(loc.current_period_end))
          .sort((a, b) => a.getTime() - b.getTime())[0];
        
        if (earliestEnd && !isNaN(earliestEnd.getTime())) {
          this.subscriptionEndDate = earliestEnd;
          // Calculate start date (30 days before end for monthly)
          const start = new Date(earliestEnd);
          start.setDate(start.getDate() - 30);
          this.subscriptionStartDate = start;
          return;
        }
      }
      
      // Fallback: use payment history
      if (this.payments && this.payments.length > 0) {
        const succeededPayments = this.payments
          .filter(p => p.new_status === 'SUCCEEDED')
          .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
        const base = succeededPayments.length ? succeededPayments[0] : this.payments[0];
        if (base && base.changed_at) {
          const start = new Date(base.changed_at);
          if (!isNaN(start.getTime())) {
            this.subscriptionStartDate = start;
            const end = new Date(start);
            end.setDate(end.getDate() + 30);
            this.subscriptionEndDate = end;
            return;
          }
        }
      }
      
      // No valid data found
      this.subscriptionStartDate = null;
      this.subscriptionEndDate = null;
    } catch (error) {
      console.error('Error computing subscription window:', error);
      this.subscriptionStartDate = null;
      this.subscriptionEndDate = null;
    }
  }

  formatDate(d: Date | null): string {
    if (!d) return 'N/A';
    try { return d.toLocaleDateString(); } catch { return 'N/A'; }
  }

  formatAmount(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
    } catch {
      return `$${amount}`;
    }
  }

  goToMyAccount(): void {
    this.router.navigate(['/my-account']);
  }

  // Map refund status to badge classes for consistent UI display
  refundBadgeClass(status: string | undefined): string {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING':
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'REFUNDED':
      case 'SUCCEEDED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'NONE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}