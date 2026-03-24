import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../auth.service';
import { ReportPreloaderService } from '../../services/report-preloader.service';

interface CheckUserStatusResponse {
  user_id: number;
  email: string;
  user_name: string;
  free_tier_user: boolean;
  search_count: number;
  search_count_exceeded: boolean;
}

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth-callback.component.html',
  styleUrls: ['./auth-shared.css']
})
export class OAuthCallbackComponent implements OnInit {
  status: 'processing' | 'error' = 'processing';
  message = 'Processing authentication...';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private reportPreloader: ReportPreloaderService
  ) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const token = qp.get('token');
    const returnUrl = qp.get('returnUrl') || '/user-dashboard';

    let email = qp.get('email');
    const userInfoRaw = qp.get('user_info');

    // Try to parse user_info if provided
    if (!email && userInfoRaw) {
      try {
        const decoded = this.safeParse(userInfoRaw);
        if (decoded && typeof decoded === 'object' && 'email' in decoded) {
          email = (decoded as any).email;
        }
      } catch {}
    }

    if (token) {
      this.authService.storeAuthToken(token);
    }
    if (email) {
      this.authService.storeUserEmail(email);
    }

    if (!email) {
      this.status = 'error';
      this.message = 'Missing email from OAuth callback.';
      // Navigate back to login in a moment
      setTimeout(() => this.router.navigate(['/login']), 1500);
      return;
    }

    // Check user status
    this.http.post<CheckUserStatusResponse>(
        `${AppEnv.API_BASE_URL}/users/check-user-status`,
      { email }
    ).subscribe({
      next: (resp) => {
        // Existing user: store data and continue
        this.authService.storeUserData({ id: resp.user_id, email: resp.email, name: resp.user_name });
        
        // Trigger report preloading in background
        this.reportPreloader.preloadReports(resp.email);
        
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        if (err?.status === 404) {
          // New user: go to onboarding, preserve email and returnUrl
          this.router.navigate(['/onboarding'], { queryParams: { email, returnUrl } });
        } else {
          this.status = 'error';
          this.message = 'Authentication failed. Please try again.';
          setTimeout(() => this.router.navigate(['/login']), 2000);
        }
      }
    });
  }

  private safeParse(raw: string): any | null {
    try {
      // Try JSON
      return JSON.parse(raw);
    } catch {
      try {
        // Try base64 JSON
        const decoded = atob(raw);
        return JSON.parse(decoded);
      } catch {
        return null;
      }
    }
  }
}
import { AppEnv } from '../../config/env';