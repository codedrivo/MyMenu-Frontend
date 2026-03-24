import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';

interface RestaurantReport {
    restaurant_name: string;
    created_date?: Date;
    menu_name?: string;
}

interface ReportDetail {
    hostData: string;
    hostValue: string;
    compstoreData: string;
    compstoreValues: any[];
    

}

interface CompstoreData {
    restaurant_name?: string;
    address?: string;
    menu_item_name?: string;
    description?: string;
    price?: number;
    zip_or_postal_code?: string;
    distance?: number;
    [key: string]: any;
}

@Component({
    selector: 'app-reports',
    templateUrl: './reports.component.html',
    styleUrls: ['./reports.component.css'],
    standalone: true,
    imports: [CommonModule],
})

export class ReportsComponent implements OnInit {
  reports: RestaurantReport[] = [];
    reports1: any[] = [];
    restaurantNames: string[] = [];
    selectedRestaurant: string = '';
    loading: boolean = true;
    error: string | null = null;
    reportDetails: ReportDetail[] = [];
    reportDetailsHeaders: string[] = [];

    private apiKey: string = 'dapif4fb3a4ddc6bc98fe20910fb3ba74c03-3';
    private email: string = '';
    private host_limit: number = 1;
    private comp_limit: number = 1000;

  private baseUrl: string = `${AppEnv.API_BASE_URL}/report`;
    private restaurantApiUrl: string = `${AppEnv.API_BASE_URL}/host-restaurant`;

    constructor(private http: HttpClient, private router: Router) {}

    ngOnInit(): void {
        this.email = localStorage.getItem('userEmail') || '';
        if (!this.email) {
            this.error = 'User email not found in localStorage';
            this.loading = false;
            return;
        }
        this.fetchRestaurantNames();
    }


  private getAuthHeaders(): HttpHeaders {
      return new HttpHeaders({
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
      });
  }

  fetchRestaurantNames(): void {
      const headers = this.getAuthHeaders();
      const params = new HttpParams()
          .set('email', this.email)
          .set('limit', '100');
  
      this.http.get<any[]>(this.restaurantApiUrl, { headers, params }).subscribe({
          next: (data) => {
              if (Array.isArray(data) && data.length > 0) {
                  this.restaurantNames = data.map((item: string) => item.trim()).reverse();
                  this.selectedRestaurant = this.restaurantNames[0] || '';
  
                //   console.log('Restaurant names fetched (reversed):', this.restaurantNames);
                //   console.log('Selected restaurant:', this.selectedRestaurant);
  
                  this.fetchReports();
                  this.fetchReports1();
              } else {
                  this.error = 'No restaurants found.';
                  this.loading = false;
              }
          },
          error: (err) => {
              console.error('Error fetching restaurant names:', err);
              this.error = 'Failed to fetch restaurant names.';
              this.loading = false;
          },
      });
  }

  fetchReports(): void {
      if (!this.selectedRestaurant) {
          this.error = 'Restaurant name is not set.';
          return;
      }
  
      const headers = this.getAuthHeaders();
      const params = new HttpParams()
          .set('email', this.email)
          .set('limit', '100');
  
      this.http.get<string[]>(this.restaurantApiUrl, { headers, params }).subscribe({
          next: (data) => {
              if (Array.isArray(data)) {
                  this.reports = data.map((restaurantName: string, index: number) => ({
                      restaurant_name: restaurantName.trim(),
                      created_date: new Date(Date.now() - (index * 24 * 60 * 60 * 1000))
                  }));
              } else {
                  this.reports = [];
              }
              this.loading = false;
          },
          error: (err) => {
              console.error('Error fetching reports:', err);
              this.error = 'Failed to load reports.';
              this.loading = false;
          }
      });
  }

  fetchReports1(): void {
      if (!this.selectedRestaurant) {
          this.error = 'Restaurant name is not set.';
          console.error(this.error);
          return;
      }
  
      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const formattedMonth = previousMonth.toISOString().slice(0, 7);
  
    //   console.log('Fetching comparative reports for restaurant:', this.selectedRestaurant);
  
      const headers = this.getAuthHeaders();
      const requestBody = {
          email: this.email,
          host_limit: this.host_limit,
          comp_limit: this.comp_limit,
          month: formattedMonth,
          restaurant_name: this.selectedRestaurant
      };
  
      this.http.post<any[]>(this.baseUrl, requestBody, { headers }).subscribe({
          next: (data) => {
            //   console.log('Comparative reports data:', data);
              if (Array.isArray(data) && data.length > 0) {
                  this.reports1 = data.flatMap((item) => item.compstore_data || []);
              } else {
                  this.reports1 = [];
              }
              this.loading = false;
          },
          error: (err) => {
              console.error('Error fetching comparative reports:', err);
              this.error = 'Failed to load comparative reports.';
              this.loading = false;
          },
      });
  }

