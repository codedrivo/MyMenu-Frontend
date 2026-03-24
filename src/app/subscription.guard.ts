import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { PaymentService } from './services/payment.service';

@Injectable({ providedIn: 'root' })
export class SubscriptionGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private paymentService: PaymentService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // First check if user is logged in
    if (!this.authService.isLoggedIn()) {
      // console.log('Subscription Guard: User not logged in, redirecting to login');
      return this.router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      });
    }

    // Get user email from auth service
    const userEmail = this.authService.getUserEmail();
    if (!userEmail) {
      // console.log('Subscription Guard: No user email found, redirecting to login');
      return this.router.createUrlTree(['/login']);
    }

    // Check subscription status
    return this.paymentService.checkSubscriptionStatus(userEmail).pipe(
      map(subscriptionStatus => {
        // console.log('Subscription Guard: Subscription status check result:', subscriptionStatus);
        
        if (subscriptionStatus.hasActiveSubscription && subscriptionStatus.activeLocations.length > 0) {
          // console.log('Subscription Guard: User has active subscription, access granted to:', state.url);
          return true;
        } else {
          // console.log('Subscription Guard: No active subscription found, redirecting to pricing');
          // Store the attempted URL for redirect after subscription
          sessionStorage.setItem('redirectAfterSubscription', state.url);
          return this.router.createUrlTree(['/pricing'], {
            queryParams: { 
              message: 'Extended search requires an active subscription. Please subscribe to continue.',
              returnUrl: state.url 
            }
          });
        }
      }),
      catchError(error => {
        console.error('Subscription Guard: Error checking subscription status:', error);
        // On error, redirect to pricing page with error message
        return of(this.router.createUrlTree(['/pricing'], {
          queryParams: { 
            message: 'Unable to verify subscription status. Please ensure you have an active subscription.',
            returnUrl: state.url 
          }
        }));
      })
    );
  }
}