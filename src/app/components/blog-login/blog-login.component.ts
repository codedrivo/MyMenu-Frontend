import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-blog-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './blog-login.component.html',
  styleUrls: ['./blog-login.component.css']
})
export class BlogLoginComponent {
  myForm: FormGroup;
  errorMessage: string = '';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.myForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Login with email and password using the external API
  login() {
    this.errorMessage = '';
    
    if (this.myForm.valid) {
      const email = this.myForm.get('email')?.value;
      const password = this.myForm.get('password')?.value;
      
      // Check if email is in admin list
      if (!this.isAdminEmail(email)) {
        this.errorMessage = 'Access denied. Only admin emails are allowed for blog management.';
        return;
      }
      
      this.isLoading = true;
      
      // Call the external API for authentication
      this.authService.loginWithPassword(email, password).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.data) {
            // console.log('Login successful:', response.data.user);
            // Redirect to blog admin dashboard
            this.router.navigate(['/blog-admin']);
          } else {
            this.errorMessage = response.message || 'Login failed';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Login failed. Please check your credentials and try again.';
          console.error('Login error:', error);
        }
      });
      
    } else {
      this.errorMessage = 'Please fill in all required fields correctly.';
    }
  }

  // Check if email is in admin list
  private isAdminEmail(email: string): boolean {
    const adminEmails = [
      'admin@mymenu.ai',
      'editor@mymenu.ai',
      'blog@mymenu.ai',
      'sunilreddyvk17@gmail.com',
      'admin@example.com' // Added for your test API
    ];
    return adminEmails.includes(email.toLowerCase());
  }

  // Go back to blog page
  goBack() {
    this.router.navigate(['/blog']);
  }
}