import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, map, catchError, of } from 'rxjs';
import { AuthService } from '../auth.service';
import { AppEnv } from '../config/env';

export interface BlogPost {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  summary: string;
  author: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  status: 'draft' | 'published';
  tags: string[];
  featuredImageUrl?: string;
  authorId: number;
}

export interface BlogPostRequest {
  title: string;
  subtitle?: string;
  content: string;
  summary: string;
  tags: string[];
  featuredImageUrl?: string;
  status: 'draft' | 'published';
  authorId: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface BlogPostsResponse {
  posts: BlogPost[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private baseUrl = `${AppEnv.API_BASE_URL}/api/blog`;
  private blogPostsSubject = new BehaviorSubject<BlogPost[]>([]);
  public blogPosts$ = this.blogPostsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.loadBlogPosts();
  }

  private getAuthHeaders() {
    const token = this.authService.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  loadBlogPosts(status?: 'draft' | 'published', limit: number = 50, offset: number = 0): Observable<BlogPost[]> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<ApiResponse<BlogPostsResponse>>(`${this.baseUrl}/posts`, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success) {
          this.blogPostsSubject.next(response.data.posts);
          return response.data.posts;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error loading blog posts:', error);
        return of([]);
      })
    );
  }

  getBlogPosts(): Observable<BlogPost[]> {
    return this.loadBlogPosts();
  }

  getBlogPost(id: string): Observable<BlogPost | null> {
    return this.http.get<ApiResponse<BlogPost>>(`${this.baseUrl}/posts/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => response.success ? response.data : null),
      catchError(error => {
        console.error('Error loading blog post:', error);
        return of(null);
      })
    );
  }

  createBlogPost(post: Omit<BlogPostRequest, 'authorId'>): Observable<BlogPost | null> {
    const userData = this.authService.getUserData();
    const postData: BlogPostRequest = {
      ...post,
      authorId: userData?.id || 1
    };

    return this.http.post<ApiResponse<BlogPost>>(`${this.baseUrl}/posts`, postData, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success) {
          this.loadBlogPosts().subscribe(); // Refresh the list
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error creating blog post:', error);
        return of(null);
      })
    );
  }

  updateBlogPost(id: string, updates: Partial<BlogPostRequest>): Observable<BlogPost | null> {
    return this.http.put<ApiResponse<BlogPost>>(`${this.baseUrl}/posts/${id}`, updates, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success) {
          this.loadBlogPosts().subscribe(); // Refresh the list
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error updating blog post:', error);
        return of(null);
      })
    );
  }

  deleteBlogPost(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/posts/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.success) {
          this.loadBlogPosts().subscribe(); // Refresh the list
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('Error deleting blog post:', error);
        return of(false);
      })
    );
  }

  changePostStatus(id: string, status: 'draft' | 'published'): Observable<BlogPost | null> {
    return this.http.patch<ApiResponse<BlogPost>>(`${this.baseUrl}/posts/${id}/status`, 
      { status }, 
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => {
        if (response.success) {
          this.loadBlogPosts().subscribe(); // Refresh the list
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error changing post status:', error);
        return of(null);
      })
    );
  }

  getPostsByAuthor(authorId: number): Observable<BlogPost[]> {
    return this.http.get<ApiResponse<{ posts: BlogPost[], total: number }>>(
      `${this.baseUrl}/posts/author/${authorId}`, 
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => response.success ? response.data.posts : []),
      catchError(error => {
        console.error('Error loading posts by author:', error);
        return of([]);
      })
    );
  }

  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}