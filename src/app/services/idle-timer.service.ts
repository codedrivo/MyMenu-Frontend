import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class IdleTimerService {
  private idleTimer: any;
  private readonly IDLE_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds
  private readonly WARNING_TIME = 9 * 60 * 1000; // 9 minutes - show warning 1 minute before logout
  private warningTimer: any;
  private isWarningShown = false;
  private isActive = false;
  private logoutCallback: (() => void) | null = null;

  // Events that indicate user activity
  private readonly ACTIVITY_EVENTS = [
    'mousedown',
    'mousemove', 
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ];

  constructor(
    private router: Router,
    private ngZone: NgZone
  ) {}

  /**
   * Set the logout callback function
   */
  setLogoutCallback(callback: () => void): void {
    this.logoutCallback = callback;
  }

  /**
   * Start monitoring user activity
   */
  startWatching(): void {
    this.isActive = true;
    this.resetTimer();
    this.bindActivityEvents();
  }

  /**
   * Stop monitoring user activity
   */
  stopWatching(): void {
    this.isActive = false;
    this.clearTimers();
    this.unbindActivityEvents();
  }

  /**
   * Reset the idle timer when user activity is detected
   */
  private resetTimer(): void {
    if (!this.isActive) return;

    this.clearTimers();
    this.isWarningShown = false;

    // Set warning timer (9 minutes)
    this.warningTimer = setTimeout(() => {
      this.showWarning();
    }, this.WARNING_TIME);

    // Set logout timer (10 minutes)
    this.idleTimer = setTimeout(() => {
      this.logout();
    }, this.IDLE_TIME);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  /**
   * Bind activity event listeners
   */
  private bindActivityEvents(): void {
    this.ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, this.onActivity.bind(this), true);
    });
  }

  /**
   * Unbind activity event listeners
   */
  private unbindActivityEvents(): void {
    this.ACTIVITY_EVENTS.forEach(event => {
      document.removeEventListener(event, this.onActivity.bind(this), true);
    });
  }

  /**
   * Handle user activity
   */
  private onActivity(): void {
    if (!this.isActive) return;

    this.ngZone.run(() => {
      this.resetTimer();
      this.hideWarning();
    });
  }

  /**
   * Show warning dialog before logout
   */
  private showWarning(): void {
    if (this.isWarningShown || !this.isActive) return;

    this.isWarningShown = true;
    
    const confirmed = confirm(
      'Your session will expire in 1 minute due to inactivity. Click OK to continue your session or Cancel to logout now.'
    );

    if (confirmed) {
      // User wants to continue - reset timer
      this.resetTimer();
    } else {
      // User chose to logout
      this.logout();
    }
  }

  /**
   * Hide warning dialog
   */
  private hideWarning(): void {
    this.isWarningShown = false;
  }

  /**
   * Logout user due to inactivity
   */
  private logout(): void {
    if (!this.isActive) return;

    this.stopWatching();
    
    // Call the logout callback if set
    if (this.logoutCallback) {
      this.logoutCallback();
    }
    
    alert('You have been logged out due to inactivity.');
    this.router.navigate(['/login']);
  }

  /**
   * Manually extend session (can be called from components)
   */
  extendSession(): void {
    if (this.isActive) {
      this.resetTimer();
      this.hideWarning();
    }
  }

  /**
   * Check if user is currently active/being monitored
   */
  isWatching(): boolean {
    return this.isActive;
  }
}