  downloadReports(restaurantName: string): void {
      this.loading = true;
  
      const headers = this.getAuthHeaders();
      const requestBody = {
          email: this.email,
          host_limit: this.host_limit,
          comp_limit: this.comp_limit,
          month: '2024-10',
          restaurant_name: restaurantName
      };
  
      interface CompstoreData {
          restaurant_name?: string;
          address?: string;
          menu_item_name?: string;
          description?: string;
          price?: number;
          zip_or_postal_code?: string;
          distance?: number;
          [key: string]: any;
      }
  
      this.http.post<any[]>(this.baseUrl, requestBody, { headers }).subscribe({
          next: (data) => {
              if (Array.isArray(data) && data.length > 0) {
                  const hostData = data[0].host_data || {};
                  const compstoreData: CompstoreData[] = data[0].compstore_data || [];
  
                  const workbook = XLSX.utils.book_new();
                  const requiredHostKeys = [
                      'restaurant_name',
                      'restaurant_address',
                      'menu_name',
                      'menu_description',
                      'menu_current_price',
                      'zip_or_postal_code',
                      'distance_from_zip_code',
                  ];
  
                  const requiredCompstoreKeys = [
                      'restaurant_name',
                      'address',
                      'menu_item_name',
                      'description',
                      'price',
                      'zip_or_postal_code',
                      'distance',
                  ];
  
                  const headerRow = ['Host Data', 'Value', 'Compstore Data', 'Values'];
                  const rows: any[][] = [headerRow];
  
                  requiredHostKeys.forEach((hostKey, index) => {
                      const hostValue = hostData[hostKey] || 'N/A';
                      const compstoreTitle = requiredCompstoreKeys[index];
                      const compstoreValues = compstoreData.map(
                          (compstore: CompstoreData) => compstore[compstoreTitle] || 'N/A'
                      );
                      const row = [hostKey, hostValue, compstoreTitle, ...compstoreValues];
                      rows.push(row);
                  });
  
                  const worksheet = XLSX.utils.aoa_to_sheet(rows);
                  XLSX.utils.book_append_sheet(workbook, worksheet, 'Formatted Report');
  
                  const fileName = `${restaurantName}_Report_${new Date()
                      .toISOString()
                      .slice(0, 10)}.xlsx`;
                  XLSX.writeFile(workbook, fileName);
              } else {
                  alert('No data available for this restaurant.');
              }
              this.loading = false;
          },
          error: (err) => {
              console.error('Error downloading report:', err);
              alert('Failed to download report. Please try again.');
              this.loading = false;
          },
      });
  }

  viewReportDetails(restaurantName: string): void {
      this.loading = true;
      this.reportDetails = [];
  
      const headers = this.getAuthHeaders();
      const requestBody = {
          email: this.email,
          host_limit: this.host_limit,
          comp_limit: this.comp_limit,
          month: '2024-10',
          restaurant_name: restaurantName
      };
  
      this.http.post<any[]>(this.baseUrl, requestBody, { headers }).subscribe({
          next: (data) => {
              if (Array.isArray(data) && data.length > 0) {
                  const hostData = data[0].host_data || {};
                  const compstoreData: CompstoreData[] = data[0].compstore_data || [];
  
                  const compstoreHeaders = compstoreData.map((_: CompstoreData, index: number) => 
                      `Compstore-${index + 1}`
                  );
                  this.reportDetailsHeaders = ['Host Data', 'Value', 'Compstore Data', ...compstoreHeaders];
  
                  const requiredHostKeys = [
                      'restaurant_name',
                      'restaurant_address',
                      'menu_name',
                      'menu_description',
                      'menu_current_price',
                      'zip_or_postal_code',
                      'distance_from_zip_code',
                  ];
  
                  const requiredCompstoreKeys = [
                      'restaurant_name',
                      'address',
                      'menu_item_name',
                      'description',
                      'price',
                      'zip_or_postal_code',
                      'distance',
                  ];
  
                  requiredHostKeys.forEach((hostKey: string, index: number) => {
                      const compKey = requiredCompstoreKeys[index];
                      let hostValue = hostData[hostKey] || 'N/A';
                      
                      if (hostKey === 'menu_current_price' && hostValue !== 'N/A') {
                          hostValue = `$${parseFloat(hostValue).toFixed(2)}`;
                      }
                      if (hostKey === 'distance_from_zip_code' && hostValue !== 'N/A') {
                          hostValue = `${hostValue} miles`;
                      }
  
                      const compstoreValues = compstoreData.map((comp: CompstoreData) => {
                          let value = comp[compKey] || 'N/A';
                          if (compKey === 'price' && value !== 'N/A') {
                              value = `$${parseFloat(value).toFixed(2)}`;
                          }
                          if (compKey === 'distance' && value !== 'N/A') {
                              value = `${value} miles`;
                          }
                          return value;
                      });
  
                      this.reportDetails.push({
                          hostData: this.formatLabel(hostKey),
                          hostValue: hostValue,
                          compstoreData: this.formatLabel(compKey),
                          compstoreValues: compstoreValues
                      });
                  });
              }
              this.loading = false;
          },
          error: (err) => {
              console.error('Error fetching report details:', err);
              this.error = 'Failed to load report details.';
              this.loading = false;
          }
      });
  }

private formatLabel(key: string): string {
  return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
}
  
isModalOpen: boolean = false;

openModal(restaurantName: string): void {
  // Fetch the detailed report data for the given restaurant
  this.viewReportDetails(restaurantName);
  this.isModalOpen = true;
}

closeModal(): void {
  this.isModalOpen = false;
}


  goBack(): void {
    this.router.navigate(['/user-dashboard']);
  }

  onSubmit(): void {
    this.router.navigate(['/bulk-upload']);
  }

  onSubmit1(): void {
    this.router.navigate(['/tabledemo']);
  }
}
 
import { AppEnv } from '../../config/env';
 