import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, OnInit, ViewChild, ElementRef, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import * as XLSX from 'xlsx';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { IdleTimerService } from '../services/idle-timer.service';
import { ReportPreloaderService } from '../services/report-preloader.service';
import { ReportsapiserviceService } from '../ReportsApiService/reportsapiservice.service';
@Component({
  selector: 'app-bulk-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,FormsModule],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css']
})
export class UserDashboardComponent implements OnInit {
  @ViewChild('fileInput') fileInput: ElementRef | undefined;
  uploadForm: FormGroup;
  uploadedFiles: Array<{ fileName: string; uploadedAt: string; downloadUrl: string }> = [];
  selectedFiles: File[] = [];
  restaurantName: string = '';
  userEmail: string | null = null;
  error: string | null = null;
  showLogoutConfirmation: boolean = false; // Add this property
  isMobileMenuOpen: boolean = false; // Mobile menu state

  private readonly maxFileSize = 5 * 1024 * 1024;
  private readonly validFileTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  private readonly uploadApiUrl = `${AppEnv.API_BASE_URL}/bulk-upload/v2`;
  private readonly templateApiUrl = `${AppEnv.API_BASE_URL}/download-template`;
  private readonly locationApiUrl = `${AppEnv.API_BASE_URL}/user-locations`;
  private readonly apiKey = 'dapif4fb3a4ddc6bc98fe20910fb3ba74c03-3';

  private restaurantNameSubject = new BehaviorSubject<string>('');
  restaurantName$ = this.restaurantNameSubject.asObservable();

