import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-oauth-failure',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth-failure.component.html',
  styleUrls: ['./oauth-failure.component.css', './auth-shared.css']
})
export class OAuthFailureComponent implements OnInit {
  message = 'Authentication failed. Please try again.';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const error = qp.get('error');
    if (error) {
      this.message = `Authentication failed: ${error}`;
    }
  }

  retry(): void {
    this.router.navigate(['/login']);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}