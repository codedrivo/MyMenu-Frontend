// admin.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const isAdmin = this.authService.isAdmin();
    const loggedIn = this.authService.isLoggedIn();
    // console.log('Admin Guard Check - Is Admin:', isAdmin);

    if (loggedIn && isAdmin) {
      // console.log('Admin access granted to:', state.url);
      return true;
    }

    // console.log('Admin access denied - redirecting to login');
    const target = state.url.includes('/blog-')
      ? ['/blog-login']
      : ['/login'];

    return this.router.createUrlTree(target, {
      queryParams: { returnUrl: state.url, message: 'Admin access required' }
    });
  }
}