  userLocationData : any;
  localStorageData: any;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private idleTimerService: IdleTimerService,
    private reportPreloader: ReportPreloaderService,
    private reportsApiService: ReportsapiserviceService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.uploadForm = this.fb.group({
      files: [null],
      location:[null, Validators.required]
    });
  }

  // Method to get authorization headers
  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.apiKey}`
    });
  }

  ngOnInit(): void {
    const storedData = localStorage.getItem('userData');
    if (storedData) {
      this.localStorageData = JSON.parse(storedData);
    }

    this.getRestaurantData();

    if (isPlatformBrowser(this.platformId)) {
      this.userEmail = localStorage.getItem('userEmail'); // Retrieve email from localStorage
    } else {
      this.userEmail = null;
    }
    // console.log('Retrieved email from localStorage in dashboard:', this.userEmail); // Debugging line
    
    // Ensure idle timer is running for dashboard
    if (this.authService.isLoggedIn() && !this.idleTimerService.isWatching()) {
      this.idleTimerService.startWatching();
    }

    // Trigger report preloading if user email is available and data is not fresh
    if (this.userEmail) {
      const preloadedData = this.reportPreloader.getPreloadedData();
      if (!this.reportPreloader.isDataFresh() || !preloadedData?.isLoaded) {
        this.reportPreloader.preloadReports(this.userEmail);
      }
    }

    // Close mobile menu on window resize to larger screens (browser only)
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) { // lg breakpoint
          this.isMobileMenuOpen = false;
        }
      });
    }
  }

//Get Location and restaurant data

getRestaurantData()
{
  const userId = this.localStorageData.id;
  this.reportsApiService.fetchRestaurantsData(userId).subscribe({
    next: (response) => {
      this.userLocationData = response;
      localStorage.setItem('userLocationData', JSON.stringify(this.userLocationData));
    },
    error: (error) => {
      console.error('Error fetching user location data:', error);
    }
  }
  ); 
}

  // Add this method to your UserDashboardComponent class

toggleGroup(groupId: string): void {
  const content = document.getElementById(`content-${groupId}`);
  const chevron = document.getElementById(`chevron-${groupId}`);
  
  if (!content || !chevron) return;
  
  // Close all other groups
  const allContents = document.querySelectorAll('.group-content');
  const allChevrons = document.querySelectorAll('.fas.fa-chevron-right');
  
  allContents.forEach((item) => {
    if (item.id !== `content-${groupId}`) {
      (item as HTMLElement).style.maxHeight = '0px';
    }
  });
  
  allChevrons.forEach((item) => {
    if (item.id !== `chevron-${groupId}`) {
      (item as HTMLElement).style.transform = 'rotate(0deg)';
    }
  });
  
  // Toggle current group
  const contentElement = content as HTMLElement;
  if (contentElement.style.maxHeight === '0px' || !contentElement.style.maxHeight) {
    contentElement.style.maxHeight = contentElement.scrollHeight + 'px';
    (chevron as HTMLElement).style.transform = 'rotate(90deg)';
  } else {
    contentElement.style.maxHeight = '0px';
    (chevron as HTMLElement).style.transform = 'rotate(0deg)';
  }
}
  

  onFilesSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;

    if (files) {
      const validFiles = Array.from(files).filter(
        file => this.validFileTypes.includes(file.type) && file.size <= this.maxFileSize
      );

      const invalidFiles = Array.from(files).filter(
        file => !this.validFileTypes.includes(file.type) || file.size > this.maxFileSize
      );

      if (invalidFiles.length > 0) {
        alert('Please select valid Excel files (.xlsx or .xls) under 5MB.');
        this.resetFileInput();
      } else {
        this.selectedFiles = validFiles;
        this.extractRestaurantName(validFiles[0]);
      }
    }
  }

  extractRestaurantName(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const restaurantNameCell = worksheet['A1'];
      if (restaurantNameCell) {
        this.restaurantName = restaurantNameCell.v;
        this.restaurantNameSubject.next(this.restaurantName);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  resetFileInput(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.selectedFiles = [];
    this.restaurantName = '';
    this.restaurantNameSubject.next('');
  }

  downloadTemplate(): void {
    const email = localStorage.getItem('userEmail');
    if (!email) {
      alert('User email is not available. Please log in again.');
      this.router.navigate(['/login']);
      return;
    }

    const headers = this.getAuthHeaders().set('Content-Type', 'application/json');
    const requestBody = {
      email: email
    };

    this.http.post(this.templateApiUrl, requestBody, { headers, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = 'Restaurant Upload.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      },
      error: (err) => {
        console.error('Error downloading the template:', err);
        alert('Failed to download the template. Please try again later.');
      },
    });
  }

  uploadFiles(): void {
    if(this.uploadForm.invalid || this.selectedFiles.length === 0) {
      this.uploadForm.markAllAsTouched();
      if(this.selectedFiles.length === 0) {
       this.errorMessage = 'Please select a file.'
      }
      return;

    }

    
    const formData = new FormData();
    this.selectedFiles.forEach(file => {
      formData.append('file', file, 'Restaurant Upload.xlsx');
      formData.append('user_location_id', this.uploadForm.value.location);
    });

    const email = localStorage.getItem('userEmail');
    if (!email) {
      alert('User email is not available. Please log in again.');
      this.router.navigate(['/login']);
      return;
    }

    // Add email to FormData for v4 API
    formData.append('email', email);

    const headers = this.getAuthHeaders();
    // Note: Don't set Content-Type for FormData, let the browser set it with boundary

    this.http.post<{ fileName: string; uploadedAt: string; downloadUrl: string }[]>(this.uploadApiUrl, formData, { headers }).subscribe({
      next: response => {
        alert('Files uploaded successfully!');
        localStorage.setItem('restaurantName', this.restaurantName);
        this.uploadedFiles = response;
        
        // Trigger report preloading in the background
        this.reportPreloader.onDataUploaded(email);
        
        this.router.navigate(['/tabledemo']);
      },
      error: error => {
        console.error('Upload failed:', error);
        if (error.error && error.error.detail) {
          alert(`Upload failed: ${error.error.detail}`);
        } else {
          alert('File upload failed. Please try again.');
        }
        this.resetFileInput();
      }
    });
  }

  

  logout(): void {
    // Show logout confirmation instead of directly logging out
    this.showLogoutConfirmation = true;
  }

  confirmLogout(): void {
    this.idleTimerService.stopWatching();
    this.authService.logout();
    this.showLogoutConfirmation = false;
    this.router.navigate(['/login']);
  }

  cancelLogout(): void {
    this.showLogoutConfirmation = false;
  }
  goBack(): void {
    this.router.navigate(['/user-dashboard']);
  }

  onSubmit(): void {
    this.router.navigate(['/tabledemo']);
  }

  // Mobile menu methods
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

}




import { AppEnv } from '../config/env';





