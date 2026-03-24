import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import * as XLSX from 'xlsx';
import { CommonModule } from '@angular/common';
import { ReportPreloaderService } from '../../services/report-preloader.service';

@Component({
  selector: 'app-bulk-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bulk-upload.component.html',
  styleUrls: ['./bulk-upload.component.css']
})
export class BulkUploadComponent implements OnInit {
  @ViewChild('fileInput') fileInput: ElementRef | undefined;
  uploadForm: FormGroup;
  uploadedFiles: Array<{ fileName: string; uploadedAt: string; downloadUrl: string }> = [];
  selectedFiles: File[] = [];
  restaurantName: string = '';

  private readonly maxFileSize = 5 * 1024 * 1024;
  private readonly validFileTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  private readonly uploadApiUrl = `${AppEnv.API_BASE_URL}/bulk-upload`;
  private readonly templateApiUrl = `${AppEnv.API_BASE_URL}/download-template`;
  private readonly apiKey = 'dapif4fb3a4ddc6bc98fe20910fb3ba74c03-3';

  private restaurantNameSubject = new BehaviorSubject<string>('');
  restaurantName$ = this.restaurantNameSubject.asObservable();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private reportPreloader: ReportPreloaderService
  ) {
    this.uploadForm = this.fb.group({
      files: [null]
    });
  }

  // Method to get authorization headers
  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.apiKey}`
    });
  }

  ngOnInit(): void {}

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
      }
    });
  }

  uploadFiles(): void {
    if (this.selectedFiles.length === 0) {
      alert('Please select valid files before uploading.');
      return;
    }

    const formData = new FormData();
    this.selectedFiles.forEach(file => {
      formData.append('file', file, 'Restaurant Upload.xlsx');
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

  goBack(): void {
    this.router.navigate(['/user-dashboard']);
  }

  onSubmit(): void {
    this.router.navigate(['/tabledemo']);
  }
}
import { AppEnv } from '../../config/env';
