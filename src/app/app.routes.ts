// app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { UserDashboardComponent } from './user-dashboard/user-dashboard.component';

export const routes: Routes = [
    {
        path: 'user-dashboard',
        loadComponent: () => import('./user-dashboard/user-dashboard.component')
            .then(m => m.UserDashboardComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'tabledemo',
        loadComponent: () => import('./user-dashboard/tabledemo/tabledemo.component')
            .then(m => m.TableDemoComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'auth/callback',
        loadComponent: () => import('./components/auth/auth-callback.component')
            .then(m => m.AuthCallbackComponent)
    },
    {
        path: 'oauth/callback',
        loadComponent: () => import('./components/auth/oauth-callback.component')
            .then(m => m.OAuthCallbackComponent)
    },
    {
        path: 'login',
        loadComponent: () => import('./login/login.component')
            .then(m => m.LoginComponent)
    },
    // Payment and Subscription Routes
    {
        path: 'pricing',
        loadComponent: () => import('./components/pricing/pricing-selection.component')
            .then(m => m.PricingSelectionComponent)
    },
    
    {
        path: 'payment',
        loadComponent: () => import('./components/payment/stripe-payment.component')
            .then(m => m.StripePaymentComponent)
    },
    {
        path: 'subscription',
        loadComponent: () => import('./components/subscription/subscription-management.component')
            .then(m => m.SubscriptionManagementComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'payment-demo',
        loadComponent: () => import('./components/payment/payment-demo.component')
            .then(m => m.PaymentDemoComponent)
    },
    {
        path: 'payment-result',
        loadComponent: () => import('./components/payment/payment-result.component')
            .then(m => m.PaymentResultComponent),
        // Public route: accessible without authentication
    },
    {
        path: 'refund-result',
        loadComponent: () => import('./components/payment/refund-result.component')
            .then(m => m.RefundResultComponent)
    },
    {
        path: 'my-account',
        loadComponent: () => import('./components/letsstart/lets-srarted/registration/my-account.component')
            .then(m => m.MyAccountComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'contact',
        loadComponent: () => import('./components/contact/contact.component')
            .then(m => m.ContactComponent)
    },
    {
        path: '',
        redirectTo: '/login',
        pathMatch: 'full'
    },

];
