// auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const loggedIn = this.authService.isLoggedIn();
    // console.log('Auth Guard Check - Is Logged In:', loggedIn);

    if (loggedIn) {
      // console.log('Access granted to:', state.url);
      return true;
    }

    // console.log('Access denied - redirecting to login');
    return this.router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }
}