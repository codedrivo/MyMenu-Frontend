import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="text-center p-6">
        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-700">Completing sign-in…</p>
      </div>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    // Parse token and user info from query if provided
    const qp = this.route.snapshot.queryParamMap;

    const rawTokenParam = qp.get('token');
    const accessTokenParam = qp.get('access_token');
    const idTokenParam = qp.get('id_token');
    const userInfoParam = qp.get('userinfo') || qp.get('user_info');
    const emailParam = qp.get('email');

    let accessToken: string | null = null;
    let idToken: string | null = null;
    let email: string | null = null;

    try {
      // token may be a plain string or JSON with { access_token, id_token }
      if (rawTokenParam) {
        const decoded = decodeURIComponent(rawTokenParam);
        if (decoded.startsWith('{')) {
          const obj = JSON.parse(decoded);
          accessToken = obj?.access_token || accessToken;
          idToken = obj?.id_token || idToken;
        } else {
          accessToken = decoded;
        }
      }
      if (accessTokenParam) {
        accessToken = decodeURIComponent(accessTokenParam);
      }
      if (idTokenParam) {
        idToken = decodeURIComponent(idTokenParam);
      }

      // Store token preference: access token first, fallback to id token
      const tokenToStore = accessToken || idToken;
      if (tokenToStore) {
        this.authService.storeAuthToken(tokenToStore);
      }

      // Determine email
      if (emailParam) {
        email = emailParam;
      } else if (userInfoParam) {
        const info = JSON.parse(decodeURIComponent(userInfoParam));
        email = info?.email || info?.user?.email || null;
      } else if (idToken) {
        // Decode JWT to extract email claim
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
          const payload = JSON.parse(payloadJson);
          email = payload?.email || null;
        }
      }
    } catch (e) {
      console.error('Failed parsing callback params:', e);
    }

    const ensureToken = () => {
      const existing = this.authService.getAuthToken();
      if (!existing) {
        // Fallback token to satisfy client-side guard
        this.authService.storeAuthToken('oauth_authenticated');
      }
    };

    if (email) {
      this.authService.storeUserEmail(email);
      // Now check user status
      this.authService.checkUserStatus(email).subscribe({
        next: (res: { id: number; email: string; name: string; }) => {
          // Existing user
          this.authService.storeUserData(res);
          ensureToken();
          const returnUrl = localStorage.getItem('oauth_return_url') || '/user-dashboard';
          this.router.navigateByUrl(returnUrl);
        },
        error: (err: { status: any; }) => {
          // If 404, redirect to onboarding
          const status = err?.status;
          if (status === 404) {
            const returnUrl = localStorage.getItem('oauth_return_url') || '/user-dashboard';
            this.router.navigate(['/onboarding'], { queryParams: { email, returnUrl } });
          } else {
            console.error('User status check failed:', err);
            this.router.navigate(['/login']);
          }
        }
      });
    } else {
      // No email found, go back to login
      this.router.navigate(['/login']);
    }
  }
}