import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { AuthService } from '../../auth.service';

interface ReportMetadata {
  id: string;
  name: string;
  description: string;
  type: 'available' | 'coming-soon';
  downloadUrl?: string;
  viewUrl?: string;
}

// Update the @Component decorator to remove the reference to the non-existent CSS file
@Component({
  selector: 'app-report-landing',
  templateUrl: './report-landing.component.html',
  styleUrls: [], // Remove reference to non-existent CSS file
  standalone: true,
  imports: [CommonModule],
})
export class ReportLandingComponent implements OnInit {
  restaurantName: string = '';
  menuItemName: string = '';
  loading: boolean = true;
  error: string | null = null;
  isDownloading: boolean = false;
  downloadProgress: number = 0;
  progressInterval: any;
  
  // Available reports
  availableReports: ReportMetadata[] = [
    {
      id: 'full-report',
      name: 'Full Report',
      description: 'Complete report on every match for every item on the menu',
      type: 'available',
    },
    {
      id: 'itemized-report',
      name: 'Itemized Report',
      description: 'Every match for each item on the menu, split into different tables',
      type: 'available',
    },
    {
      id: 'price-positioning-report',
      name: 'Price Positioning Report',
      description: 'The positioning of price for each item compared to other prices',
      type: 'available',
    }
  ];
  
  // Coming soon reports
  comingSoonReports: ReportMetadata[] = [
    {
      id: 'revenue-forecast',
      name: 'Predicted Revenue Forecast',
      description: 'Projects future revenue based on past performance, trends, and local conditions',
      type: 'coming-soon'
    },
    {
      id: 'profitability-report',
      name: 'Menu Item Profitability Report',
      description: 'Shows profit per item to highlight high-margin performers',
      type: 'coming-soon'
    },
    {
      id: 'price-impact',
      name: 'Price Change Impact Analysis',
      description: 'Estimates how proposed price changes will affect revenue, sales volume, and profit margins',
      type: 'coming-soon'
    },
    {
      id: 'market-comparison',
      name: 'Market Price Comparison Report',
      description: 'Compares your prices to nearby competitors',
      type: 'coming-soon'
    },
    {
      id: 'demand-forecast',
      name: 'Customer Demand Forecast',
      description: 'Predicts when and where specific items will sell more',
      type: 'coming-soon'
    },
    {
      id: 'menu-optimization',
      name: 'Menu Optimization Suggestions',
      description: 'AI-based suggestions on tweaking menu items or removing underperformers',
      type: 'coming-soon'
    },
    {
      id: 'combo-optimization',
      name: 'Combo Optimization Report',
      description: 'Recommends bundled items that drive higher average ticket sizes and margins',
      type: 'coming-soon'
    },
    {
      id: 'dynamic-pricing',
      name: 'Dynamic Pricing Recommendations',
      description: 'Suggests real-time price changes based on demand, time of day, or seasonality',
      type: 'coming-soon'
    },
    {
      id: 'sales-margin',
      name: 'Sales and Margin Analytics Report',
      description: 'Tracks sales volume and margin trends by item, store, or concept',
      type: 'coming-soon'
    },
    {
      id: 'gainers-losers',
      name: 'Top Gainers/Losers Report',
      description: 'Lists items with the biggest positive or negative impact after a price change',
      type: 'coming-soon'
    }
  ];

  private apiKey: string = 'dapif4fb3a4ddc6bc98fe20910fb3ba74c03-3';
  private email: string | null = '';
  private baseUrl: string = `${AppEnv.API_BASE_URL}/report`;
  private templateApiUrl: string =`${AppEnv.API_BASE_URL}/download-report`;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.email = localStorage.getItem('userEmail');
    
    if (!this.email) {
      // Avoid flashing login: show loading and attempt a brief resolution
      this.loading = true;
      this.error = null;
      this.waitForEmailAndProceed();
      return;
    }

