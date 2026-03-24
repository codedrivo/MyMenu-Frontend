import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppEnv } from './config/env';

@Injectable({
  providedIn: 'root',
})
export class RegisterService {

  private readonly backendBase = AppEnv.API_BASE_URL;

  private apiUrl =`${this.backendBase}/register-user`;
  private apiKey = 'dapif4fb3a4ddc6bc98fe20910fb3ba74c03-3';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    });
  }

  registerUser(email: string): Observable<any> {
    const body = { email };

    return this.http.post(
      this.apiUrl,
      body,
      { headers: this.getAuthHeaders() }
    );
  }
}
