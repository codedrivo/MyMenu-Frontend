import { Component, OnInit, HostListener, ElementRef, ChangeDetectorRef, OnDestroy, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { forkJoin, Observable, of, Subject, throwError, timer } from 'rxjs';
import { FormsModule, FormGroup, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { catchError, retry, timeout, takeUntil, map, switchMap, finalize } from 'rxjs/operators';
import { ReportPreloaderService } from '../../services/report-preloader.service';
import { ReportsapiserviceService } from '../../ReportsApiService/reportsapiservice.service';
import { PaymentService } from '../../services/payment.service';


interface ReportData {
  restaurant_name: string;
  restaurant_address?: string;
  address?: string;
  menu_name?: string;
  menu_section?: string;
  menu_item_name?: string;
  menu_description?: string;
  menu_item_description?: string;
  description?: string;
  menu_current_price?: string;
  menu_item_current_price?: string;
  price?: string;
  zip_or_postal_code?: string;
  distance_from_zip_code?: string;
  distance_from_zipcode?:number;
  distance?: string;
  menu_category?: string;
  standardized_category?: string;
  cuisine_type?: string; // New field
  restaurant_type?: string;
  restaurant_style?: string; // New field
  created_at?: string;
  [key: string]: any;
  
}

interface RestaurantReport {
  restaurantName: string;
  generatedDate: string;
  competitors: number;
  isSelected: boolean;
}

interface CompstoreData {
  restaurant_name?: string;
  address?: string;
  menu_item_name?: string;
  description?: string;
  price?: number;
  zip_or_postal_code?: string;
  distance?: number;
  distance_from_zipcode?:number;
  cuisine_type?: string; // New field
  restaurant_style?: string; // New field
  [key: string]: any;
}

interface SortConfig {
  column: 'menu_item_name' | 'price' | 'created_at';
  direction: 'asc' | 'desc';
}

interface TableReport {
  menu_item_name?: string;
  menu_name?: string;
  price?: number;
  distance_from_zip_code?: string;
  restaurant_name: string;
  zip_or_postal_code: string;
  created_at: string;
  isDownloading: boolean;
  downloadProgress: number;
  isSelected?: boolean;
  
}

interface MenuItemReport {
  menu_name: string;
  menu_item_current_price: string | number;
  restaurant_name: string;
}

interface TableRow {
  restaurant: string;
  menuItem: string;
  price: string;
  diff: string;
  distance: string;
  type: string;
  address: string;
  [key: string]: string; // Add index signature
}

interface GroupedRestaurant {
  restaurantName: string;
  menuItems: any[];
  isExpanded: boolean;
  totalItems: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  averageDistance: number;
}

interface ApiCache {
  [key: string]: {
    data: any;
    timestamp: number;
    expiry: number;
  };
}

@Component({
  selector: 'app-tabledemo',
  templateUrl: './tabledemo.component.html',
  styleUrls: ['./tabledemo.component.css'],
  standalone: true,
  imports: [CommonModule ,FormsModule,ReactiveFormsModule],
})
export class TableDemoComponent implements OnInit, OnDestroy {
  availableReports: RestaurantReport[] = [];
  reports: ReportData[] = [];
  reports1: ReportData[][] = [];
  restaurantNames: string[] = [];
  selectedRestaurant: string = '';
  loading: boolean = false;
  error: string | null = null;
  currentPage: number = 1;
  totalPages: number;
  itemsPerPage: number = 10;
  currentPages: number[] = [];
  totalCompstorePages: number = 0;
  currentDate: string = new Date().toISOString().slice(0, 10);
  showReportView: boolean = false;
  isDownloading = false;
  compstoreCurrentPages: number[] = [];
  helpVisible = false;
  selectedMenuItemName: string | null = null;
  showReportDetails: boolean = false;
  tableReportsPage: number = 1;
  itemsPerTablePage: number = 10;
  filteredTableReports: TableReport[] = [];
  loadingPercentage: number = 0;
  isReportChanging: boolean = false;
  lastResolvedMonth: string | null = null;
  lastResolvedData: any[] = [];
  private isFetchingReports: boolean = false;
  private isPaymentsChecked: boolean = false;
  isPaymentsLoading: boolean = false;
  
  // Report details view properties
  reportSearchQuery: string = '';
  filteredReportList: any[] = [];
  originalFilteredReportList: any[] = [];
  pagedReportList: any[] = [];
  currentReportPage: number = 1;
  itemsPerReportPage: number = 10;
  expandedReportRows: boolean[] = [];
  areAllReportRowsExpanded: boolean = false;
  showReportSortMenu: boolean = false;
  showReportExportMenu: boolean = false;
  sortValue: string = '';
  
  // Host restaurant expand/collapse properties
  isHostRestaurantExpanded: boolean = false;
  isScrolling: boolean = false;
  reportSortConfig: { field: string; direction: 'asc' | 'desc' } = {
    field: 'distance_from_zipcode',
    direction: 'asc'
  };
  Math = Math; // For using Math in the template
 
  hasSearched: boolean = false;
  originalResults: any[] = [];
  myForm: FormGroup;
  distanceRange: { min: number; max: number } = { min: 0, max: 25 };
  selectedDistance: number = 0;
  selectedReportId: string = '';
  groupedRestaurants: GroupedRestaurant[] = [];
  availableRestaurantNames: string[] = [];
  selectedRestaurantNames: string[] = [];
  showRestaurantFilter: boolean = false;
  restaurantSearchQuery: string = '';
  filteredRestaurantNames: string[] = [];


  userLocationData: any;
  localStorageData: any;
  lastMonths: any[] = [];

  selectedMonth: string = '';
  selectedLocation: number = 0;

  availableMenuItems : any;
  rowsPerPageOptions =[10,25,50,100];
  rowsPerPage = 10;
  currentMenuPage = 1;
  totalMenuPages = 1;
  totalMenuItems = 0;
  searchTerm = '';
  selectedRestaurantName :any;
  selectedMenuItemData :any;
  compstoreRestaurants: any[] = [];
  compStoreResults:any;

  rowsPerPageOptionsComp =[10,25,50,100];
  rowsPerPageComp = 10;
  currentMenuPageComp = 1;
  totalMenuPagesComp = 1;
  totalMenuItemsComp = 0;
  searchTermComp = '';

  showRowsPerPageMenu = false;
  currentSortBy: string = '';

  

  tableReports: TableReport[] = [];
  sortConfig: SortConfig = {
    column: 'created_at',
    direction: 'desc'
  };

  closeReportModal() {
    this.showReportDetails = false;
    this.currentMenuPageComp = 1;
    this.rowsPerPageComp = 10;
    this.selectedRestaurantNames = [];
    this.selectedMenuItemData = null;
    this.searchTermComp = '';
    this.sortValue = '';
  }
  
downloadProgress = 0;
private progressInterval: any;
  

  

  private apiKey: string = 'dapif4fb3a4ddc6bc98fe20910fb3ba74c03-3';
  private email: string | null = '';
  private host_limit: number = 100;
  private comp_limit: number =1000;

  private baseUrl: string = `${AppEnv.API_BASE_URL}/report`;
  private restaurantApiUrl: string = `${AppEnv.API_BASE_URL}/host-restaurant`;
  private templateApiUrl: string = `${AppEnv.API_BASE_URL}/download-report`;

  // API Optimization properties
  private destroy$ = new Subject<void>();
  private apiCache: ApiCache = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly API_TIMEOUT = 60000; // 60 seconds
  private readonly MAX_RETRIES = 2;
  private readonly REPORT_TIMEOUT_MS = 180000; // allow up to 3 minutes for heavy report generation
  private readonly REPORT_MAX_RETRIES = 0; // do not retry long-running report calls automatically
  private currentRequests: { [key: string]: Observable<any> } = {};

  // Pagination for restaurantNames
  currentRestaurantPage: number = 1;
  restaurantItemsPerPage: number = 10;
  totalRestaurantPages: number = 0;

  


  constructor(private http: HttpClient, private router: Router, private fb: FormBuilder, private elementRef: ElementRef, private authService: AuthService, private cdr: ChangeDetectorRef, private reportPreloader: ReportPreloaderService, private reportsApiService: ReportsapiserviceService,private paymentService: PaymentService, @Inject(PLATFORM_ID) private platformId: Object) {
    this.totalPages = Math.ceil(this.reports.length / 20);
    this.myForm = this.fb.group({
      minDistance: [0],
      maxDistance: [25]
    });
  }

getRestaurantData()
{
  const userId = this.localStorageData.id;
  this.reportsApiService.fetchRestaurantsData(userId).subscribe({
    next: (response) => {
      this.userLocationData = response;
      if(this.userLocationData)
      {
        this.selectedLocation = this.userLocationData.locations[0].user_location_id;
        this.selectedRestaurantName = this.userLocationData.locations[0];
        this.getHostMenuItems();
      }
    },
    error: (error) => {
      console.error('Error fetching user location data:', error);
    }
  }
  ); 
}

getLastMonths() {
  this.reportsApiService.fetchLastMonths().subscribe({
    next: (response) => {
      this.lastMonths = response.months;
      if (this.lastMonths && this.lastMonths.length > 0) {
        this.selectedMonth = this.lastMonths[this.lastMonths.length - 1].month;
      }
    },
    error: (error) => {
      console.error('Error fetching last months:', error);
    }
  })
}


  onLocationChange() {
    this.currentMenuPage = 1;
   const selectedLoc = this.userLocationData?.locations?.find(
    (loc: any) => String(loc.user_location_id) === String(this.selectedLocation)
  );
  if (selectedLoc) {
    this.selectedRestaurantName = selectedLoc;
  }
    this.getHostMenuItems();
   }

  getHostMenuItems() {
    this.loading = true;
    const payload = {
     page_no:this.currentMenuPage,
     limit: this.rowsPerPage,
     user_location_id: this.selectedLocation,
     menu_item_name:this.searchTerm ?? null
    }
    this.reportsApiService.fetchHostMenuItems(payload).subscribe({
      next: (response) => {
         this.loading = false;
         this.availableMenuItems = response.menu_items;
         this.totalMenuPages =  Math.ceil(response.total_records / this.rowsPerPage) || 1;
         this.totalMenuItems = response.total_records || 0;
      },
      error: (error) => {
        this.loading = false;
        console.error('Error fetching menu items:', error);
      }
      
    })
  }

  onChangePage(page: number) {
    if (page >= 1 && page <= this.totalMenuPages) {
      this.currentMenuPage = page;
      this.getHostMenuItems();
    }
  }

  onRowsPerPageChange(rowsPerPage: number) {
    this.rowsPerPage = rowsPerPage;
    this.currentMenuPage = 1;
    this.getHostMenuItems();
  }

  onRowsPerPageChangeComp(rowsPerPageComp: number) {
    this.rowsPerPageComp = rowsPerPageComp;
    this.currentMenuPageComp = 1;
    this.fetchReportss();
  }


  onSearch(){
    this.currentMenuPage = 1;
    this.getHostMenuItems();
  }

  onSearchChange(searchTerm: string, event?: any) {
  // searchTerm is already bound via ngModel, so this line is redundant but kept for clarity
  this.searchTerm = searchTerm;
  this.currentMenuPage = 1;
  this.getHostMenuItems();
  }

resetFilters()
{
  this.searchTerm = '';
  this.currentMenuPage = 1;
  this.rowsPerPage = 10;
  this.getHostMenuItems();
}


getCompstoreRestaurants() {
  this.reportsApiService.fetchCompstoreRestaurants({user_location_id: this.selectedMenuItemData.user_location_id,menu_item_name: this.selectedMenuItemData.menu_item_name}).subscribe({
    next: (response) => {
    this.compstoreRestaurants = response.restaurants.map((r: any) => r.restaurant_name);
    },
    error: (error) => {
      console.error('Error fetching compstore restaurants:', error);
    }
    
  })
}

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    });
  }


  

  ngOnInit(): void {
    const storedData = localStorage.getItem('userData');
    if (storedData) {
      this.localStorageData = JSON.parse(storedData);
      this.getRestaurantData();
      this.getLastMonths();
    }


    if (isPlatformBrowser(this.platformId)) {
      this.email = localStorage.getItem('userEmail');
    } else {
      this.email = null;
    }
    
    if (!this.email) {
      this.error = 'User is not logged in. Please log in to continue.';
      console.error(this.error);
      this.router.navigate(['/login']);
      return;
    }
   

    // Payments-first flow; do not hide the screen while verifying payments
    this.verifyPaymentsThenLoad();
  }

  

  private continueReportsInitFlow(): void {
    const preloadedData = this.reportPreloader.getPreloadedData();
    if (preloadedData && this.reportPreloader.isDataFresh()) {
      this.loading = false;
      this.error = null;
      this.restaurantNames = preloadedData.restaurantNames;
      this.availableReports = preloadedData.availableReports;
      this.tableReports = preloadedData.tableReports;
      this.filteredTableReports = [...this.tableReports];
      this.sortReports();
      this.selectedRestaurant = this.restaurantNames[0] || '';
    }

    this.fetchRestaurantNames();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearCache();
    this.cancelAllRequests();
  }

  private cancelAllRequests(): void {
    this.currentRequests = {};
  }

  private clearCache(): void {
    this.apiCache = {};
  }

  private getCacheKey(url: string, params: any): string {
    return `${url}_${JSON.stringify(params)}`;
  }

  private getCachedData(cacheKey: string): any | null {
    const cached = this.apiCache[cacheKey];
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    if (cached) {
      delete this.apiCache[cacheKey];
    }
    return null;
  }

  private setCachedData(cacheKey: string, data: any): void {
    this.apiCache[cacheKey] = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + this.CACHE_DURATION
    };
  }

  private hasUploadedTemplate(): boolean {
    const hasSelected = !!(this.selectedRestaurant && this.selectedRestaurant.trim().length > 0);
    const stored = isPlatformBrowser(this.platformId) ? localStorage.getItem('restaurantName') : null;
    return hasSelected || !!(stored && stored.trim().length > 0);
  }

  private makeOptimizedApiCall<T>(
    url: string, 
    body: any, 
    cacheKey?: string,
    useCache: boolean = true
  ): Observable<T> {
    // Check cache first
    if (useCache && cacheKey) {
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        // console.log('Using cached data for:', cacheKey);
        return of(cachedData);
      }
    }

    // Check if same request is already in progress
    if (this.currentRequests[cacheKey || url]) {
      // console.log('Request already in progress, reusing:', cacheKey || url);
      return this.currentRequests[cacheKey || url];
    }

    const headers = this.getAuthHeaders();
    
    const request$ = this.http.post<T>(url, body, { headers }).pipe(
      timeout(this.API_TIMEOUT),
      retry(this.MAX_RETRIES),
      map((response: any) => {
        // Cache successful response
        if (useCache && cacheKey) {
          this.setCachedData(cacheKey, response);
        }
        return response;
      }),
      catchError((error: any) => {
         console.error('API call failed:', error);
         let errorMessage = 'An error occurred while fetching data.';
         
         if (error.name === 'TimeoutError') {
           errorMessage = 'Request timed out. Please try again.';
         } else if (error.status === 0) {
           errorMessage = 'Network error. Please check your connection.';
         } else if (error.status === 401) {
           errorMessage = 'Authentication failed. Please login again.';
           this.router.navigate(['/login']);
         } else if (error.status === 404) {
           errorMessage = 'Data not found.';
         } else if (error.status >= 500) {
           errorMessage = 'Server error. Please try again later.';
         }
         
         return throwError(() => new Error(errorMessage));
       }),
      finalize(() => {
        // Clean up current request tracking
        delete this.currentRequests[cacheKey || url];
      }),
      takeUntil(this.destroy$)
    );

    // Track current request
    this.currentRequests[cacheKey || url] = request$;
    
    return request$;
  }

  onDistanceRangeChange(): void {
    const minDistance = this.myForm.get('minDistance')?.value;
    const maxDistance = this.myForm.get('maxDistance')?.value;

    // Ensure minDistance is not greater than maxDistance
    if (minDistance > maxDistance) {
      this.myForm.patchValue({
        minDistance: maxDistance,
        maxDistance: minDistance
      });
    }

    // Update filteredReportList based on distance range
    this.filteredReportList = this.originalResults.filter(item => {
      const distance = parseFloat(item.distance_from_zipcode || '0');
      return distance >= minDistance && distance <= maxDistance;
    });

    this.applySortToReportList();
    this.updatePagedReportList();
  }

  initializeReportView(): void {
    this.hasSearched = true;
    this.originalResults = this.reports1[0] || [];
    
    // Calculate min and max distance from the data
    const distances = this.originalResults
      .map(item => parseFloat(item.distance_from_zipcode || '0'))
      .filter(distance => !isNaN(distance));
    
    this.distanceRange = {
      min: distances.length ? Math.floor(Math.min(...distances)) : 0,
      max: distances.length ? Math.ceil(Math.max(...distances)) : 25
    };

    this.myForm.patchValue({
      minDistance: this.distanceRange.min,
      maxDistance: this.distanceRange.max
    });

    this.filteredReportList = [...this.originalResults];
    this.originalFilteredReportList = [...this.originalResults]; // Store original list
    this.currentReportPage = 1;
    this.selectedDistance = 0; // Reset distance filter
    
    // Initialize restaurant grouping
    this.getUniqueRestaurantNames();
    this.selectedRestaurantNames = [];
    
    this.applySortToReportList();
    this.groupRestaurantData();
    this.updatePagedReportList();
  }

  getTotalCompetitors(): number {
    // Use the first competitor list (reports1[0]) or return 0 if it doesn't exist
    return this.filteredReportList?.length || 0;
  }
  
  // Get total pages for the Available Reports table
  getTotalTablePages(): number {
    return Math.ceil(this.tableReports.length / this.itemsPerTablePage);
  }
  
  // Get page numbers for the Available Reports table pagination
  getTablePageNumbers(): number[] {
    const totalPages = this.getTotalTablePages();
    const visiblePages = 5; // Number of page buttons to show
    
    if (totalPages <= visiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Calculate range of pages to show
    let startPage = Math.max(1, this.tableReportsPage - Math.floor(visiblePages / 2));
    let endPage = startPage + visiblePages - 1;
    
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - visiblePages + 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }
  
 

  getTotalPages(hostIndex: number): number {
    return Math.ceil((this.reports1[hostIndex]?.length || 0) / this.itemsPerPage);
  }

  nextPage(hostIndex: number): void {
    const totalPages = this.getTotalPages(hostIndex);
    if ((this.currentPages[hostIndex] || 1) < totalPages) {
      this.currentPages[hostIndex] = (this.currentPages[hostIndex] || 1) + 1;
    }
  }

  previousPage(hostIndex: number): void {
    if ((this.currentPages[hostIndex] || 1) > 1) {
      this.currentPages[hostIndex] = (this.currentPages[hostIndex] || 1) - 1;
    }
  }

  changePage(hostIndex: number, direction: string) {
    const totalPages = Math.ceil((this.reports1[hostIndex]?.length || 0) / this.itemsPerPage);
    if (direction === 'next' && this.compstoreCurrentPages[hostIndex] < totalPages) {
      this.compstoreCurrentPages[hostIndex]++;
    } else if (direction === 'prev' && this.compstoreCurrentPages[hostIndex] > 1) {
      this.compstoreCurrentPages[hostIndex]--;
    }
  }

  getCeil(value: number): number {
    return Math.ceil(value);
  }


  
  // New method to get paged restaurant names
  getPagedRestaurantNames(): string[] {
    const startIndex = (this.currentRestaurantPage - 1) * this.restaurantItemsPerPage;
    const endIndex = startIndex + this.restaurantItemsPerPage;
    return this.restaurantNames.slice(startIndex, endIndex);
  }

  // Pagination methods for restaurantNames table
  previousRestaurantPage(): void {
    if (this.currentRestaurantPage > 1) {
      this.currentRestaurantPage--;
    }
  }

  nextRestaurantPage(): void {
    if (this.currentRestaurantPage < this.totalRestaurantPages) {
      this.currentRestaurantPage++;
    }
  }

  goToRestaurantPage(page: number): void {
    if (page < 1 || page > this.totalRestaurantPages) {
      return;
    }
    this.currentRestaurantPage = page;
  }
  
  

  

  fetchRestaurantNames(): void {
    if (!this.email) {
      this.error = 'No email found. Please log in again.';
      this.loading = false;
      return;
    }

    const params = { email: this.email, limit: '100' };
    const cacheKey = this.getCacheKey(this.restaurantApiUrl, params);

    // Check cache first
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      this.processRestaurantNames(cachedData);
      return;
    }

    const httpParams = new HttpParams()
      .set('email', this.email)
      .set('limit', '100');

    const headers = this.getAuthHeaders();

    this.http.get<any[]>(this.restaurantApiUrl, { params: httpParams, headers }).pipe(
      timeout(this.API_TIMEOUT),
      retry(this.MAX_RETRIES),
      takeUntil(this.destroy$),
      catchError((error) => {
        console.error('Error fetching restaurant names:', error);
        this.error = 'Failed to fetch restaurant names.';
        this.loading = false;
        this.fetchReportsFallback();
        return of([]);
      })
    ).subscribe({
      next: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          this.setCachedData(cacheKey, data);
          this.processRestaurantNames(data);
        } else {
          // Do not show an error banner when names are temporarily unavailable;
          // backend may still be generating reports. Keep UI visible.
          this.error = null;
          this.loading = false;
          this.fetchReportsFallback();
        }
      }
    });
  }

  private processRestaurantNames(data: any[]): void {
    this.restaurantNames = data.map((item: string) => item.trim()).reverse();
    this.error = null;
    this.selectedRestaurant = this.restaurantNames[0] || '';
    
    // Initialize available reports
    this.availableReports = this.restaurantNames.map(name => ({
      restaurantName: name,
      generatedDate: this.currentDate,
      competitors: 0,
      isSelected: name === this.selectedRestaurant
    }));

    // console.log('Restaurant names processed:', this.restaurantNames);
    // this.fetchReports();
  }

  private fetchReportsFallback(): void {
    if (!this.selectedRestaurant) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('restaurantName') : null;
      if (stored && stored.trim().length > 0) {
        this.selectedRestaurant = stored.trim();
      }
    }
    if (this.selectedRestaurant) {
      // console.log('Fallback to /report with selectedRestaurant:', this.selectedRestaurant);
      // this.fetchReports();
    }
  }

  private createReportIdentifier(report: TableReport): string {
    const identifierParts = [];
    
    // Add available fields to the identifier
    if (report.menu_item_name) identifierParts.push(report.menu_item_name);
    if (report.menu_name) identifierParts.push(report.menu_name);
    if (report.price) identifierParts.push(report.price.toString());
    if (report.distance_from_zip_code) identifierParts.push(report.distance_from_zip_code);
    
    // Return combined identifier, if no parts available return empty string
    return identifierParts.join('_');
  }

  private createUniqueIdentifier(report: any): string {
    // Create a unique identifier using all relevant fields
    const fields = [
      report.menu_item_name,
      report.menu_name,
      report.price || report.menu_item_current_price,
      report.distance_from_zip_code
    ];
    
    // Filter out undefined/null values and join with a separator
    return fields.filter(field => field !== undefined && field !== null)
                .map(field => String(field).trim())
                .join('__|__'); // Use a unique separator that's unlikely to appear in the data
  }


    // Find the index of the selected report in both arrays
    
    selectReport1(selectedReport: TableReport): void {

      this.selectedMenuItemData = selectedReport;
      this.fetchReportss();
      this.showReportDetails = true;
      this.loading = true;
      this.getCompstoreRestaurants();
      
    }

    fetchReportss(): void {
     const compStoreRestaurants = this.selectedRestaurantNames.map(name => ({"restaurant_name": name}));

      const payload = {
      page_no: this.currentMenuPageComp,
      limit:this.rowsPerPageComp,
      month: this.selectedMonth,
      user_location_id:this.selectedMenuItemData.user_location_id,
      menu_item_name_id: this.selectedMenuItemData.id,
      filter_by:this.searchTermComp ?? null,
      comp_store_restaurants:compStoreRestaurants ?? null,
      sort_by: this.sortValue ?? null
    }

    this.reportsApiService.fetchReports(payload).subscribe({
      next: (response) => {
        this.loading = false;
        this.compStoreResults = response;
        this.totalMenuItemsComp = response.total_records;
      },
      error: (error) => {
        this.loading = false;
        console.error('Error fetching reports:', error);
      }
      
    })
  }
    // selectReport(selectedReport: TableReport): void {

    //   // Reset the view state first
    //   this.reports = [];
    //   this.reports1 = [];
    //   this.currentPages = [];
    //   this.error = null;
      
    //   // Deselect all reports first
    //   this.tableReports.forEach(report => {
    //     report.isSelected = false;
    //   });
      
    //   // Select the clicked report
    //   selectedReport.isSelected = true;
      
    //   // Store the selected menu item name for downloading
    //   this.selectedMenuItemName = selectedReport.menu_item_name || null;

    //   // Check for preloaded detailed report data first
    //   const preloadedData = this.reportPreloader.getPreloadedData();
    //   if (preloadedData && this.reportPreloader.isDataFresh()) {
    //     const reportKey = `${selectedReport.restaurant_name}_${selectedReport.menu_item_name || selectedReport.menu_name}`;
    //     const detailedData = preloadedData.detailedReports?.[reportKey];
        
    //     if (detailedData) {
    //       // console.log('Using preloaded detailed report data');
    //       // Don't show loading spinner for preloaded data
    //       this.loading = false;
    //       this.isReportChanging = false;
    //       this.loadingPercentage = 100;
    //       this.processSelectedReport(detailedData, selectedReport, null);
    //       return;
    //     }
    //   }

    //   // Set loading states only if we need to fetch data
    //   this.loading = true;
    //   this.isReportChanging = true; // Flag for modal transition loading
    //   this.loadingPercentage = 0;

    //   // Simulate progress during loading
    //   const progressInterval = setInterval(() => {
    //     if (this.loadingPercentage < 90) {
    //       this.loadingPercentage += 5;
    //     }
    //   }, 200);

    //   const previousMonth = new Date();
    //   previousMonth.setMonth(previousMonth.getMonth() - 1);
    //   const formattedPreviousMonth = previousMonth.toISOString().slice(0, 7);
    
    //   const twoMonthsAgo = new Date();
    //   twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    //   const formattedTwoMonthsAgo = twoMonthsAgo.toISOString().slice(0, 7);
    
    //   const createRequestBody = (month: string) => ({
    //     email: this.email || '',
    //     restaurant_name: selectedReport.restaurant_name,
    //     month: month,
    //     host_limit: this.host_limit,
    //     comp_limit: this.comp_limit
    //   });

    //   // Check cache for both requests
    //   const previousMonthCacheKey = this.getCacheKey(this.baseUrl, createRequestBody(formattedPreviousMonth));
    //   const twoMonthsAgoCacheKey = this.getCacheKey(this.baseUrl, createRequestBody(formattedTwoMonthsAgo));

    //   const cachedPreviousData = this.getCachedData(previousMonthCacheKey);
    //   const cachedTwoMonthsData = this.getCachedData(twoMonthsAgoCacheKey);

    //   if (cachedPreviousData && cachedTwoMonthsData) {
    //     this.processSelectedReport([cachedPreviousData, cachedTwoMonthsData], selectedReport, progressInterval);
    //     return;
    //   }

    //   const headers = this.getAuthHeaders();

    //   const previousMonthRequest = cachedPreviousData 
    //     ? of(cachedPreviousData)
    //     : this.http.post<any[]>(this.baseUrl, createRequestBody(formattedPreviousMonth), { headers }).pipe(
    //         timeout(this.API_TIMEOUT),
    //         retry(this.MAX_RETRIES),
    //         takeUntil(this.destroy$),
    //         map(data => {
    //           this.setCachedData(previousMonthCacheKey, data);
    //           return data;
    //         })
    //       );

    //   const twoMonthsAgoRequest = cachedTwoMonthsData
    //     ? of(cachedTwoMonthsData)
    //     : this.http.post<any[]>(this.baseUrl, createRequestBody(formattedTwoMonthsAgo), { headers }).pipe(
    //         timeout(this.API_TIMEOUT),
    //         retry(this.MAX_RETRIES),
    //         takeUntil(this.destroy$),
    //         map(data => {
    //           this.setCachedData(twoMonthsAgoCacheKey, data);
    //           return data;
    //         })
    //       );

    //   forkJoin([previousMonthRequest, twoMonthsAgoRequest]).pipe(
    //     catchError((error) => {
    //       console.error('Error fetching report details:', error);
    //       this.error = 'Failed to fetch report details.';
    //       this.loading = false;
    //       this.isReportChanging = false;
    //       clearInterval(progressInterval);
    //       return of([[], []]);
    //     })
    //   ).subscribe({
    //     next: ([previousData, twoMonthsAgoData]) => {
    //       // Cache the detailed report data
    //       const reportId = this.createReportIdentifier(selectedReport);
    //       this.reportPreloader.cacheDetailedReport(reportId, previousData, twoMonthsAgoData);
    //       this.processSelectedReport([previousData, twoMonthsAgoData], selectedReport, progressInterval);
    //     }
    //   });

    // }

    private processSelectedReport(data: [any[], any[]], selectedReport: TableReport, progressInterval: any): void {
      const [previousData, twoMonthsAgoData] = data;
      let finalData = previousData;

      // Cache this detailed report for future use
      const menuItemName = selectedReport.menu_item_name || selectedReport.menu_name || '';
      this.reportPreloader.cacheDetailedReport(selectedReport.restaurant_name, menuItemName, data);

      if (!Array.isArray(previousData) || previousData.length === 0 || !this.hasCompstoreData(previousData)) {
        finalData = twoMonthsAgoData;
      }

      if (Array.isArray(finalData) && finalData.length > 0) {
        // Create unique identifier for the selected report
        const selectedIdentifier = this.createUniqueIdentifier(selectedReport);

        // Filter the data to find exact match
        const matchingData = finalData.filter(item => {
          if (!item.host_data) return false;
          
          const hostIdentifier = this.createUniqueIdentifier({
            menu_item_name: item.host_data.menu_item_name,
            menu_name: item.host_data.menu_name,
            price: this.parsePriceValue(item.host_data.menu_item_current_price),
            distance_from_zip_code: item.host_data.distance_from_zip_code
          });

          return hostIdentifier === selectedIdentifier;
        });

        if (matchingData.length > 0) {
          // Process only the exactly matching data
          matchingData.forEach(item => {
            if (item.host_data) {
              this.reports.push(item.host_data);
              if (Array.isArray(item.compstore_data)) {
                this.reports1.push(item.compstore_data);
              } else {
                this.reports1.push([]);
              }
              this.currentPages.push(1);
            }
          });

          // this.showReportDetails = true;
          this.initializeReportView(); // Initialize the report view
        } else {
          this.error = 'No exact match found for the selected report.';
        }
      } else {
        this.error = 'No data found for the selected report.';
      }

      // Complete the loading
      this.loadingPercentage = 100;
      setTimeout(() => {
        this.loading = false;
        this.isReportChanging = false;
        clearInterval(progressInterval);
      }, 300); // Short delay to show 100%
    }

  
    // Add a method to clear current report view
    clearCurrentReport(): void {
      this.reports = [];
      this.reports1 = [];
      this.currentPages = [];
      this.showReportDetails = false;
      this.error = null;
    }
  
  
  getReportDisplayText(report: TableReport): string {
    const parts = [];
    if (report.menu_item_name) parts.push(report.menu_item_name);
    if (report.menu_name) parts.push(report.menu_name);
    if (report.price) parts.push(`$${report.price.toFixed(2)}`);
    if (report.distance_from_zip_code) parts.push(`${report.distance_from_zip_code} mi`);
    return parts.join(' - ') || 'N/A';
  }

  getReportId(restaurantName: string): string {
    return `report-${restaurantName.replace(/\s+/g, '-').toLowerCase()}`;
  }

  // fetchReports(): void {
  //   if (!this.selectedRestaurant) {
  //     this.error = 'Restaurant name is not set.';
  //     console.error(this.error);
  //     return;
  //   }
  
  //   const previousMonth = new Date();
  //   previousMonth.setMonth(previousMonth.getMonth() - 1);
  //   const formattedPreviousMonth = previousMonth.toISOString().slice(0, 7);
  //   // console.log('Formatted Previous Month:', formattedPreviousMonth);
  
  //   const twoMonthsAgo = new Date();
  //   twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  //   const formattedTwoMonthsAgo = twoMonthsAgo.toISOString().slice(0, 7);
  //   // console.log('Formatted Two Months Ago:', formattedTwoMonthsAgo);
  
  //   const headers = this.getAuthHeaders();

  //   const createRequestBody = (month: string) => ({
  //     email: this.email || '',
  //     restaurant_name: this.selectedRestaurant,
  //     month: month,
  //     host_limit: this.host_limit,
  //     comp_limit: this.comp_limit
  //   });

  //   // Check cache for both requests
  //   const previousMonthCacheKey = this.getCacheKey(this.baseUrl, createRequestBody(formattedPreviousMonth));
  //   const twoMonthsAgoCacheKey = this.getCacheKey(this.baseUrl, createRequestBody(formattedTwoMonthsAgo));

  //   const cachedPreviousData = this.getCachedData(previousMonthCacheKey);
  //   const cachedTwoMonthsData = this.getCachedData(twoMonthsAgoCacheKey);

  //   // Set loading states
  //   this.loading = true;
  //   this.loadingPercentage = 0;
  //   this.error = null;
    
  //   // Simulate progress during loading
  //   const progressInterval = setInterval(() => {
  //     if (this.loadingPercentage < 90) {
  //       this.loadingPercentage += 5;
  //     }
  //   }, 200);

  //   if (cachedPreviousData && cachedTwoMonthsData) {
  //     this.processFetchedReports([cachedPreviousData, cachedTwoMonthsData], progressInterval);
  //     return;
  //   }
  
  //   const previousMonthRequest = cachedPreviousData 
  //     ? of(cachedPreviousData)
  //     : (console.log('Calling /report for previous month with body:', createRequestBody(formattedPreviousMonth)),
  //        this.http.post<any[]>(this.baseUrl, createRequestBody(formattedPreviousMonth), { headers }).pipe(
  //         timeout(this.API_TIMEOUT),
  //         retry(this.MAX_RETRIES),
  //         takeUntil(this.destroy$),
  //         map(data => {
  //           this.setCachedData(previousMonthCacheKey, data);
  //           return data;
  //         })
  //       ));

  //   const twoMonthsAgoRequest = cachedTwoMonthsData
  //     ? of(cachedTwoMonthsData)
  //     : (console.log('Calling /report for two months ago with body:', createRequestBody(formattedTwoMonthsAgo)),
  //        this.http.post<any[]>(this.baseUrl, createRequestBody(formattedTwoMonthsAgo), { headers }).pipe(
  //           timeout(this.API_TIMEOUT),
  //           retry(this.MAX_RETRIES),
  //           takeUntil(this.destroy$),
  //           map(data => {
  //             this.setCachedData(twoMonthsAgoCacheKey, data);
  //             return data;
  //           })
  //         ));
  
  //   // Execute both requests in parallel
  //   forkJoin([previousMonthRequest, twoMonthsAgoRequest]).pipe(
  //     catchError((error) => {
  //       console.error('Error fetching reports:', error);
  //       this.error = 'Reports not Available. Please try again later after uploading your menu.';
  //       this.loading = false;
  //       clearInterval(progressInterval);
  //       this.loadingPercentage = 0;
  //       return of([[], []]);
  //     })
  //   ).subscribe({
  //     next: ([previousData, twoMonthsAgoData]) => {
  //       this.processFetchedReports([previousData, twoMonthsAgoData], progressInterval);
  //     }
  //   });
  // }


  private verifyPaymentsThenLoad(): void {
    const email = this.email;
    if (!email) {
      this.continueReportsInitFlow();
      return;
    }

    this.isPaymentsLoading = true;
    this.paymentService.getUserPayments(email).pipe(
      timeout(this.API_TIMEOUT),
      catchError((err) => {
        console.warn('Payments check failed or timed out, proceeding to reports:', err);
        return of(null);
      }),
      finalize(() => {
        this.isPaymentsLoading = false;
      })
    ).subscribe(() => {
      this.isPaymentsChecked = true;
      this.continueReportsInitFlow();
    });
  }

  // private processFetchedReports(data: [any[], any[]], progressInterval: any, prevMonth: string, twoAgoMonth: string): void {
  //   const [previousData, twoMonthsAgoData] = data;
  //   // console.log('Previous Month Data:', previousData);
  //   // console.log('Two Months Ago Data:', twoMonthsAgoData);

  //   let finalData = previousData;
  //   this.lastResolvedMonth = prevMonth;

  //   // If no valid data for previous month, use two months ago data
  //   if (!Array.isArray(previousData) || previousData.length === 0 || !this.hasCompstoreData(previousData)) {
  //     // console.log('No valid data for previous month. Falling back to two months ago.');
  //     finalData = twoMonthsAgoData;
  //     this.lastResolvedMonth = twoAgoMonth;
  //   }

  //   if (Array.isArray(finalData) && finalData.length > 0) {
  //     this.error = null;
  //     this.debugLogData(finalData);
  //     this.lastResolvedData = finalData;
  //     this.reports = [];
  //     this.reports1 = [];
  //     this.currentPages = [];

  //     // Check if we have a selected restaurant and it exists in the data
  //     const selectedIndex = finalData.findIndex(
  //       item => item.host_data?.restaurant_name === this.selectedRestaurant
  //     );

  //     finalData.forEach((item, index) => {
  //       if (item.host_data) {
  //         // If this is the selected restaurant, add it to the beginning
  //         if (item.host_data.restaurant_name === this.selectedRestaurant) {
  //           this.reports.unshift(item.host_data);
  //           if (Array.isArray(item.compstore_data)) {
  //             this.reports1.unshift(item.compstore_data);
  //           } else {
  //             this.reports1.unshift([]);
  //           }
  //         } else {
  //           // Otherwise, add it to the end
  //           this.reports.push(item.host_data);
  //           if (Array.isArray(item.compstore_data)) {
  //             this.reports1.push(item.compstore_data);
  //           } else {
  //             this.reports1.push([]);
  //           }
  //         }
  //         this.currentPages.push(1);
  //       }
  //     });
      
  //     this.initializeTableReports(finalData);

  //     // console.log('Final Host Reports:', this.reports);
  //     // console.log('Final Grouped Compstore Data:', this.reports1);
  //   } else {
  //     this.error = this.restaurantNames.length > 0
  //       ? 'Reports are being generated for your restaurant. Please refresh or come back later.'
  //       : 'No reports available to generate. Please upload your menu template first.';
  //     // console.log('No valid data found for any month.');
  //   }
    
  //   // Complete the loading
  //   this.loadingPercentage = 100;
  //   setTimeout(() => {
  //     this.loading = false;
  //     clearInterval(progressInterval);
  //   }, 300); // Short delay to show 100%
  // }

  private processSelectedFromCached(finalData: any[], selectedReport: TableReport, progressInterval: any): void {
    if (Array.isArray(finalData) && finalData.length > 0) {
      const selectedIdentifier = this.createUniqueIdentifier(selectedReport);
      const matchingData = finalData.filter(item => {
        if (!item.host_data) return false;
        const hostIdentifier = this.createUniqueIdentifier({
          menu_item_name: item.host_data.menu_item_name,
          menu_name: item.host_data.menu_name,
          price: this.parsePriceValue(item.host_data.menu_item_current_price),
          distance_from_zip_code: item.host_data.distance_from_zip_code
        });
        return hostIdentifier === selectedIdentifier;
      });

      if (matchingData.length > 0) {
        this.reports = [];
        this.reports1 = [];
        this.currentPages = [];
        matchingData.forEach(item => {
          if (item.host_data) {
            this.reports.push(item.host_data);
            this.reports1.push(Array.isArray(item.compstore_data) ? item.compstore_data : []);
            this.currentPages.push(1);
          }
        });
        this.showReportDetails = true;
        this.initializeReportView();
      } else {
        this.error = 'No exact match found for the selected report.';
      }
    } else {
      this.error = 'No data found for the selected report.';
    }
    this.loadingPercentage = 100;
    setTimeout(() => {
      this.loading = false;
      this.isReportChanging = false;
      clearInterval(progressInterval);
    }, 300);
  }
  

