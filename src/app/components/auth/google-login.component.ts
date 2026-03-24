import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-google-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './google-login.component.html',
  styleUrls: ['./google-login.component.css']
})
export class GoogleLoginComponent {
  private returnUrl: string | null;

  constructor(private route: ActivatedRoute, private router: Router) {
    // Always redirect to /user-dashboard after successful OAuth (for extended search)
    this.returnUrl = '/user-dashboard';
  }

  continueWithGoogle(): void {
    const frontendCallbackBase = `${window.location.origin}/auth/callback`;
    const targetReturnUrl = '/user-dashboard';
    const callbackUrl = `${frontendCallbackBase}?returnUrl=${encodeURIComponent(targetReturnUrl)}`;

    // Persist return URL for callback component fallback
    try {
      localStorage.setItem('oauth_return_url', targetReturnUrl);
    } catch {}

    const oauthUrl = `${AppEnv.API_BASE_URL}/login/google?redirect_to=${encodeURIComponent(callbackUrl)}&prompt=select_account`;
    // Redirect to backend OAuth; backend will handle Google flow and callback
    window.location.href = oauthUrl;
  }
}
import { AppEnv } from '../../config/env';