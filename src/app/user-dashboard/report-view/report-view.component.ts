import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../auth.service'; // Add this import
import { HttpClient, HttpParams } from '@angular/common/http';

@Component({
  selector: 'app-report-view',
  templateUrl: './report-view.component.html',
  styleUrls: [], // Remove reference to non-existent CSS file
  standalone: true,
  imports: [CommonModule],
})
export class ReportViewComponent implements OnInit {
  reportType: string = '';
  restaurantName: string = '';
  menuItemName: string = '';
  loading: boolean = true;
  error: string | null = null;
  today: Date = new Date(); // Add the missing today property
  
  // Report data
  reportTitle: string = '';
  reportDescription: string = '';
  tableHeaders: string[] = [];
  tableData: any[] = [];
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService // Add this injection
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.reportType = params['type'] || '';
      this.restaurantName = params['restaurant'] || '';
      this.menuItemName = params['menuItem'] || '';
      
      if (this.reportType && this.restaurantName) {
        this.loadReportData();
      } else {
        this.loading = false;
        this.error = 'Report type and restaurant name are required.';
      }
    });
  }

  loadReportData(): void {
    // In a real implementation, this would call your API to get the report data
    // For now, we'll use sample data based on the report type
    
    setTimeout(() => {
      switch(this.reportType) {
        case 'full-report':
          this.loadFullReportData();
          break;
        case 'itemized-report':
          this.loadItemizedReportData();
          break;
        case 'price-positioning-report':
          this.loadPricePositioningReportData();
          break;
        default:
          this.error = 'Unknown report type.';
      }
      
      this.loading = false;
    }, 1500);
  }
  
  private loadFullReportData(): void {
    this.reportTitle = 'Full Report';
    this.reportDescription = 'Complete report on every match for every item on the menu';
    
    this.tableHeaders = ['Menu Item', 'Owner Price', 'Competitor', 'Competitor Price', 'Price Difference', 'Distance'];
    this.tableData = [
      ['Cheeseburger', '$12.99', 'Restaurant A', '$13.99', '+$1.00', '0.5 miles'],
      ['Cheeseburger', '$12.99', 'Restaurant B', '$11.99', '-$1.00', '1.2 miles'],
      ['Cheeseburger', '$12.99', 'Restaurant C', '$14.99', '+$2.00', '2.0 miles'],
      ['French Fries', '$4.99', 'Restaurant A', '$5.99', '+$1.00', '0.5 miles'],
      ['French Fries', '$4.99', 'Restaurant B', '$4.49', '-$0.50', '1.2 miles'],
      ['Milkshake', '$6.99', 'Restaurant C', '$7.99', '+$1.00', '2.0 miles']
    ];
  }
  
  private loadItemizedReportData(): void {
    this.reportTitle = 'Itemized Report';
    this.reportDescription = 'Every match for each item on the menu, split into different tables';
    
    // For simplicity, we'll just show one item in the online view
    this.tableHeaders = ['Menu Item', 'Competitor', 'Price', 'Description', 'Distance'];
    this.tableData = [
      ['Cheeseburger', 'Restaurant A', '$13.99', 'Standard description', '0.5 miles'],
      ['Cheeseburger', 'Restaurant B', '$11.99', 'Standard description', '1.2 miles'],
      ['Cheeseburger', 'Restaurant C', '$14.99', 'Standard description', '2.0 miles'],
      ['French Fries', 'Restaurant A', '$5.99', 'Standard description', '0.5 miles'],
      ['French Fries', 'Restaurant B', '$4.49', 'Standard description', '1.2 miles'],
      ['French Fries', 'Restaurant C', '$5.49', 'Standard description', '2.0 miles']
    ];
  }
  
  private loadPricePositioningReportData(): void {
    this.reportTitle = 'Price Positioning Report';
    this.reportDescription = 'The positioning of price for each item compared to other prices';
    
    this.tableHeaders = ['Menu Item', 'Owner Price', 'Avg Competitor Price', 'Min Competitor Price', 'Max Competitor Price', 'Price Position'];
    this.tableData = [
      ['Cheeseburger', '$12.99', '$13.66', '$11.99', '$14.99', 'Below Average'],
      ['French Fries', '$4.99', '$5.32', '$4.49', '$5.99', 'Below Average'],
      ['Milkshake', '$6.99', '$7.49', '$6.99', '$7.99', 'At Minimum']
    ];
  }

  // Add logout method
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  downloadReport(): void {
    // Navigate back to the landing page with the download parameter
    this.router.navigate(['/report-landing'], {
      queryParams: {
        restaurant: this.restaurantName,
        menuItem: this.menuItemName,
        download: this.reportType
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/report-landing'], {
      queryParams: {
        restaurant: this.restaurantName,
        menuItem: this.menuItemName
      }
    });
  }
}