// Utility to check if compstore data exists
private hasCompstoreData(data: any[]): boolean {
  return data.some(item => Array.isArray(item.compstore_data) && item.compstore_data.length > 0);
}

  
  
  
  
  

  // Keep existing methods...
  getPagedStores(): ReportData[] {
    // Flatten the array and slice for pagination
    const flatReports = this.reports1.flat(); // Flatten the array of arrays
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return flatReports.slice(startIndex, endIndex);
  }
  

  // previousPage() {
  //   if (this.currentPage > 1) {
  //     this.currentPage--;
  //   }
  // }

  // nextPage(): void {
  //   if (this.currentPage < this.totalCompstorePages) {
  //     this.currentPage++;
  //   }
  // }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalCompstorePages) {
      return;
    }
    this.currentPage = page;
  }
  

  // downloadReports(restaurantName: string): void {
  //   this.loading = true;
  
  //   const previousMonth = new Date();
  //   previousMonth.setMonth(previousMonth.getMonth() - 1);
  //   const formattedPreviousMonth = previousMonth.toISOString().slice(0, 7);
  
  //   const twoMonthsAgo = new Date();
  //   twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  //   const formattedTwoMonthsAgo = twoMonthsAgo.toISOString().slice(0, 7);
  
  //   const fetchForMonth = (month: string) => {
  //     const params = new HttpParams()
  //       .set('api_key', this.apiKey)
  //       .set('email', this.email || '')
  //       .set('host_limit', this.host_limit)
  //       .set('comp_limit', this.comp_limit)
  //       .set('month', month)
  //       .set('restaurant_name', restaurantName);
  
  //     this.http.post<any[]>(this.baseUrl, {}, { params }).subscribe({
  //       next: (data) => {
  //         if (Array.isArray(data) && data.length > 0) {
  //           const hostData = data[0].host_data || {};
  //           const compstoreData: CompstoreData[] = data[0].compstore_data || [];
  
  //           const workbook = XLSX.utils.book_new();
  //           const requiredHostKeys = [
  //             'restaurant_name',
  //             'restaurant_address',
  //             'menu_name',
  //             'menu_description',
  //             'menu_current_price',
  //             'zip_or_postal_code',
  //             'distance_from_zip_code',
  //             'restaurant_type',
  //             'restaurant_style',
  //           ];
  
  //           const requiredCompstoreKeys = [
  //             'restaurant_name',
  //             'address',
  //             'menu_item_name',
  //             'description',
  //             'price',
  //             'zip_or_postal_code',
  //             'distance',
  //             'restaurant_type',
  //             'restaurant_style',
  //           ];
  
  //           const headerRow = ['Host Data', 'Value', 'Compstore Data', 'Values'];
  //           const rows: any[][] = [headerRow];
  
  //           requiredHostKeys.forEach((hostKey, index) => {
  //             const hostValue = hostData[hostKey] || 'N/A';
  //             const compstoreTitle = requiredCompstoreKeys[index];
  //             const compstoreValues = compstoreData.map(
  //               (compstore: CompstoreData) => compstore[compstoreTitle] || 'N/A'
  //             );
  //             const row = [hostKey, hostValue, compstoreTitle, ...compstoreValues];
  //             rows.push(row);
  //           });
  
  //           const worksheet = XLSX.utils.aoa_to_sheet(rows);
  //           XLSX.utils.book_append_sheet(workbook, worksheet, 'Formatted Report');
  
  //           const fileName = `${restaurantName}_Report_${new Date()
  //             .toISOString()
  //             .slice(0, 10)}.xlsx`;
  //           XLSX.writeFile(workbook, fileName);
  //         } else if (month === formattedPreviousMonth) {
  //           console.log('No data found for the previous month. Trying two months ago...');
  //           fetchForMonth(formattedTwoMonthsAgo);
  //         } else {
  //           alert('No data available for this restaurant.');
  //         }
  //         this.loading = false;
  //       },
  //       error: (err) => {
  //         console.error('Error downloading report:', err);
  //         alert('Failed to download report. Please try again.');
  //         this.loading = false;
  //       },
  //     });
  //   };
  
  //   fetchForMonth(formattedPreviousMonth);
  // }
  

  // downloadCombinedReport(host: ReportData, compstoreData: ReportData[], hostIndex: number): void {
  //   const workbook = XLSX.utils.book_new();
  
  
  //   const hostKeys = [
  //     'restaurant_name',
  //     'restaurant_address',
  //     'menu_name',
  //     'menu_description',
  //     'menu_current_price',
  //     'zip_or_postal_code',
  //     'distance_from_zip_code',
  //     'restaurant_type',
  //     'restaurant_style'
  //   ];
    
  //   const compstoreKeys = [
  //     'restaurant_name',
  //     'address',
  //     'menu_item_name',
  //     'description',
  //     'price',
  //     'zip_or_postal_code',
  //     'distance',
  //     'restaurant_type',
  //     'restaurant_style'
  //   ];
  
    
  //   const filteredHost = Object.fromEntries(
  //     Object.entries(host).filter(([key]) => hostKeys.includes(key))
  //   );
  
   
  //   const filteredCompstoreData = compstoreData.map(store => 
  //     Object.fromEntries(Object.entries(store).filter(([key]) => compstoreKeys.includes(key)))
  //   );
  
    
  //   const headerRow = ['Host Data Key', 'Host Data Value'];
  //   const compstoreHeaders = filteredCompstoreData.flatMap((_, index) =>
  //     [`Compstore ${index + 1} Key`, `Compstore ${index + 1} Value`]
  //   );
  //   const rows: any[][] = [headerRow.concat(compstoreHeaders)];
  
    
  //   const hostEntries = Object.entries(filteredHost);
  
    
  //   const compstoreEntries = filteredCompstoreData.map(store => Object.entries(store));
  
    
  //   const maxRows = Math.max(hostEntries.length, Math.max(...compstoreEntries.map(entries => entries.length)));
  
  //   for (let i = 0; i < maxRows; i++) {
  //     const row: any[] = [];
  
      
  //     const hostKey = hostEntries[i]?.[0] || ''; // Host key or empty
  //     const hostValue = hostEntries[i]?.[1] || ''; // Host value or empty
  //     row.push(hostKey, hostValue);
  
      
  //     compstoreEntries.forEach(entries => {
  //       const compstoreKey = entries[i]?.[0] || ''; // Compstore key or empty
  //       const compstoreValue = entries[i]?.[1] || ''; // Compstore value or empty
  //       row.push(compstoreKey, compstoreValue);
  //     });
  
  //     rows.push(row);
  //   }
  
    
  //   const worksheet = XLSX.utils.aoa_to_sheet(rows);
  //   XLSX.utils.book_append_sheet(workbook, worksheet, `Combined Report`);
  
    
  //   const fileName = `Combined_Report_${filteredHost['restaurant_name']}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  //   XLSX.writeFile(workbook, fileName);
  // }

  // downloadCombinedReport(): void {
  //   const email = localStorage.getItem('userEmail');
  //   if (!email) {
  //     alert('User email is not available. Please log in again.');
  //     this.router.navigate(['/login']);
  //     return;
  //   }
  
  //   const previousMonth = new Date();
  //   previousMonth.setMonth(previousMonth.getMonth() - 1);
  //   const formattedMonth = previousMonth.toISOString().slice(0, 7);
  
  //   // Log the formatted month
  //   console.log('Formatted month:', formattedMonth);
  
  //   const params = new HttpParams()
  //     .set('api_key', 'dapif4fb3a4ddc6bc98fe20910fb3ba74c03-3')
  //     .set('email', email)
  //     .set('host_limit', this.host_limit)
  //     .set('comp_limit', this.comp_limit)
  //     .set('month', formattedMonth)
  //     .set('restaurant_name', this.restaurantNames[0] || '');
  
  //   // Set loading state and initialize progress
  //   this.isDownloading = true;
  //   this.downloadProgress = 0;
    
  //   // Simulate progress
  //   const totalTime = 35000; // 35 seconds
  //   const intervalTime = 350; // Update every 350ms
  //   const steps = totalTime / intervalTime;
  //   const incrementAmount = 100 / steps;
  
  //   this.progressInterval = setInterval(() => {
  //     this.downloadProgress = Math.min(this.downloadProgress + incrementAmount, 99);
  //   }, intervalTime);
  
  //   this.http.post(this.templateApiUrl, {}, { params, responseType: 'blob' }).subscribe({
  //     next: (blob: Blob) => {
  //       // Set progress to 100% when download is complete
  //       this.downloadProgress = 100;
  //       clearInterval(this.progressInterval);
  
  //       const downloadUrl = window.URL.createObjectURL(blob);
  //       const link = document.createElement('a');
  //       link.href = downloadUrl;
  //       link.download = 'Combined Report.xlsx';
  //       document.body.appendChild(link);
  //       link.click();
  //       document.body.removeChild(link);
  
  //       // Reset loading state after a brief delay to show 100%
  //       setTimeout(() => {
  //         this.isDownloading = false;
  //         this.downloadProgress = 0;
  //       }, 500);
  //     },
  //     error: (err) => {
  //       console.error('Error downloading the template:', err);
  //       alert('Failed to download the Report. Please try again later.');
  
  //       // Reset loading state
  //       clearInterval(this.progressInterval);
  //       this.isDownloading = false;
  //       this.downloadProgress = 0;
  //     },
  //   });
  // }

  downloadMenuItemReport(menuItem: TableReport): void {
    if (!this.email) {
      alert('User email is not available. Please log in again.');
      this.router.navigate(['/login']);
      return;
    }
  
    const selectedReport = this.tableReports.find(report => report.isSelected);
    
    if (!selectedReport) {
      alert('Please select a report first.');
      return;
    }
  
    // console.log('Downloading report for:', {
    //   restaurant: selectedReport.restaurant_name,
    //   menuItem: selectedReport.menu_item_name,
    //   price: selectedReport.price
    // });
  
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const formattedMonth = previousMonth.toISOString().slice(0, 7);
  
    const headers = this.getAuthHeaders();
    const requestBody = {
      email: this.email,
      restaurant_name: selectedReport.restaurant_name,
      menu_item_name: selectedReport.menu_item_name || '',
      month: formattedMonth,
      comp_limit: this.comp_limit.toString(),
      host_limit: this.host_limit.toString()
    };
  
    // console.log('Download request body:', requestBody);
  
    // Set download state for the specific menu item
    selectedReport.isDownloading = true;
    selectedReport.downloadProgress = 0;
  
    const progressInterval = setInterval(() => {
      if (selectedReport.downloadProgress < 99) {
        selectedReport.downloadProgress += 1;
      }
    }, 350);
  
    this.http.post(this.templateApiUrl, requestBody, { 
      headers,
      responseType: 'blob',
      observe: 'response'
    }).subscribe({
      next: (response: any) => {
        clearInterval(progressInterval);
        selectedReport.downloadProgress = 100;
  
        const blob = response.body;
        
        // Use the selected report's data for the filename
        const sanitizedMenuItemName = (selectedReport.menu_item_name || 'unknown_item')
          .replace(/[^a-zA-Z0-9]/g, '_');
        const sanitizedRestaurantName = selectedReport.restaurant_name
          .replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${sanitizedRestaurantName}_${sanitizedMenuItemName}_${formattedMonth}_Report.xlsx`;
  
        // Create and trigger download
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
  
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
  
        // Reset download state after a brief delay
        setTimeout(() => {
          selectedReport.isDownloading = false;
          selectedReport.downloadProgress = 0;
        }, 500);
  
        // console.log('Download completed successfully:', fileName);
      },
      error: (err) => {
        console.error('Error downloading the menu item report:', err);
        alert(`Failed to download the report for ${selectedReport.menu_item_name || 'unknown item'}. Please try again later.`);
        
        clearInterval(progressInterval);
        selectedReport.isDownloading = false;
        selectedReport.downloadProgress = 0;
      }
    });
  }
  

  
  private parsePriceValue(price: any): number {
    if (typeof price === 'number') {
      return price;
    }
    if (typeof price === 'string') {
      const cleanPrice = price.replace(/[^0-9.]/g, '');
      return parseFloat(cleanPrice) || 0;
    }
    return 0;
  }
  
  initializeTableReports(finalData: any[]): void {
    this.tableReports = [];
    
    finalData.forEach(item => {
      if (item.host_data) {
        const hostReport: TableReport = {
          menu_item_name: item.host_data['menu_item_name'] || '',
          menu_name: item.host_data['menu_name'] || '',
          price: this.parsePriceValue(item.host_data['menu_item_current_price']),
          distance_from_zip_code: item.host_data['distance_from_zip_code'] || '',
          restaurant_name: item.host_data['restaurant_name'] || 'N/A',
          zip_or_postal_code: item.host_data['zip_or_postal_code'] || 'N/A',
          created_at: item.host_data['created_at'] || new Date().toISOString(),
          isDownloading: false,
          downloadProgress: 0,
          isSelected: false
        };

        if (hostReport.menu_item_name || hostReport.menu_name || 
            hostReport.price || hostReport.distance_from_zip_code) {
          this.tableReports.push(hostReport);
        }
      }
    });

    this.sortReports();
  }


  // Add this method to help with debugging
  private debugLogData(finalData: any[]): void {
    // console.log('Raw Final Data Structure:', finalData);
    if (finalData.length > 0) {
      // console.log('Sample Host Data Structure:', finalData[0].host_data);
      // console.log('Sample Compstore Data Structure:', finalData[0].compstore_data?.[0]);
    }
  }
  
  sortReports(): void {
    this.tableReports.sort((a, b) => {
      const { column, direction } = this.sortConfig;
      const multiplier = direction === 'asc' ? 1 : -1;
      
      switch (column) {
        case 'menu_item_name':
          return multiplier * ((a.menu_name || '').localeCompare(b.menu_item_name || ''));  // Updated to use menu_item_name
        case 'price':
          return multiplier * ((a.price || 0) - (b.price || 0));
        case 'created_at':
          return multiplier * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        default:
          return 0;
      }
    });
  }
  
  updateSort(column: 'menu_item_name' | 'price' | 'created_at'): void {
    if (this.sortConfig.column === column) {
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortConfig.column = column;
      this.sortConfig.direction = 'asc';
    }
    this.sortReports();
  }
  
  showHelp() {
    this.helpVisible = true;
  }

  hideHelp() {
    this.helpVisible = false;
  }

  goBack(): void {
    this.router.navigate(['/user-dashboard']);
  }

  onSubmit(): void {
    this.router.navigate(['/user-dashboard']);
  }

  onSubmit1(): void {
    this.router.navigate(['/tabledemo']);
  }
  
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  refreshReports(): void {
    this.error = null;
    this.loading = true;
    // this.fetchReports();
  }

  // getEmptyStateMessage(): string {
  //   const hasTemplate = this.hasUploadedTemplate();
  //   const isSubscribed = this.isPaymentsChecked;
  //   if (hasTemplate || isSubscribed) {
  //     return 'Reports are being generated for your restaurant. Please refresh or come back later.';
  //   }
  //   return 'No reports available to generate. Please upload your menu template to generate reports.';
  // }

  logReportData(): void {
    // console.log('Current Table Reports:', this.tableReports);
    // console.log('Sort Config:', this.sortConfig);
  }
  
  // Report view methods
  onReportSearchQueryChange(event: any): void {
    this.currentMenuPageComp = 1;
    this.fetchReportss();
  }
  searchtermChange(event: any): void {
    this.currentMenuPageComp = 1;
    if(this.searchTermComp == '') {
      this.fetchReportss();
    }
  }
  
  filterByDistance(): void {
    if (this.selectedDistance === 0) {
      // Show all results
      this.filteredReportList = [...this.originalFilteredReportList];
    } else {
      // Filter by selected distance
      this.filteredReportList = this.originalFilteredReportList.filter(item => {
        const distance = parseFloat(item.distance_from_zipcode || '0');
        return distance <= this.selectedDistance;
      });
    }
    
    // Apply other filters
    this.filterReportResults();
  }

  // changeSelectedReport(): void {
  //   if (!this.selectedReportId) return;
    
  //   const selectedReport = this.tableReports.find(report => report.menu_item_name === this.selectedReportId);
  //   if (selectedReport) {
  //     this.isReportChanging = true; // Flag for modal transition loading
  //     this.selectReport(selectedReport);
  //   }
    
  //   // Reset the dropdown after selection
  //   this.selectedReportId = '';
  // }
  
  clearReportSearchQuery(): void {
    this.reportSearchQuery = '';
    this.filterReportResults();
    this.updatePagedReportList();
  }
  
  filterReportResults(): void {
    let filtered = [...this.originalFilteredReportList];
    
    // Apply search filter
    if (this.reportSearchQuery.trim()) {
      const query = this.reportSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => {
        return (
          (item.restaurant_name && item.restaurant_name.toLowerCase().includes(query)) ||
          (item.menu_item_name && item.menu_item_name.toLowerCase().includes(query)) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          (item.address && item.address.toLowerCase().includes(query)) ||
          (item.menu_name && item.menu_name.toLowerCase().includes(query)) ||
          (item.restaurant_type && item.restaurant_type.toLowerCase().includes(query)) ||
          (item.restaurant_style && item.restaurant_style.toLowerCase().includes(query))
        );
      });
    }
    
    // Apply restaurant filter
    if (this.selectedRestaurantNames.length > 0) {
      filtered = filtered.filter(item => 
        this.selectedRestaurantNames.includes(item.restaurant_name)
      );
    }
    
    this.filteredReportList = filtered;
    this.currentReportPage = 1;
    this.applySortToReportList();
    this.groupRestaurantData();
    
    // Reset expanded states
    this.expandedReportRows = [];
    this.areAllReportRowsExpanded = false;
    this.groupedRestaurants.forEach(restaurant => {
      restaurant.isExpanded = false;
    });
    
    this.updatePagedReportList();
  }
  
  // Sorting functionality
  toggleReportSortMenu(): void {
    this.showReportSortMenu = !this.showReportSortMenu;
    if (this.showReportExportMenu) {
      this.showReportExportMenu = false;
    }
  }
  
 getReportSortLabel() {
  switch (this.currentSortBy) {
    case 'price-asc':
      return 'Price (Low to High)';
    case 'price-desc':
      return 'Price (High to Low)';

    case 'restaurant-asc':
      return 'Restaurant (A-Z)';
    case 'restaurant-desc':
      return 'Restaurant (Z-A)';

    case 'distance-asc':
      return 'Distance (Nearest First)';
    case 'distance-desc':
      return 'Distance (Farthest First)';

    default:
      return 'Default';
  }
}

  
  sortReportResults(sortOption: string): void {
   this.currentSortBy = sortOption;
   this.sortValue = '';

  switch (sortOption) {
    case 'price-asc':
      this.sortValue = 'price-asc';
      break;
    case 'price-desc':
      this.sortValue = 'price-desc';
      break;

    case 'restaurant-asc':
      this.sortValue = 'restaurant-asc';
      break;
    case 'restaurant-desc':
      this.sortValue = 'restaurant-desc';
      break;

    case 'distance-asc':
      this.sortValue = 'distance-asc';
      break;
    case 'distance-desc':
      this.sortValue = 'distance-desc';
      break;
  }
  

  this.showReportSortMenu = false; // close dropdown
  this.fetchReportss();
  }
  
  applySortToReportList(): void {
    const { field, direction } = this.reportSortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;
    
    this.filteredReportList.sort((a, b) => {
      let valueA = a[field];
      let valueB = b[field];
      
      // Handle numeric values
      if (field === 'price' || field === 'distance_from_zipcode') {
        valueA = parseFloat(valueA) || 0;
        valueB = parseFloat(valueB) || 0;
        return multiplier * (valueA - valueB);
      }
      
      // Handle string values
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return multiplier * valueA.localeCompare(valueB);
      }
      
      // Fallback for undefined values
      if (valueA === undefined) return multiplier;
      if (valueB === undefined) return -multiplier;
      
      return 0;
    });
  }
  
  // Pagination functionality


  
 

updatePagedReportList(): void {
  const startIndex = (this.currentReportPage - 1) * this.itemsPerReportPage;
  const endIndex = startIndex + this.itemsPerReportPage;
  this.pagedReportList = this.filteredReportList.slice(startIndex, endIndex);

  // Reset expanded states
  this.expandedReportRows = new Array(this.pagedReportList.length).fill(false);
  this.areAllReportRowsExpanded = false;
  this.groupedRestaurants.forEach(restaurant => {
    restaurant.isExpanded = false;
  });

  // Log for debugging
  // console.log('Paged report list updated:', this.pagedReportList.length, 'items');
  // console.log('Expanded rows initialized:', [...this.expandedReportRows]);
  // console.log('Grouped restaurants reset:', this.groupedRestaurants.map(r => ({ name: r.restaurantName, isExpanded: r.isExpanded })));

  // Force change detection
  this.cdr.markForCheck();
  this.cdr.detectChanges();
}
  
  // Expand/Collapse functionality
  toggleReportExpand(index: number): void {
    this.expandedReportRows[index] = !this.expandedReportRows[index];
    this.areAllReportRowsExpanded = this.expandedReportRows.every(expanded => expanded);
  }
  
  toggleAllReportRows(): void {
  this.areAllReportRowsExpanded = !this.areAllReportRowsExpanded;

  // Create an array of booleans (true/false) matching the length of compstoreRestaurants
  this.expandedReportRows = this.compstoreRestaurants.map(() => this.areAllReportRowsExpanded);
}


  // Host restaurant expand/collapse functionality
  toggleHostRestaurant(): void {
    this.isHostRestaurantExpanded = !this.isHostRestaurantExpanded;
  }

  // Scroll detection for auto-collapse
  onCompstoreScroll(event: Event): void {
    const element = event.target as HTMLElement;
    if (element.scrollTop > 50 && this.isHostRestaurantExpanded) {
      this.isHostRestaurantExpanded = false;
    }
  }
  
  // Export functionality
  toggleReportExportMenu(): void {
    this.showReportExportMenu = !this.showReportExportMenu;
    if (this.showReportSortMenu) {
      this.showReportSortMenu = false;
    }
  }
  
  exportReportData(format: 'csv' | 'xlsx' | 'pdf'): void {
    this.showReportExportMenu = false;
    
 
    switch (format) {
      case 'csv':
        this.downloadReport('csv');
        break;
      case 'xlsx':
        this.downloadReport('excel');
        break;
      case 'pdf':
        this.downloadReport('pdf');
        break;
  
    }
  }
  
  exportReportToCsv(): void {
    // Get host restaurant info
    const hostInfo = this.reports[0] || {};
    
    // Prepare CSV content with sections
    let csvContent = '';
    
    // 1. Add report header
    csvContent += '"MENU PRICE COMPARISON REPORT",,,,,,,\n';
    csvContent += `"Generated on ${new Date().toLocaleDateString()}",,,,,,,\n\n`;
    
    // 2. Add host information section
    csvContent += '"HOST RESTAURANT INFORMATION",,,,,,,\n';
    csvContent += `"Restaurant","${hostInfo.restaurant_name || ''}",,,,,\n`;
    csvContent += `"Menu Item","${hostInfo.menu_item_name || ''}",,,,,\n`;
    csvContent += `"Price","$${hostInfo.price || hostInfo.menu_item_current_price || ''}",,,,,\n`;
    csvContent += `"Zip Code","${hostInfo.zip_or_postal_code || ''}",,,,,\n`;
    csvContent += `"Max Distance","${hostInfo.distance_from_zip_code || ''} miles",,,,,\n\n`;
    
    // 3. Add summary statistics
    const avgPrice = this.calculateAveragePrice();
    const priceDiff = this.calculatePriceDifference();
    
    csvContent += '"PRICE COMPARISON SUMMARY",,,,,,,\n';
    csvContent += `"Total Competitors","${this.filteredReportList.length}",,,,,\n`;
    csvContent += `"Average Competitor Price","$${avgPrice}",,,,,\n`;
    csvContent += `"Your Price vs Average","${parseFloat(priceDiff) > 0 ? 'higher' : 'lower'}",,,,,\n\n`;
    
    // 4. Add detailed comparison table
    csvContent += '"DETAILED COMPARISON",,,,,,,\n';
    
    // Prepare CSV header
    const headers = [
      'Restaurant Name',
      'Menu Item Name',
      'Description',
      'Price',
      'Price Difference',
      'Distance (miles)',
      'Restaurant Type',
      'Cuisine Type',
      'Address',
      'Zip Code'
    ];
    
    csvContent += headers.map(header => `"${header}"`).join(',') + '\n';
    
    // Add host as first row with special marking
    const hostPrice = parseFloat(hostInfo.price || hostInfo.menu_item_current_price || '0');
    const hostRow = [
      hostInfo.restaurant_name || '',
      hostInfo.menu_item_name || '',
      hostInfo.menu_item_description || hostInfo.description || '',
      `$${hostPrice.toFixed(2)}`,
      'HOST',
      '0',
      hostInfo.restaurant_type || '',
      hostInfo.cuisine_type || hostInfo.restaurant_style || '',
      hostInfo.restaurant_address || hostInfo.address || '',
      hostInfo.zip_or_postal_code || ''
    ];
    
    csvContent += hostRow.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    
    // Add competitor rows with price difference calculation
    this.filteredReportList.forEach(item => {
      const compPrice = parseFloat(item.price || '0');
      const priceDiff = (compPrice - hostPrice).toFixed(2);
      const priceDiffFormatted = parseFloat(priceDiff) > 0 ? `+$${priceDiff}` : `$${priceDiff}`;
      
      const row = [
        item.restaurant_name || '',
        item.menu_item_name || '',
        item.description || '',
        `$${compPrice.toFixed(2)}`,
        priceDiffFormatted,
        item.distance_from_zipcode || '',
        item.restaurant_type || '',
        item.restaurant_style || '',
        item.address || '',
        item.zip_or_postal_code || ''
      ];
      
      csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    // 5. Add price analysis section
    csvContent += '\n"PRICE ANALYSIS",,,,,,,\n';
    
    // Sort competitors by price
    const sortedByPrice = [...this.filteredReportList].sort((a, b) => {
      return parseFloat(a.price || '0') - parseFloat(b.price || '0');
    });
    
    // Get price statistics
    const lowestPrice = parseFloat(sortedByPrice[0]?.price || '0');
    const highestPrice = parseFloat(sortedByPrice[sortedByPrice.length - 1]?.price || '0');
    
    // Calculate percentile ranks
    const priceRank = sortedByPrice.findIndex(item => parseFloat(item.price || '0') >= hostPrice);
    const percentileRank = (priceRank / sortedByPrice.length) * 100;
    
    csvContent += `"Lowest Competitor Price","$${lowestPrice.toFixed(2)}","${((hostPrice - lowestPrice) / lowestPrice * 100).toFixed(1)}% ${hostPrice > lowestPrice ? 'higher' : 'lower'}",,,,,\n`;
    csvContent += `"Highest Competitor Price","$${highestPrice.toFixed(2)}","${((hostPrice - highestPrice) / highestPrice * 100).toFixed(1)}% ${hostPrice > highestPrice ? 'higher' : 'lower'}",,,,,\n`;
    csvContent += `"Average Competitor Price","$${avgPrice}","${((hostPrice - parseFloat(avgPrice)) / parseFloat(avgPrice) * 100).toFixed(1)}% ${hostPrice > parseFloat(avgPrice) ? 'higher' : 'lower'}",,,,,\n`;
    csvContent += `"Price Percentile","${percentileRank.toFixed(1)}%","Your price is higher than ${percentileRank.toFixed(1)}% of competitors",,,,,\n\n`;
    
    // Add top 5 lowest priced competitors
    csvContent += '"TOP 5 LOWEST PRICED COMPETITORS",,,,,,,\n';
    csvContent += '"Restaurant Name","Price","Distance (miles)",,,,,\n';
    
    sortedByPrice.slice(0, 5).forEach(item => {
      csvContent += `"${item.restaurant_name || ''}","$${parseFloat(item.price || '0').toFixed(2)}","${item.distance_from_zipcode || ''}",,,,,\n`;
    });
    
    // Add top 5 highest priced competitors
    csvContent += '\n"TOP 5 HIGHEST PRICED COMPETITORS",,,,,,,\n';
    csvContent += '"Restaurant Name","Price","Distance (miles)",,,,,\n';
    
    sortedByPrice.slice(-5).reverse().forEach(item => {
      csvContent += `"${item.restaurant_name || ''}","$${parseFloat(item.price || '0').toFixed(2)}","${item.distance_from_zipcode || ''}",,,,,\n`;
    });
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${hostInfo.restaurant_name}_menu_comparison_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  exportReportToExcel(): void {
    // Get host restaurant info
    const hostInfo = this.reports[0] || {};
    
    // For XLSX export, we'll need to dynamically load the xlsx library
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.async = true;
    script.onload = () => {
      // Once the library is loaded, we can use it
      const XLSX = (window as any).XLSX;
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // 1. Create Summary Sheet
      const summaryData = [
        ['Report Summary'],
        ['Generated Date', new Date().toLocaleString()],
        ['Host Restaurant', hostInfo.restaurant_name || ''],
        ['Menu Item', hostInfo.menu_item_name || ''],
        ['Host Price', `$${hostInfo.price || hostInfo.menu_item_current_price || ''}`],
        ['Zip Code', hostInfo.zip_or_postal_code || ''],
        ['Max Distance', `${hostInfo.distance_from_zip_code || ''} miles`],
        ['Total Competitors', this.filteredReportList.length.toString()],
        ['Average Competitor Price', `$${this.calculateAveragePrice()}`],
        ['Price Difference from Average', `$${this.calculatePriceDifference()}`]
      ];
      
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Apply styles to summary sheet (bold headers)
      summaryWs['!cols'] = [{ wch: 25 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
      
      // 2. Create Detailed Comparison Sheet
      const headers = [
        'Restaurant Name',
        'Menu Item Name',
        'Description',
        'Price',
        'Price Difference',
        'Distance (miles)',
        'Restaurant Type',
        'Cuisine Type',
        'Address',
        'Zip Code'
      ];
      
      // Add host data as first row with special formatting
      const hostRow = [
        hostInfo.restaurant_name || '',
        hostInfo.menu_item_name || '',
        hostInfo.menu_item_description || hostInfo.description || '',
        hostInfo.price || hostInfo.menu_item_current_price || '',
        'HOST',
        '0',
        hostInfo.restaurant_type || '',
        hostInfo.cuisine_type || hostInfo.restaurant_style || '',
        hostInfo.restaurant_address || hostInfo.address || '',
        hostInfo.zip_or_postal_code || ''
      ];
      
      // Prepare competitor rows with price difference calculation
      const compRows = this.filteredReportList.map(item => {
        const hostPrice = parseFloat(hostInfo.price || hostInfo.menu_item_current_price || '0');
        const compPrice = parseFloat(item.price || '0');
        const priceDiff = (compPrice - hostPrice).toFixed(2);
        const priceDiffFormatted = parseFloat(priceDiff) > 0 ? `+$${priceDiff}` : `$${priceDiff}`;
        
        return [
          item.restaurant_name || '',
          item.menu_item_name || '',
          item.description || '',
          item.price || '',
          priceDiffFormatted,
          item.distance_from_zipcode || '',
          item.restaurant_type || '',
          item.restaurant_style || '',
          item.address || '',
          item.zip_or_postal_code || ''
        ];
      });
      
      // Combine all rows
      const allRows = [headers, hostRow, ...compRows];
      const detailWs = XLSX.utils.aoa_to_sheet(allRows);
      
      // Set column widths
      detailWs['!cols'] = [
        { wch: 25 }, // Restaurant name
        { wch: 25 }, // Menu item
        { wch: 40 }, // Description
        { wch: 10 }, // Price
        { wch: 15 }, // Price diff
        { wch: 15 }, // Distance
        { wch: 15 }, // Restaurant type
        { wch: 15 }, // Cuisine
        { wch: 40 }, // Address
        { wch: 10 }  // Zip
      ];
      
      XLSX.utils.book_append_sheet(wb, detailWs, 'Detailed Comparison');
      
      // 3. Create Price Analysis Sheet
      const priceAnalysisData = this.createPriceAnalysisData(hostInfo);
      const priceAnalysisWs = XLSX.utils.aoa_to_sheet(priceAnalysisData);
      XLSX.utils.book_append_sheet(wb, priceAnalysisWs, 'Price Analysis');
      
      // Generate and download the file
      const fileName = `${hostInfo.restaurant_name}_menu_comparison_report`;
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    };
    
    script.onerror = () => {
      alert('Failed to load Excel export library. Please try CSV format instead.');
    };
    
    document.body.appendChild(script);
  }
  
  exportReportToPdf(): void {
    // Get host restaurant info
    const hostInfo = this.reports[0] || {};
    
    // For PDF export, we'll need to dynamically load the jspdf and jspdf-autotable libraries
    const jsPDFScript = document.createElement('script');
    jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    jsPDFScript.async = true;
    
    jsPDFScript.onload = () => {
      const autoTableScript = document.createElement('script');
      autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
      autoTableScript.async = true;
      
      autoTableScript.onload = () => {
        // Once both libraries are loaded, we can use them
        const { jsPDF } = (window as any).jspdf;
        
        // Create a new PDF document (landscape for more space)
        const doc = new jsPDF('landscape');
        
        // Add title and header info
        doc.setFontSize(20);
        doc.setTextColor(44, 62, 80); // Dark blue color
        doc.text('Menu Price Comparison Report', 14, 15);
        
        doc.setFontSize(12);
        doc.setTextColor(52, 73, 94); // Slightly lighter blue
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);
        
        // Add host restaurant info section
        doc.setFillColor(236, 240, 241); // Light gray background
        doc.rect(14, 25, 180, 25, 'F');
        
        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text('Host Restaurant Information', 16, 32);
        
        doc.setFontSize(10);
        doc.text(`Restaurant: ${hostInfo.restaurant_name || ''}`, 16, 38);
        doc.text(`Menu Item: ${hostInfo.menu_item_name || ''}`, 16, 44);
        doc.text(`Price: $${hostInfo.price || hostInfo.menu_item_current_price || ''}`, 100, 38);
        doc.text(`Zip Code: ${hostInfo.zip_or_postal_code || ''}`, 100, 44);
        
        // Add summary statistics
        const avgPrice = this.calculateAveragePrice();
        const priceDiff = this.calculatePriceDifference();
        
        doc.setFillColor(214, 234, 248); // Light blue background
        doc.rect(14, 55, 200, 20, 'F');
        
        doc.setFontSize(12);
        doc.setTextColor(41, 128, 185); // Blue text
        doc.text('Price Comparison Summary', 16, 62);
        
        doc.setFontSize(10);
        doc.setTextColor(44, 62, 80);
        doc.text(`Total Competitors: ${this.filteredReportList.length}`, 16, 68);
        doc.text(`Average Competitor Price: $${avgPrice}`, 80, 68);
        doc.text(`Your Price vs Average: ${parseFloat(priceDiff) > 0 ? 'higher' : 'lower'}`, 150, 68);
        
        // Add competitor comparison table
        const headers = [
          { header: 'Restaurant', dataKey: 'restaurant' },
          { header: 'Menu Item', dataKey: 'menuItem' },
          { header: 'Price', dataKey: 'price' },
          { header: 'Diff', dataKey: 'diff' },
          { header: 'Distance', dataKey: 'distance' },
          { header: 'Type', dataKey: 'type' },
          { header: 'Address', dataKey: 'address' }
        ];
        
        // Prepare data rows with price difference calculation
        const hostPrice = parseFloat(hostInfo.price || hostInfo.menu_item_current_price || '0');
        
        // Initialize tableRows without host data
        const tableRows: TableRow[] = [];
        
        // Add competitor rows
        this.filteredReportList.forEach(item => {
          const compPrice = parseFloat(item.price || '0');
          const priceDiff = (compPrice - hostPrice).toFixed(2);
          const priceDiffFormatted = parseFloat(priceDiff) > 0 ? `+$${priceDiff}` : `$${priceDiff}`;
          
          tableRows.push({
            restaurant: item.restaurant_name || '',
            menuItem: item.menu_item_name || '',
            price: `$${compPrice.toFixed(2)}`,
            diff: priceDiffFormatted,
            distance: `${item.distance_from_zipcode || ''} mi`,
            type: item.restaurant_type || '',
            address: item.address || ''
          });
        });
        
        // Add the table
        (doc as any).autoTable({
          startY: 80,
          head: [headers.map(h => h.header)],
          body: tableRows.map(row => headers.map(h => row[h.dataKey])),
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          rowStyles: { 
            0: { 
              fillColor: [235, 245, 251], 
              textColor: [44, 62, 80], 
              fontStyle: 'bold',
              lineWidth: 0.5,        // Add a border
              lineColor: [41, 128, 185]  // Blue border color
            } 
          },
            columnStyles: {
            2: { halign: 'right' }, // Price column right-aligned
            3: { halign: 'right' }  // Diff column right-aligned
          },
          didDrawPage: function(data: any) {
            // Add page number at the bottom
            doc.setFontSize(8);
            doc.text(
              `Page ${doc.internal.getNumberOfPages()}`,
              doc.internal.pageSize.width / 2,
              doc.internal.pageSize.height - 10,
              { align: 'center' }
            );
          }
        });
        
        // Save the PDF
        const fileName = `${hostInfo.restaurant_name}_menu_comparison_report`;
        doc.save(`${fileName}.pdf`);
      };
      
      autoTableScript.onerror = () => {
        alert('Failed to load PDF export library. Please try CSV format instead.');
      };
      
      document.body.appendChild(autoTableScript);
    };
    
    jsPDFScript.onerror = () => {
      alert('Failed to load PDF export library. Please try CSV format instead.');
    };
    
    document.body.appendChild(jsPDFScript);
  }
  
  // Helper method to calculate average price
  private calculateAveragePrice(): string {
    if (!this.filteredReportList.length) return '0.00';
    
    const total = this.filteredReportList.reduce((sum, item) => {
      return sum + parseFloat(item.price || '0');
    }, 0);
    
    return (total / this.filteredReportList.length).toFixed(2);
  }

  // Helper method to calculate price difference from average
  private calculatePriceDifference(): string {
    const hostInfo = this.reports[0] || {};
    const hostPrice = parseFloat(hostInfo.price || hostInfo.menu_item_current_price || '0');
    const avgPrice = parseFloat(this.calculateAveragePrice());
    
    return (hostPrice - avgPrice).toFixed(2);
  }

  groupRestaurantData(): void {
    const restaurantMap = new Map<string, any[]>();
    
    // Group items by restaurant name
    this.filteredReportList.forEach(item => {
      const restaurantName = item.restaurant_name || 'Unknown Restaurant';
      if (!restaurantMap.has(restaurantName)) {
        restaurantMap.set(restaurantName, []);
      }
      restaurantMap.get(restaurantName)!.push(item);
    });
    
    // Convert to GroupedRestaurant array
    this.groupedRestaurants = Array.from(restaurantMap.entries()).map(([restaurantName, menuItems]) => {
      const prices = menuItems.map(item => parseFloat(item.price || '0')).filter(price => !isNaN(price));
      const distances = menuItems.map(item => parseFloat(item.distance_from_zipcode || '0')).filter(distance => !isNaN(distance));
      
      return {
        restaurantName,
        menuItems,
        isExpanded: false,
        totalItems: menuItems.length,
        averagePrice: prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0,
        minPrice: prices.length ? Math.min(...prices) : 0,
        maxPrice: prices.length ? Math.max(...prices) : 0,
        averageDistance: distances.length ? distances.reduce((sum, distance) => sum + distance, 0) / distances.length : 0
      };
    });
    
    // Sort by restaurant name
    this.groupedRestaurants.sort((a, b) => a.restaurantName.localeCompare(b.restaurantName));
  }
  
  getUniqueRestaurantNames(): void {
    const restaurantNames = new Set<string>();
    this.originalResults.forEach(item => {
      if (item.restaurant_name) {
        restaurantNames.add(item.restaurant_name);
      }
    });
    this.availableRestaurantNames = Array.from(restaurantNames).sort();
    this.filteredRestaurantNames = [...this.availableRestaurantNames];
  }
  
  toggleRestaurantExpansion(index: number): void {
    this.groupedRestaurants[index].isExpanded = !this.groupedRestaurants[index].isExpanded;
  }
  
  // Add new method for sorting grouped restaurants
  applySortToGroupedRestaurants(): void {
    // Sort restaurants by name
    this.groupedRestaurants.sort((a, b) => a.restaurantName.localeCompare(b.restaurantName));
    
    // Sort menu items within each restaurant
    this.groupedRestaurants.forEach(restaurant => {
      restaurant.menuItems.sort((a, b) => {
        const field = this.reportSortConfig.field;
        const direction = this.reportSortConfig.direction;
        
        let valueA: any, valueB: any;
        
        switch (field) {
          case 'price':
            valueA = parseFloat(a.price || '0');
            valueB = parseFloat(b.price || '0');
            break;
          case 'distance_from_zipcode':
            valueA = parseFloat(a.distance_from_zipcode || '0');
            valueB = parseFloat(b.distance_from_zipcode || '0');
            break;
          case 'restaurant_name':
            valueA = (a.restaurant_name || '').toLowerCase();
            valueB = (b.restaurant_name || '').toLowerCase();
            break;
          default:
            valueA = (a[field] || '').toString().toLowerCase();
            valueB = (b[field] || '').toString().toLowerCase();
        }
        
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return direction === 'asc' ? valueA - valueB : valueB - valueA;
        } else {
          const comparison = String(valueA).localeCompare(String(valueB));
          return direction === 'asc' ? comparison : -comparison;
        }
      });
    });
  }
  
  toggleRestaurantFilter(): void {
    this.showRestaurantFilter = !this.showRestaurantFilter;
    if (this.showRestaurantFilter) {
    
      // Initialize filtered list when opening
      this.filteredRestaurantNames = this.compstoreRestaurants;
      this.restaurantSearchQuery = '';
    }
  }
  
  onRestaurantFilterChange(): void {
    this.filterReportResults();
  }
  
  isRestaurantSelected(restaurantName: string): boolean {
    return this.selectedRestaurantNames.includes(restaurantName);
  }
  
  toggleRestaurantSelection(restaurantName: string): void {
    const index = this.selectedRestaurantNames.indexOf(restaurantName);
    if (index > -1) {
      this.selectedRestaurantNames.splice(index, 1);
    } else {
      this.selectedRestaurantNames.push(restaurantName);
    }
    // this.onRestaurantFilterChange();
  }
  
  clearRestaurantFilter(): void {
    this.selectedRestaurantNames = [];
    this.restaurantSearchQuery = ''; // Clear search when clearing filter
    this.filteredRestaurantNames = [...this.availableRestaurantNames];
    this.fetchReportss();    
  }
  
  getRestaurantFilterLabel(): string {
    if (this.selectedRestaurantNames.length === 0) {
      return 'All Restaurants';
    } else if (this.selectedRestaurantNames.length === 1) {
      return this.selectedRestaurantNames[0];
    } else {
      return `${this.selectedRestaurantNames.length} Selected`;
    }
  }
  
  // Close restaurant filter dropdown
  closeRestaurantFilter(): void {
    this.showRestaurantFilter = false;
  }
  
  // Handle restaurant search filtering
 onRestaurantSearchChange(): void {
  const query = this.restaurantSearchQuery.trim().toLowerCase();

  if (query === '') {
    this.filteredRestaurantNames = [...this.compstoreRestaurants];
  } else {
    this.filteredRestaurantNames = this.compstoreRestaurants.filter(name =>
      name.toLowerCase().includes(query)
    );
  }
}




  // Apply restaurant filter and close dropdown
  applyRestaurantFilter(): void {
    this.showRestaurantFilter = !this.showRestaurantFilter;
    this.fetchReportss();
  }


  
  // Add this HostListener to detect clicks outside the dropdown
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const restaurantFilterButton = this.elementRef.nativeElement.querySelector('.restaurant-filter-button');
    const restaurantFilterDropdown = this.elementRef.nativeElement.querySelector('.restaurant-filter-dropdown');

    const reportSortButton = this.elementRef.nativeElement.querySelector('.price-sort');
    const reportSortDropdown = this.elementRef.nativeElement.querySelector('.price-sort');
    
    // Check if the click is outside both the button and dropdown
    if (this.showRestaurantFilter && 
        restaurantFilterButton && 
        restaurantFilterDropdown && 
        !restaurantFilterButton.contains(target) && 
        !restaurantFilterDropdown.contains(target)) {
      this.showRestaurantFilter = false;
    }

    if(this.showReportSortMenu && reportSortButton && reportSortDropdown && !reportSortButton.contains(target) && !reportSortDropdown.contains(target)) {
      this.showReportSortMenu = false;
    }

  }
  
  formatRestaurantType(type: string): string {
    if (!type) return 'N/A';
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }

  // Helper method to create price analysis data
  private createPriceAnalysisData(hostInfo: any): any[][] {
    // Sort competitors by price
    const sortedByPrice = [...this.filteredReportList].sort((a, b) => {
      return parseFloat(a.price || '0') - parseFloat(b.price || '0');
    });
    
    // Get price statistics
    const hostPrice = parseFloat(hostInfo.price || hostInfo.menu_item_current_price || '0');
    const lowestPrice = parseFloat(sortedByPrice[0]?.price || '0');
    const highestPrice = parseFloat(sortedByPrice[sortedByPrice.length - 1]?.price || '0');
    const avgPrice = parseFloat(this.calculateAveragePrice());
    
    // Calculate percentile ranks
    const priceRank = sortedByPrice.findIndex(item => parseFloat(item.price || '0') >= hostPrice);
    const percentileRank = (priceRank / sortedByPrice.length) * 100;
    
    // Create data array
    return [
      ['Price Analysis'],
      ['Metric', 'Value', 'Comparison'],
      ['Host Price', `$${hostPrice.toFixed(2)}`, ''],
      ['Lowest Competitor Price', `$${lowestPrice.toFixed(2)}`, `${((hostPrice - lowestPrice) / lowestPrice * 100).toFixed(1)}% ${hostPrice > lowestPrice ? 'higher' : 'lower'}`],
      ['Highest Competitor Price', `$${highestPrice.toFixed(2)}`, `${((hostPrice - highestPrice) / highestPrice * 100).toFixed(1)}% ${hostPrice > highestPrice ? 'higher' : 'lower'}`],
      ['Average Competitor Price', `$${avgPrice.toFixed(2)}`, `${((hostPrice - avgPrice) / avgPrice * 100).toFixed(1)}% ${hostPrice > avgPrice ? 'higher' : 'lower'}`],
      ['Price Percentile', `${percentileRank.toFixed(1)}%`, `Your price is higher than ${percentileRank.toFixed(1)}% of competitors`],
      ['', '', ''],
      ['Top 5 Lowest Priced Competitors', '', ''],
      ['Restaurant Name', 'Price', 'Distance (miles)'],
      ...sortedByPrice.slice(0, 5).map(item => [
        item.restaurant_name || '',
        `$${parseFloat(item.price || '0').toFixed(2)}`,
        item.distance_from_zipcode || ''
      ]),
      ['', '', ''],
      ['Top 5 Highest Priced Competitors', '', ''],
      ['Restaurant Name', 'Price', 'Distance (miles)'],
      ...sortedByPrice.slice(-5).reverse().map(item => [
        item.restaurant_name || '',
        `$${parseFloat(item.price || '0').toFixed(2)}`,
        item.distance_from_zipcode || ''
      ])
    ];
  }


  get fromRecord() {
    return this.totalMenuItems ? (this.currentMenuPage - 1) * this.rowsPerPage + 1 : 0;
  }

  get toRecord() {
    const to = this.currentMenuPage * this.rowsPerPage;
    return to > this.totalMenuItems ? this.totalMenuItems : to;
  }

  toggleRowsPerPageMenu() {
  this.showRowsPerPageMenu = !this.showRowsPerPageMenu;
}

  onMonthChange(selectedMonth: string): void {
    this.selectedMonth = selectedMonth;
    this.currentMenuPage = 1;
    this.fetchReportss();
  }


 downloadReport(type: string) {
  const compStoreRestaurants = this.selectedRestaurantNames.map(name => ({
    restaurant_name: name
  }));

  const payload = {
    month: this.selectedMonth,
    user_location_id: this.selectedMenuItemData.user_location_id,
    menu_item_name_id: this.selectedMenuItemData.id,
    filter_by: this.searchTermComp ?? null,
    comp_store_restaurants: compStoreRestaurants ?? null,
    sort_by: this.sortValue ?? null,
    file_type: type
  };

  this.reportsApiService.downloadReport(payload).subscribe((response: Blob) => {

    const fileExtension = type === 'excel' ? 'xlsx' :type;
    const fileName = `report.${fileExtension}`;

    const url = window.URL.createObjectURL(response);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();

    window.URL.revokeObjectURL(url);
  });
}

getTotalReportPages(): number {
  return Math.ceil(this.totalMenuItemsComp / this.rowsPerPageComp);
}

changeReportPage(page: number): void {
  console.log("vijay page",page);
  const totalPages = this.getTotalReportPages();

  if (page < 1 || page > totalPages) return;

  // Update current page
  this.currentMenuPageComp = page;

  // Fetch new page data
  this.fetchReportss();

  // Reset expanded rows & restaurant states AFTER list updates
  setTimeout(() => {
    this.expandedReportRows = new Array(this.pagedReportList.length).fill(false);
    this.areAllReportRowsExpanded = false;

    this.groupedRestaurants.forEach(r => {
      r.isExpanded = false;
    });

    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }, 0);
}


getReportPageNumbers(): number[] {
  const totalPages = this.getTotalReportPages();
  const windowSize = 5;

  // Find the window start (0, 5, 10, 15...)
  const windowStart = Math.floor((this.currentMenuPageComp - 1) / windowSize) * windowSize;

  const pages = [];
  
  for (let i = 1; i <= windowSize; i++) {
    const page = windowStart + i;

    if (page > totalPages) break;
    pages.push(page);
  }

  return pages;
}

getMenuPageNumbers() {
  const total = this.totalMenuPages;
  const current = this.currentMenuPage;
  const max = 5;

  let start = Math.max(1, current - Math.floor(max / 2));
  let end = start + max - 1;

  if (end > total) {
    end = total;
    start = Math.max(1, end - max + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}




  // Initialize report view when showing report details
  
  }
import { AppEnv } from '../../config/env';