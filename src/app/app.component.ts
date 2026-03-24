import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { FooterComponent } from './components/footer/footer.component';
import { RouterOutlet, RouterModule, NavigationEnd, Router } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { filter } from 'rxjs/operators';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { IdleTimerService } from './services/idle-timer.service';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'mymenu';

  constructor(private router: Router, @Inject(PLATFORM_ID) private platformId: Object,
    private idleTimerService: IdleTimerService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Set up the logout callback to avoid circular dependency
    this.idleTimerService.setLogoutCallback(() => {
      this.authService.logout();
    });

    // Start idle timer if user is already logged in (e.g., page refresh)
    if (this.authService.isLoggedIn()) {
      this.idleTimerService.startWatching();
    }
  }
}