    // Get restaurant name and menu item from route params or query params
    this.route.queryParams.subscribe(params => {
      this.restaurantName = params['restaurant'] || '';
      this.menuItemName = params['menuItem'] || '';
      
      if (this.restaurantName) {
        this.generateReports();
      } else {
        this.loading = false;
        this.error = 'Restaurant name is required to generate reports.';
      }
    });
  }

  private waitForEmailAndProceed(): void {
    const attempts = 10;
    const intervalMs = 200;
    let remaining = attempts;
    const poll = () => {
      const email = this.authService.getUserEmail();
      if (email) {
        this.email = email;
        // Continue with existing param handling
        this.route.queryParams.subscribe(params => {
          this.restaurantName = params['restaurant'] || '';
          this.menuItemName = params['menuItem'] || '';
          if (this.restaurantName) {
            this.generateReports();
          } else {
            this.loading = false;
            this.error = 'Restaurant name is required to generate reports.';
          }
        });
        return;
      }
      remaining -= 1;
      if (remaining > 0) {
        setTimeout(poll, intervalMs);
      } else {
        this.loading = false;
        this.error = 'Unable to verify login. Please try again.';
      }
    };
    poll();
  }

  generateReports(): void {
    // In a real implementation, this would call your API to generate the reports
    // For now, we'll simulate the process
    
    setTimeout(() => {
      // Update the available reports with download and view URLs
      this.availableReports = this.availableReports.map(report => ({
        ...report,
        downloadUrl: `#download-${report.id}`,
        viewUrl: `#view-${report.id}`
      }));
      
      this.loading = false;
    }, 2000);
  }

  viewReport(report: ReportMetadata): void {
    if (report.type === 'coming-soon') {
      alert('This report type is coming soon!');
      return;
    }
    
    // Navigate to the appropriate report view
    this.router.navigate(['/report-view'], {
      queryParams: {
        type: report.id,
        restaurant: this.restaurantName,
        menuItem: this.menuItemName
      }
    });
  }

  downloadReport(report: ReportMetadata): void {
    if (report.type === 'coming-soon') {
      alert('This report type is coming soon!');
      return;
    }
    
    this.isDownloading = true;
    this.downloadProgress = 0;
    
    // Simulate download progress
    this.progressInterval = setInterval(() => {
      this.downloadProgress = Math.min(this.downloadProgress + 5, 99);
    }, 200);
    
    // Create the appropriate report based on type
    setTimeout(() => {
      clearInterval(this.progressInterval);
      this.downloadProgress = 100;
      
      switch(report.id) {
        case 'full-report':
          this.downloadFullReport();
          break;
        case 'itemized-report':
          this.downloadItemizedReport();
          break;
        case 'price-positioning-report':
          this.downloadPricePositioningReport();
          break;
      }
      
      // Reset download state after a brief delay
      setTimeout(() => {
        this.isDownloading = false;
        this.downloadProgress = 0;
      }, 500);
    }, 3000);
  }
  
  private downloadFullReport(): void {
    // Create sample data for the full report
    const workbook = XLSX.utils.book_new();
    
    // Sample data for full report
    const data = [
      ['Menu Item', 'Owner Price', 'Competitor', 'Competitor Price', 'Price Difference', 'Distance'],
      ['Cheeseburger', '$12.99', 'Restaurant A', '$13.99', '+$1.00', '0.5 miles'],
      ['Cheeseburger', '$12.99', 'Restaurant B', '$11.99', '-$1.00', '1.2 miles'],
      ['Cheeseburger', '$12.99', 'Restaurant C', '$14.99', '+$2.00', '2.0 miles'],
      ['French Fries', '$4.99', 'Restaurant A', '$5.99', '+$1.00', '0.5 miles'],
      ['French Fries', '$4.99', 'Restaurant B', '$4.49', '-$0.50', '1.2 miles'],
      ['Milkshake', '$6.99', 'Restaurant C', '$7.99', '+$1.00', '2.0 miles']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Full Report');
    
    XLSX.writeFile(workbook, `${this.restaurantName}_Full_Report.xlsx`);
  }
  
  private downloadItemizedReport(): void {
    // Create sample data for the itemized report
    const workbook = XLSX.utils.book_new();
    
    // Sample data for multiple items
    const items = ['Cheeseburger', 'French Fries', 'Milkshake'];
    
    items.forEach(item => {
      const data = [
        ['Competitor', 'Price', 'Description', 'Distance'],
        ['Restaurant A', item === 'Cheeseburger' ? '$13.99' : item === 'French Fries' ? '$5.99' : '$7.49', 'Standard description', '0.5 miles'],
        ['Restaurant B', item === 'Cheeseburger' ? '$11.99' : item === 'French Fries' ? '$4.49' : '$6.99', 'Standard description', '1.2 miles'],
        ['Restaurant C', item === 'Cheeseburger' ? '$14.99' : item === 'French Fries' ? '$5.49' : '$7.99', 'Standard description', '2.0 miles']
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, item);
    });
    
    XLSX.writeFile(workbook, `${this.restaurantName}_Itemized_Report.xlsx`);
  }
  
  private downloadPricePositioningReport(): void {
    // Create sample data for the price positioning report
    const workbook = XLSX.utils.book_new();
    
    // Sample data for price positioning
    const data = [
      ['Menu Item', 'Owner Price', 'Avg Competitor Price', 'Min Competitor Price', 'Max Competitor Price', 'Price Position'],
      ['Cheeseburger', '$12.99', '$13.66', '$11.99', '$14.99', 'Below Average'],
      ['French Fries', '$4.99', '$5.32', '$4.49', '$5.99', 'Below Average'],
      ['Milkshake', '$6.99', '$7.49', '$6.99', '$7.99', 'At Minimum']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Price Positioning');
    
    XLSX.writeFile(workbook, `${this.restaurantName}_Price_Positioning_Report.xlsx`);
  }

  // Add logout method
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goBack(): void {
    this.router.navigate(['/tabledemo']);
  }

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    });
  }
}
import { AppEnv } from '../../config/env';