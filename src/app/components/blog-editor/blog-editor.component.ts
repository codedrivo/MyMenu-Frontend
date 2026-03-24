// components/blog-editor/blog-editor.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BlogService, BlogPost } from '../../services/blog.service';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-blog-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './blog-editor.component.html',
  styleUrls: ['./blog-editor.component.css']
})
export class BlogEditorComponent implements OnInit {
  blogForm: FormGroup;
  isEditMode = false;
  editingPostId: string | null = null;
  showPreview = false;
  previewContent = '';
  loading = false;
  error: string | null = null;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private blogService: BlogService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.blogForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      subtitle: [''],
      content: ['', [Validators.required, Validators.minLength(50)]],
      summary: ['', [Validators.required, Validators.maxLength(500)]],
      tags: [''],
      status: ['draft', Validators.required],
      featuredImageUrl: ['']
    });
  }

  ngOnInit(): void {
    // Check if editing existing post
    const postId = this.route.snapshot.paramMap.get('id');
    if (postId) {
      this.isEditMode = true;
      this.editingPostId = postId;
      this.loadPost(postId);
    }
  }

  loadPost(id: string): void {
    this.loading = true;
    this.error = null;
    
    this.blogService.getBlogPost(id).subscribe({
      next: (post) => {
        if (post) {
          this.blogForm.patchValue({
            title: post.title,
            subtitle: post.subtitle || '',
            content: post.content,
            summary: post.summary,
            tags: post.tags.join(', '),
            status: post.status,
            featuredImageUrl: post.featuredImageUrl || ''
          });
        } else {
          this.error = 'Blog post not found.';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading blog post:', error);
        this.error = 'Failed to load blog post.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.blogForm.valid && !this.saving) {
      this.saving = true;
      this.error = null;
      
      const formValue = this.blogForm.value;
      
      const blogData = {
        title: formValue.title,
        subtitle: formValue.subtitle,
        content: formValue.content,
        summary: formValue.summary,
        status: formValue.status,
        tags: formValue.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag),
        featuredImageUrl: formValue.featuredImageUrl
      };
  
      const operation = this.isEditMode && this.editingPostId
        ? this.blogService.updateBlogPost(this.editingPostId, blogData)
        : this.blogService.createBlogPost(blogData);
  
      operation.subscribe({
        next: (result) => {
          if (result) {
            const message = this.isEditMode ? 'Blog post updated successfully!' : 'Blog post created successfully!';
            alert(message);
            this.router.navigate(['/blog-admin']);
          } else {
            this.error = 'Failed to save blog post. Please try again.';
          }
          this.saving = false;
        },
        error: (error) => {
          console.error('Error saving blog post:', error);
          this.error = 'Failed to save blog post. Please try again.';
          this.saving = false;
        }
      });
    } else {
      this.markFormGroupTouched();
      this.error = 'Please fill in all required fields correctly.';
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.blogForm.controls).forEach(key => {
      this.blogForm.get(key)?.markAsTouched();
    });
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
    if (this.showPreview) {
      this.previewContent = this.blogForm.get('content')?.value || '';
    }
  }

  saveDraft(): void {
    this.blogForm.patchValue({ status: 'draft' });
    this.onSubmit();
  }

  publish(): void {
    this.blogForm.patchValue({ status: 'published' });
    this.onSubmit();
  }

  cancel(): void {
    this.router.navigate(['/blog-admin']);
  }

  // Helper methods for template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.blogForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.blogForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} is too short`;
      if (field.errors['maxlength']) return `${fieldName} is too long`;
    }
    return '';
  }
}