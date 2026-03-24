import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule, CommonModule], // Import CommonModule for ViewportScroller
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {

  constructor(private router: Router, private viewportScroller: ViewportScroller) {}

  // Method to scroll to the top
  scrollToTop() {
    this.viewportScroller.scrollToPosition([0, 0]);
  }

  // Optional: Navigate to a route and scroll to the top
  navigateAndScrollToTop(route: string) {
    this.router.navigate([route]).then(() => {
      this.scrollToTop();
    });
  }
}