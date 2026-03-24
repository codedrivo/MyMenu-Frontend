import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  publishDate: Date;
  category: string;
  tags: string[];
  featuredImage: string;
  readTime: number;
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.css'
})
export class BlogComponent implements OnInit {
  blogPosts: BlogPost[] = [
    {
      id: 1,
      title: "AI-Driven Menu Pricing: The Future of Restaurant Profitability",
      slug: "ai-driven-menu-pricing-future-restaurant-profitability",
      excerpt: "Discover how artificial intelligence is revolutionizing restaurant pricing strategies and boosting profit margins across the food service industry.",
      content: "",
      author: "Vasu Yedavalli",
      publishDate: new Date('2024-01-15'),
      category: "AI Technology",
      tags: ["AI", "Pricing", "Restaurant Technology"],
      featuredImage: "assets/features1.jpg",
      readTime: 5
    },
    {
      id: 2,
      title: "Seasonal Menu Optimization: Maximizing Profits Year-Round",
      slug: "seasonal-menu-optimization-maximizing-profits",
      excerpt: "Learn how to adapt your menu pricing and offerings to seasonal trends for consistent profitability throughout the year.",
      content: "",
      author: "Krish Krithivasan",
      publishDate: new Date('2024-01-10'),
      category: "Menu Strategy",
      tags: ["Seasonal", "Menu Planning", "Profit Optimization"],
      featuredImage: "assets/features2.jpg",
      readTime: 7
    },
    {
      id: 3,
      title: "The Psychology of Menu Design: How Layout Affects Customer Spending",
      slug: "psychology-menu-design-customer-spending",
      excerpt: "Explore the psychological principles behind effective menu design and how strategic placement can increase average order value.",
      content: "",
      author: "James Bowtell",
      publishDate: new Date('2024-01-05'),
      category: "Menu Psychology",
      tags: ["Menu Design", "Psychology", "Customer Behavior"],
      featuredImage: "assets/features3.jpg",
      readTime: 6
    }
  ];

  featuredPost: BlogPost | null = null;
  categories: string[] = [];

  ngOnInit() {
    this.featuredPost = this.blogPosts[0];
    this.categories = [...new Set(this.blogPosts.map(post => post.category))];
  }

  // For now, just show alert when clicking read more
  readMore(slug: string) {
    alert(`Blog post: ${slug} - Full blog post functionality coming soon!`);
  }
  
  constructor(private router: Router) {}
  
  navigateToBlogLogin(): void {
    this.router.navigate(['/blog-login']);
  }
}