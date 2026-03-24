// components/blog-admin/blog-admin.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BlogService, BlogPost } from '../../services/blog.service';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-blog-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blog-admin.component.html',
  styleUrls: ['./blog-admin.component.css']
})
export class BlogAdminComponent implements OnInit {
  blogPosts: BlogPost[] = [];
  filteredPosts: BlogPost[] = [];
  filterStatus: 'all' | 'published' | 'draft' = 'all';
  loading = false;
  error: string | null = null;

  constructor(
    private blogService: BlogService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBlogPosts();
  }

  loadBlogPosts(): void {
    this.loading = true;
    this.error = null;
    
    this.blogService.getBlogPosts().subscribe({
      next: (posts) => {
        this.blogPosts = posts.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        this.applyFilter();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading blog posts:', error);
        this.error = 'Failed to load blog posts. Please try again.';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    if (this.filterStatus === 'all') {
      this.filteredPosts = this.blogPosts;
    } else {
      this.filteredPosts = this.blogPosts.filter(post => post.status === this.filterStatus);
    }
  }

  onFilterChange(status: 'all' | 'published' | 'draft'): void {
    this.filterStatus = status;
    this.applyFilter();
  }

  // Count methods for template
  getTotalCount(): number {
    return this.blogPosts.length;
  }

  getPublishedCount(): number {
    return this.blogPosts.filter(post => post.status === 'published').length;
  }

  getDraftCount(): number {
    return this.blogPosts.filter(post => post.status === 'draft').length;
  }

  createNewPost(): void {
    this.router.navigate(['/blog-editor']);
  }

  editPost(id: string): void {
    this.router.navigate(['/blog-editor', id]);
  }

  deletePost(id: string): void {
    if (confirm('Are you sure you want to delete this blog post?')) {
      this.loading = true;
      this.blogService.deleteBlogPost(id).subscribe({
        next: (success) => {
          if (success) {
            this.loadBlogPosts();
          } else {
            this.error = 'Failed to delete blog post.';
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Error deleting blog post:', error);
          this.error = 'Failed to delete blog post.';
          this.loading = false;
        }
      });
    }
  }

  toggleStatus(post: BlogPost): void {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    this.loading = true;
    
    this.blogService.changePostStatus(post.id, newStatus).subscribe({
      next: (updatedPost) => {
        if (updatedPost) {
          // Update the local post status
          const index = this.blogPosts.findIndex(p => p.id === post.id);
          if (index !== -1) {
            this.blogPosts[index] = updatedPost;
            this.applyFilter();
          }
        } else {
          this.error = 'Failed to update post status.';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error updating post status:', error);
        this.error = 'Failed to update post status.';
        this.loading = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/blog-login']);
  }
}