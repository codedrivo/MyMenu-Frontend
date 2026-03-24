import { ApplicationConfig } from '@angular/core';
import { provideRouter, Route } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AdminGuard } from './admin.guard';
import { AuthGuard } from './auth.guard';
import { SubscriptionGuard } from './subscription.guard';
import { MockApiService } from './services/mock-api.service';

import { HomeComponent } from './components/home/home.component';
import { FeaturesComponent } from './components/features/features.component';
import { TechoverviewComponent } from './components/techoverview/techoverview.component';
import { LetsstartComponent } from './components/letsstart/letsstart.component';
import { AboutComponent } from './components/about/about.component';
import { ContactComponent } from './components/contact/contact.component';
import { DemoVideoComponent } from './components/demo-video/demo-video.component';
import { DisplayPageComponent } from './components/letsstart/lets-srarted/display-page/display-page.component';
import { DisplayformoneComponent } from './components/letsstart/lets-srarted/displayformone/displayformone.component';

import { UserDashboardComponent } from './user-dashboard/user-dashboard.component';
import { DownloadTemplateComponent } from './user-dashboard/download-template/download-template.component';
import { BulkUploadComponent } from './user-dashboard/bulk-upload/bulk-upload.component';
import { ReportsComponent } from './user-dashboard/reports/reports.component';
import { TableDemoComponent } from './user-dashboard/tabledemo/tabledemo.component';
import { TermsAndConditionsComponent } from './components/terms-and-conditions/terms-and-conditions.component';
// Blog Components
import { BlogComponent } from './components/blog/blog.component';
import { BlogLoginComponent } from './components/blog-login/blog-login.component';
import { BlogEditorComponent } from './components/blog-editor/blog-editor.component';
import { BlogAdminComponent } from './components/blog-admin/blog-admin.component';
import { SignupComponent } from './components/signup/signup.component';
import { HeatmapComponent } from './components/heatmap/heatmap.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

// Add this import at the top with the other component imports
// import { ServiceRequestComponent } from './components/service-request/service-request.component';



const routes: Route[] = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { 
    path: 'home', 
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent)
  },
  { 
    path: 'features', 
    loadComponent: () => import('./components/features/features.component').then(m => m.FeaturesComponent)
  },
  { 
    path: 'techoverview', 
    loadComponent: () => import('./components/techoverview/techoverview.component').then(m => m.TechoverviewComponent)
  },
  { path: 'letsstart', component: LetsstartComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'demo-video', component: DemoVideoComponent },
  { path: 'displayformone', component: DisplayformoneComponent },
  { path: 'display', component: DisplayPageComponent },
  { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
  { path: 'signup', redirectTo: '/login', pathMatch: 'full' },
  { path: 'user-dashboard', loadComponent: () => import('./user-dashboard/user-dashboard.component').then(m => m.UserDashboardComponent), canActivate: [SubscriptionGuard] },
  { path: 'download-template', component: DownloadTemplateComponent, canActivate: [SubscriptionGuard] },
  { path: 'bulk-upload', component: BulkUploadComponent, canActivate: [SubscriptionGuard] },
  { path: 'reports', component: ReportsComponent, canActivate: [SubscriptionGuard] },
  { path: 'tabledemo', loadComponent: () => import('./user-dashboard/tabledemo/tabledemo.component').then(m => m.TableDemoComponent), canActivate: [SubscriptionGuard] },
  { path: 'TermsAndConditions', component: TermsAndConditionsComponent },
  { path: 'heatmap', component: HeatmapComponent },

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
    path: 'multi-location-payment',
    loadComponent: () => import('./components/payment/multi-location-payment.component')
        .then(m => m.MultiLocationPaymentComponent),
    canActivate: [AuthGuard]
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
    path: 'test-multi-location',
    loadComponent: () => import('./components/payment/test-multi-location.component')
        .then(m => m.TestMultiLocationComponent)
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
        .then(m => m.RefundResultComponent),
  },
  {
    path: 'subscription/success',
    loadComponent: () => import('./components/payment/payment-result.component')
        .then(m => m.PaymentResultComponent),
  },
  {
    path: 'subscription/cancel',
    loadComponent: () => import('./components/payment/payment-result.component')
        .then(m => m.PaymentResultComponent),
  },
  {
    path: 'my-account',
    loadComponent: () => import('./components/letsstart/lets-srarted/registration/my-account.component')
        .then(m => m.MyAccountComponent),
    canActivate: [AuthGuard]
  },

  // Blog Routes
  { path: 'blog', component: BlogComponent },
  { path: 'blog-login', component: BlogLoginComponent },
  { path: 'blog-admin', component: BlogAdminComponent, canActivate: [AdminGuard] },
  { path: 'blog-editor', component: BlogEditorComponent, canActivate: [AdminGuard] },
  { path: 'blog-editor/:id', component: BlogEditorComponent, canActivate: [AdminGuard] },
  { path: 'auth/callback', loadComponent: () => import('./components/auth/auth-callback.component').then(m => m.AuthCallbackComponent) },

  { path: 'auth/onboarding', loadComponent: () => import('./components/auth/onboarding.component').then(m => m.OnboardingComponent) },
  { path: 'onboarding', loadComponent: () => import('./components/auth/onboarding.component').then(m => m.OnboardingComponent) },
  { path: 'auth/success', loadComponent: () => import('./components/auth/oauth-success.component').then(m => m.OAuthSuccessComponent) },
  { path: 'auth/failure', loadComponent: () => import('./components/auth/oauth-failure.component').then(m => m.OAuthFailureComponent) },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideAnimationsAsync(),
    MockApiService,
  ]
};


  
