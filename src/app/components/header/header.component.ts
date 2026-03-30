import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { RouterModule, NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { Fancybox } from "@fancyapps/ui";

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  isMobileMenuOpen = false;
  showLoginButton: boolean = false;
  showLogoutConfirmation: boolean = false;
  authUiEnabled: boolean = true;
  isAccountMenuOpen: boolean = false;

  mainScreens: string[] = ['/home', '/about', '/features', '/techoverview', '/letsstart', '/contact'];

  constructor(private router: Router, private authService: AuthService) {
    // Subscribe to router events
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // Scroll to top after navigation is complete
        window.scrollTo(0, 0);
      }
    });
  }

  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // Close the mobile menu whenever navigation completes
        this.isMobileMenuOpen = false;
        // Also close the account dropdown on navigation
        this.isAccountMenuOpen = false;
        // Check if the current route matches any in the mainScreens array
        this.showLoginButton = this.mainScreens.includes(event.url);
      }
    });
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleAccountMenu(): void {
    this.isAccountMenuOpen = !this.isAccountMenuOpen;
  }

  // Accept the click event and stop propagation so the document-level
  // click handler does not immediately close the confirmation modal
  logout(event?: Event): void {
    event?.stopPropagation();
    // Show logout confirmation instead of directly logging out
    this.showLogoutConfirmation = true;
    // Close account dropdown when initiating logout
    this.isAccountMenuOpen = false;
  }

  confirmLogout(): void {
    this.authService.logout();
    this.showLogoutConfirmation = false;
    this.isAccountMenuOpen = false;
    this.router.navigate(['/home']).then(() => {
      // Ensure UI picks up cleared state
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    });
  }

  cancelLogout(): void {
    this.showLogoutConfirmation = false;
  }

  // Close mobile menu when clicking outside of it
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.lg\\:hidden') && !target.closest('.absolute')) {
      this.isMobileMenuOpen = false;
    }
    
    // Close logout confirmation if clicking outside
    if (this.showLogoutConfirmation && !target.closest('.logout-confirmation')) {
      this.showLogoutConfirmation = false;
    }

    // Close account dropdown if clicking outside
    if (this.isAccountMenuOpen && !target.closest('.account-menu')) {
      this.isAccountMenuOpen = false;
    }
  }
  
  // Add this method to close menu when a link is clicked
  closeMenu(): void {
    this.isMobileMenuOpen = false;
  }

  // Close account dropdown explicitly (e.g., after clicking Account Settings)
  closeAccountMenu(): void {
    this.isAccountMenuOpen = false;
  }

  // Navigate to Extended Search based on authentication status
  navigateToExtendedSearch(): void {
    if (this.isLoggedIn) {
      // User is logged in, navigate to user dashboard
      this.router.navigate(['/user-dashboard']);
    } else {
      // User is not logged in, navigate to login page
      this.router.navigate(['/login']);
    }
    // Close mobile menu if open
    this.closeMenu();
  }

  isExtendedSearchActive(): boolean {
    return this.router.url === '/user-dashboard' || this.router.url === '/login';
  }
  openDemoVideo(): void {
  //this.router.navigate(['/demo-video']);
  Fancybox.show([
    {
      src: "/assets/MyMenuDemo-2.mp4",
      type: "html5video",
    },
  ]);
}
}