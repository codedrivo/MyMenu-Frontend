import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { catchError, map, timeout, retry, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

export interface PreloadedReportData {
  restaurantNames: string[];
  reports: any[];
  reports1: any[][];
  tableReports: any[];
  availableReports: any[];
  detailedReports?: { [key: string]: [any[], any[]] };
  isLoaded: boolean;
  lastUpdated: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ReportPreloaderService {
  private readonly baseUrl = `${AppEnv.API_BASE_URL}/report`;
  private readonly restaurantApiUrl = `${AppEnv.API_BASE_URL}/host-restaurant`;
  private readonly apiKey = 'dapif4fb3a4ddc6bc98fe20910fb3ba74c03-3';
  private readonly API_TIMEOUT = 60000;
  private readonly MAX_RETRIES = 2;
  private readonly host_limit = 100;
  private readonly comp_limit = 250;

  private destroy$ = new Subject<void>();
  private preloadedDataSubject = new BehaviorSubject<PreloadedReportData | null>(null);
  public preloadedData$ = this.preloadedDataSubject.asObservable();

  private isPreloading = false;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    });
  }

  /**
   * Start preloading reports for a user after login or data upload
   */
  preloadReports(email: string): void {
    if (this.isPreloading || !email) {
      return;
    }

    // console.log('Starting report preloading for user:', email);
    this.isPreloading = true;

    this.fetchRestaurantNames(email).subscribe({
      next: (restaurantNames) => {
        if (restaurantNames.length > 0) {
          const selectedRestaurant = restaurantNames[0];
          // this.fetchReportsForRestaurant(email, selectedRestaurant, restaurantNames);
        } else {
          // console.log('No restaurants found for preloading');
          this.isPreloading = false;
        }
      },
      error: (error) => {
        console.error('Error preloading restaurant names:', error);
        this.isPreloading = false;
      }
    });
  }

  private fetchRestaurantNames(email: string): Observable<string[]> {
    const headers = this.getAuthHeaders();
    const params = { email, limit: '100' };

    return this.http.get<any[]>(this.restaurantApiUrl, { 
      params, 
      headers 
    }).pipe(
      timeout(this.API_TIMEOUT),
      retry(this.MAX_RETRIES),
      map((data) => {
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item: string) => item.trim()).reverse();
        }
        return [];
      }),
      catchError((error) => {
        console.error('Error fetching restaurant names for preloading:', error);
        return of([]);
      })
    );
  }

  // private fetchReportsForRestaurant(email: string, restaurantName: string, restaurantNames: string[]): void {
  //   const previousMonth = new Date();
  //   previousMonth.setMonth(previousMonth.getMonth() - 1);
  //   const formattedPreviousMonth = previousMonth.toISOString().slice(0, 7);

  //   const twoMonthsAgo = new Date();
  //   twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  //   const formattedTwoMonthsAgo = twoMonthsAgo.toISOString().slice(0, 7);

  //   const headers = this.getAuthHeaders();

  //   const createRequestBody = (month: string) => ({
  //     email,
  //     restaurant_name: restaurantName,
  //     month,
  //     host_limit: this.host_limit,
  //     comp_limit: this.comp_limit
  //   });

  //   const previousMonthRequest = this.http.post<any[]>(
  //     this.baseUrl, 
  //     createRequestBody(formattedPreviousMonth), 
  //     { headers }
  //   ).pipe(
  //     timeout(this.API_TIMEOUT),
  //     retry(this.MAX_RETRIES),
  //     takeUntil(this.destroy$)
  //   );

  //   const twoMonthsAgoRequest = this.http.post<any[]>(
  //     this.baseUrl, 
  //     createRequestBody(formattedTwoMonthsAgo), 
  //     { headers }
  //   ).pipe(
  //     timeout(this.API_TIMEOUT),
  //     retry(this.MAX_RETRIES),
  //     takeUntil(this.destroy$)
  //   );

  //   forkJoin([previousMonthRequest, twoMonthsAgoRequest]).pipe(
  //     catchError((error) => {
  //       console.error('Error preloading reports:', error);
  //       return of([[], []]);
  //     })
  //   ).subscribe({
  //     next: ([previousData, twoMonthsAgoData]) => {
  //       this.processPreloadedReports(
  //         [previousData, twoMonthsAgoData], 
  //         restaurantName, 
  //         restaurantNames
  //       );
  //     },
  //     complete: () => {
  //       this.isPreloading = false;
  //     }
  //   });
  // }

  private processPreloadedReports(
    data: [any[], any[]], 
    selectedRestaurant: string, 
    restaurantNames: string[]
  ): void {
    const [previousData, twoMonthsAgoData] = data;
    
    let finalData = previousData;
    if (!Array.isArray(previousData) || previousData.length === 0 || !this.hasCompstoreData(previousData)) {
      finalData = twoMonthsAgoData;
    }

    if (Array.isArray(finalData) && finalData.length > 0) {
      const reports: any[] = [];
      const reports1: any[][] = [];
      const tableReports: any[] = [];
      const detailedReports: { [key: string]: [any[], any[]] } = {};

      // Process reports similar to tabledemo component
      finalData.forEach((item) => {
        if (item.host_data) {
          if (item.host_data.restaurant_name === selectedRestaurant) {
            reports.unshift(item.host_data);
            if (Array.isArray(item.compstore_data)) {
              reports1.unshift(item.compstore_data);
            } else {
              reports1.unshift([]);
            }
          } else {
            reports.push(item.host_data);
            if (Array.isArray(item.compstore_data)) {
              reports1.push(item.compstore_data);
            } else {
              reports1.push([]);
            }
          }
        }
      });

      // Initialize table reports
      this.initializeTableReports(finalData, tableReports);

      // Preload detailed reports for the first few table reports (most likely to be accessed)
      tableReports.slice(0, 5).forEach(report => {
        const reportKey = `${report.restaurant_name}_${report.menu_item_name || report.menu_name}`;
        // Store the same data structure that would be returned by the detailed API call
        detailedReports[reportKey] = [previousData, twoMonthsAgoData];
      });

      // Create available reports
      const availableReports = restaurantNames.map(name => ({
        restaurantName: name,
        generatedDate: new Date().toISOString().slice(0, 10),
        competitors: 0,
        isSelected: name === selectedRestaurant
      }));

      const preloadedData: PreloadedReportData = {
        restaurantNames,
        reports,
        reports1,
        tableReports,
        availableReports,
        detailedReports,
        isLoaded: true,
        lastUpdated: new Date()
      };

      this.preloadedDataSubject.next(preloadedData);
      // console.log('Reports preloaded successfully:', preloadedData);
    } else {
      // console.log('No valid data found for preloading');
    }
  }

  private initializeTableReports(finalData: any[], tableReports: any[]): void {
    finalData.forEach((item) => {
      if (item.host_data && Array.isArray(item.host_data)) {
        item.host_data.forEach((hostItem: any) => {
          const tableReport = {
            restaurant_name: hostItem.restaurant_name || '',
            zip_or_postal_code: hostItem.zip_or_postal_code || '',
            created_at: hostItem.created_at || new Date().toISOString(),
            menu_item_name: hostItem.menu_item_name || hostItem.menu_name || '',
            price: this.parsePriceValue(hostItem.menu_item_current_price || hostItem.menu_current_price || hostItem.price),
            distance_from_zip_code: hostItem.distance_from_zip_code || '0',
            isDownloading: false,
            downloadProgress: 0,
            isSelected: false
          };
          tableReports.push(tableReport);
        });
      }
    });
  }

  private parsePriceValue(price: any): number {
    if (typeof price === 'number') {
      return price;
    }
    if (typeof price === 'string') {
      const cleanedPrice = price.replace(/[$,]/g, '');
      const parsed = parseFloat(cleanedPrice);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private hasCompstoreData(data: any[]): boolean {
    return data.some(item => item.compstore_data && Array.isArray(item.compstore_data) && item.compstore_data.length > 0);
  }

  /**
   * Get preloaded data if available
   */
  getPreloadedData(): PreloadedReportData | null {
    return this.preloadedDataSubject.value;
  }

  /**
   * Check if data is preloaded and fresh (within 5 minutes)
   */
  isDataFresh(): boolean {
    const data = this.getPreloadedData();
    if (!data || !data.isLoaded) {
      return false;
    }
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return data.lastUpdated > fiveMinutesAgo;
  }

  /**
   * Clear preloaded data
   */
  clearPreloadedData(): void {
    this.preloadedDataSubject.next(null);
  }

  /**
   * Add detailed report data to cache
   */
  cacheDetailedReport(restaurantName: string, menuItemName: string, data: [any[], any[]]): void {
    const currentData = this.getPreloadedData();
    if (currentData && this.isDataFresh()) {
      const reportKey = `${restaurantName}_${menuItemName}`;
      if (!currentData.detailedReports) {
        currentData.detailedReports = {};
      }
      currentData.detailedReports[reportKey] = data;
      this.preloadedDataSubject.next(currentData);
      // console.log(`Cached detailed report for ${reportKey}`);
    }
  }

  /**
   * Trigger preloading after data upload
   */
  onDataUploaded(email: string): void {
    // Clear existing data and preload fresh data
    this.clearPreloadedData();
    setTimeout(() => {
      this.preloadReports(email);
    }, 2000); // Small delay to allow upload processing
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
import { AppEnv } from '../config/env';