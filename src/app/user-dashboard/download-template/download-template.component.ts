import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-download-template',
  standalone: true,
  imports: [CommonModule], // Only import CommonModule here
  templateUrl: './download-template.component.html',
  styleUrls: ['./download-template.component.css'],
})
export class DownloadTemplateComponent {
  private apiUrl = `${AppEnv.API_BASE_URL}/download-template`;
  private apiKey = 'dapif4fb3a4ddc6bc98fe20910fb3ba74c03-3';
  private email = 'sunil.sabado@gmail.com';

  isLoading = false;
  errorMessage: string | null = null;

constructor(private http : HttpClient,@Inject(Location)private locations :Location,private router: Router){}

  // Method to get authorization headers
  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    });
  }

  // Method to go back to the previous page
  goBack(): void {
    this.locations.back();
  }

  downloadTemplate() {
    this.isLoading = true;
    this.errorMessage = null;

    const headers = this.getAuthHeaders();
    const requestBody = {
      email: this.email
    };

    this.http.post(this.apiUrl, requestBody, { headers, responseType: 'blob' }).subscribe({
      next: (response) => {
        this.handleFileDownload(response);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to download the template. Please try again.';
        console.error('Error downloading template:', error);
        this.isLoading = false;
      },
    });
  }

  private handleFileDownload(blob: Blob) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Restaurant Upload.xlsx'; // Your desired filename with spaces
    a.click();
    window.URL.revokeObjectURL(url); // Clean up after download
  }
  
  onSubmit(): void {
    this.router.navigate(['/bulk-upload']);
  }
}
import { AppEnv } from '../../config/env';