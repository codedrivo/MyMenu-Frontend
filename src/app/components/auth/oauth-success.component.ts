import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-oauth-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth-success.component.html',
  styleUrls: ['./oauth-success.component.css', './auth-shared.css']
})
export class OAuthSuccessComponent implements OnInit {
  message = 'Signed in successfully';
  processing = false;
  email = '';
  userExists: boolean | null = null;
  returnUrl = '/user-dashboard';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const userExistsRaw = qp.get('user_exists'); // '1' or '0'
    this.email = qp.get('email') || '';
    this.returnUrl = qp.get('returnUrl') || '/user-dashboard';

    // Optional tokens from provider
    const token = qp.get('token') || qp.get('access_token') || qp.get('id_token');
    if (token) {
      this.authService.storeAuthToken(token);
    }

    if (!this.email) {
      this.message = 'Missing email from OAuth success redirect.';
      return;
    }

    // Persist email for later
    this.authService.storeUserEmail(this.email);

    this.userExists = userExistsRaw === '1' ? true : userExistsRaw === '0' ? false : null;
  }

  private ensureToken(): void {
    const existing = this.authService.getAuthToken();
    if (!existing) {
      // Fallback token to satisfy auth guard for OAuth sessions
      this.authService.storeAuthToken('oauth_authenticated');
    }
  }

  continue(): void {
    if (!this.email) return;

    if (this.userExists) {
      // Existing user: verify status then continue to returnUrl
      this.processing = true;
      this.authService.checkUserStatus(this.email).subscribe({
        next: (res: { id: number; email: string; name: string }) => {
          this.authService.storeUserData(res);
          this.ensureToken();
          this.router.navigateByUrl(this.returnUrl);
        },
        error: (err: { status: any }) => {
          const status = err?.status;
          if (status === 404) {
            this.router.navigate(['/onboarding'], { queryParams: { email: this.email, returnUrl: this.returnUrl } });
          } else {
            this.processing = false;
            this.message = 'Unable to verify user. Please try again.';
          }
        }
      });
    } else {
      // New user: go to onboarding
      this.router.navigate(['/onboarding'], { queryParams: { email: this.email, returnUrl: this.returnUrl } });
    }
  }
}