import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserLocation {
  user_location_id: number;
  latitude: string;
  longitude: string;
  location: string;
  zip_or_postal_code: string;
  restaurant_name: string;
  city: string;
  state: string;
  distance_from_zip_code: string;
  is_active: boolean;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  expiry_status: boolean;
}

export interface UserProfileDetails {
  user_id: number;
  name: string;
  email: string;
  free_tier_user: boolean;
  user_locations: UserLocation[];
}

export interface AddLocationRequest {
  zip_or_postal_code: string;
  latitude: string;
  longitude: string;
  location: string;
  restaurant_name: string;
  city: string;
  state: string;
  distance_from_zip_code: string;
}

export interface AddUserLocationsRequest {
  user_id: number;
  locations: AddLocationRequest[];
}

export interface AddUserLocationsResponse {
  message: string;
  user_id: number;
  saved_locations_count: number;
}

export interface UpdateLocationStatusRequest {
  user_id: number;
  location_id: number;
  status: boolean;
}

export interface UpdateLocationStatusResponse {
  user_id: number;
  location_id: number;
  status: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private baseUrl = AppEnv.API_BASE_URL;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer dapif4fb3a4ddc6bc98fe20910fb3ba74c03-3'
    });
  }

  /**
   * Get User Profile Details
   * GET /profile/profile-details/{user_id}
   */
  getUserProfileDetails(userId: number): Observable<UserProfileDetails> {
    return this.http.get<UserProfileDetails>(
      `${this.baseUrl}/profile/profile-details/${userId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Add User Locations
   * POST /profile/add-user-locations
   */
  addUserLocations(request: AddUserLocationsRequest): Observable<AddUserLocationsResponse> {
    return this.http.post<AddUserLocationsResponse>(
      `${this.baseUrl}/profile/add-user-locations`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Update Location Status
   * POST /profile/update-location-status
   */
  updateLocationStatus(request: UpdateLocationStatusRequest): Observable<UpdateLocationStatusResponse> {
    return this.http.post<UpdateLocationStatusResponse>(
      `${this.baseUrl}/profile/update-location-status`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }
}
import { AppEnv } from '../config/env';