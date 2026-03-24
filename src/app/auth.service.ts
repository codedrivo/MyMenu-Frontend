// auth.service.ts
import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { RoleService } from './role.service';
import { isPlatformBrowser } from '@angular/common';
// Remove this import to break circular dependency
// import { IdleTimerService } from './services/idle-timer.service';

interface BlogLoginResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: {
      id: number;
      email: string;
      name: string;
    };
  };
}

// New API contract types
export interface CreateUserRequest {
  email: string;
  user_name: string;
  password: string;
  locations: Array<{
    zip_or_postal_code: string;
    latitude: string;
    longitude: string;
    location: string;
    restaurant_name?: string;
    city?: string;
    state?: string;
    distance_from_zip_code?: string;
  }>;
}

// OTP-related request/response types
export interface OTPRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  input_otp: string;
}

export interface SimpleMessageResponse {
  message: string;
}

export interface EmailPasswordLoginRequest {
  email: string;
  password: string;
}

export interface EmailPasswordLoginResponse {
  message: string;
  email: string;
  session_id: string;
  expires_at: string;
  user_id: number;
  user_name: string;
}

export interface CreateUserResponse {
  user_id: number;
  email: string;
  user_name: string;
  free_tier_user: boolean;
  search_count: number;
  search_count_exceeded: boolean;
}

export interface UserLocationsResponse {
  user_id: number;
  email: string;
  locations: Array<{
    user_location_id: number;
    latitude: string;
    longitude: string;
    location: string;
    zip_or_postal_code: string;
    restaurant_name?: string;
    city?: string;
    state?: string;
    distance_from_zip_code?: string;
    expiry_status: boolean;
  }>;
  search_count: number;
  free_tier_user: boolean;
}

// New interfaces for anonymous token flow
export interface AnonymousTokenResponse {
  message: string;
  token: string;
}

export interface RegisterUUIDTrackingRequest {
  uuid: string;
  latitude: string;
  longitude: string;
  location: string;
  zip_or_postal_code: string;
  restaurant_name?: string;
  city?: string;
  state?: string;
  distance_from_zip_code?: string;
  search_count: number;
}

export interface RegisterUUIDTrackingResponse {
  message: string;
  data: {
    tracking_id: number;
    uuid: string;
    search_count: number;
    created_at: string;
  };
}

export interface UUIDSearchCountResponse {
  location: string;
  tracking_id: number;
  uuid: string;
  latitude: string;
  restaurant_name?: string;
  state?: string;
  search_count: number;
  updated_at: string;
  longitude: string;
  zip_or_postal_code: string;
  city?: string;
  distance_from_zip_code?: string;
  created_at: string;
}

// New interfaces for location status management
export interface UpdateLocationStatusRequest {
  user_location_id: number;
  is_active: boolean;
}

export interface UpdateLocationStatusResponse {
  message: string;
  user_location_id: number;
  is_active: boolean;
}

export interface UserProfileDetails {
  user_id: number;
  name: string;
  email: string;
  free_tier_user: boolean;
  user_locations: Array<{
    user_location_id: number;
    latitude: string;
    longitude: string;
    location: string;
    zip_or_postal_code: string;
    restaurant_name?: string;
    city?: string;
    state?: string;
    distance_from_zip_code?: string;
    expiry_status: boolean;
    is_active: boolean;
    subscription_start_date?: string | null;
    subscription_end_date?: string | null;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly BLOG_API_URL = `${AppEnv.API_BASE_URL}/api/bloglogin`;
  private isBrowser: boolean;
  
  // Define admin email addresses
  private adminEmails = [
    'admin@mymenu.ai',
    'editor@mymenu.ai',
    'sunilreddyvk17@gmail.com',
    'blog@mymenu.ai',
    'admin@example.com' // Added for your test API
  ];

  constructor(
    private http: HttpClient,
    private roleService: RoleService,
    @Inject(PLATFORM_ID) private platformId: Object
    // Remove IdleTimerService injection
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  private checkAuthStatus(): void {
    const email = this.getUserEmail();
    // You can add additional checks here if needed
  }

  // New method for blog login with password using external API
  loginWithPassword(email: string, password: string): Observable<BlogLoginResponse> {
    return this.http.post<BlogLoginResponse>(this.BLOG_API_URL, {
      email,
      password
    }).pipe(
      tap(response => {
        if (response.success && response.data && this.isBrowser) {
          this.storeUserEmail(response.data.user.email);
          this.storeAuthToken(response.data.token);
          this.storeUserData(response.data.user);
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return of({
          success: false,
          message: error.error?.message || 'Login failed'
        });
      })
    );
  }

  // Store authentication token
  storeAuthToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem('blogAuthToken', token);
    }
  }

  // Get authentication token
  getAuthToken(): string | null {
    return this.isBrowser ? localStorage.getItem('blogAuthToken') : null;
  }

  // Store user data
  storeUserData(user: { id: number; email: string; name: string }): void {
    if (this.isBrowser) {
      localStorage.setItem('userData', JSON.stringify(user));
    }
  }

  // Get user data
  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('blog_token') : null;
  }

  getUserData(): any {
    if (!this.isBrowser) return null;
    const userData = localStorage.getItem('blog_user_data');
    return userData ? JSON.parse(userData) : null;
  }

  // Clear all authentication data
  clearAuthData(): void {
    if (this.isBrowser) {
      try {
        localStorage.removeItem('userEmail');
        localStorage.removeItem('blogAuthToken');
        localStorage.removeItem('userData');
        // Clear any legacy or auxiliary keys
        localStorage.removeItem('blog_token');
        localStorage.removeItem('blog_user_data');
        localStorage.removeItem('oauth_return_url');
        localStorage.removeItem('userLocationData');
      } catch {}
    }
  }

  // Existing methods
  login(email: string): Observable<any> {
    return this.roleService.getlogin(email).pipe(
      tap(() => {
        if (this.isBrowser) {
          this.storeUserEmail(email);
        }
      })
    );
  }

  // New email and password login method
  loginWithEmailPassword(payload: EmailPasswordLoginRequest): Observable<EmailPasswordLoginResponse> {
    // console.log('Attempting login with payload:', payload);
    // console.log(`Making request to: ${AppEnv.API_BASE_URL}/login/email`);
    
    return this.http.post<EmailPasswordLoginResponse>(
    `${AppEnv.API_BASE_URL}/login/email`,
      payload,
      { 
        withCredentials: false, // Try without credentials first to avoid CORS issues
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    ).pipe(
      tap((response: EmailPasswordLoginResponse) => {
        // console.log('✅ Login successful! Response received:', response);
        if (response && response.email && response.session_id) {
          this.storeUserEmail(response.email);
          // Store session information if needed
          if (this.isBrowser) {
            localStorage.setItem('session_id', response.session_id);
            localStorage.setItem('user_id', response.user_id.toString());
            localStorage.setItem('user_name', response.user_name);
            localStorage.setItem('session_expires_at', response.expires_at);
            
            // Verify data was stored
            // console.log('🔍 Stored session data verification:', {
            //   session_id: localStorage.getItem('session_id'),
            //   user_id: localStorage.getItem('user_id'),
            //   user_name: localStorage.getItem('user_name'),
            //   session_expires_at: localStorage.getItem('session_expires_at'),
            //   user_email: localStorage.getItem('userEmail')
            // });
            
            // Test isLoggedIn immediately after storing
            // console.log('🔍 isLoggedIn check immediately after storing:', this.isLoggedIn());
          }
          // console.log('✅ User data stored successfully');
        }
      }),
      catchError((error) => {
        console.error('❌ Email/Password login error:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error body:', error.error);
        console.error('❌ Full error object:', JSON.stringify(error, null, 2));
        
        // If it's a CORS error, try to provide a more helpful message
        if (error.status === 0) {
          console.error('❌ This appears to be a CORS error. The backend server may not be configured to allow requests from this origin.');
        }
        
        throw error;
      })
    );
  }

  // Fetch all registered user emails (v2)
  fetchRegisteredUserEmailsV2(): Observable<string[]> {
    return this.http.get<string[]>(`${AppEnv.API_BASE_URL}/registered-user-emails/v2`).pipe(
      catchError((err) => {
        console.error('Error fetching registered user emails:', err);
        return of([]);
      })
    );
  }

  // Send Registration OTP (v2)
  sendRegisterOtpV2(email: string): Observable<SimpleMessageResponse> {
    const payload: OTPRequest = { email };
    return this.http.post<SimpleMessageResponse>(`${AppEnv.API_BASE_URL}/send-register-otp/v2`, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      catchError((err) => {
        console.error('Error sending registration OTP:', err);
        return throwError(() => err);
      })
    );
  }

  // Send Login OTP (v2)
  sendLoginOtpV2(email: string): Observable<SimpleMessageResponse> {
    const payload: OTPRequest = { email };
    return this.http.post<SimpleMessageResponse>(`${AppEnv.API_BASE_URL}/send-login-otp/v2`, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      catchError((err) => {
        console.error('Error sending login OTP:', err);
        return throwError(() => err);
      })
    );
  }

  // Verify Code (v2) - is_login true for login, false for registration
  verifyOtpV2(email: string, input_otp: string, isLogin: boolean): Observable<SimpleMessageResponse> {
    const payload: VerifyOtpRequest = { email, input_otp };
    const url = `${AppEnv.API_BASE_URL}/verify-otp/v2?is_login=${isLogin ? 'true' : 'false'}`;
    return this.http.post<SimpleMessageResponse>(url, payload, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      withCredentials: false
    }).pipe(
      tap((resp) => {
        // Persist email so the app treats user as logged in after code login
        if (isLogin && this.isBrowser) {
          this.storeUserEmail(email);
        }
      }),
      catchError((err) => {
        console.error('Error verifying code:', err);
        return throwError(() => err);
      })
    );
  }

  storeUserEmail(email: string): void {
    if (this.isBrowser) {
      localStorage.setItem('userEmail', email);
      // console.log('Email stored in localStorage:', email);
    }
  }
  
  getUserEmail(): string | null {
    if (!this.isBrowser) return null;
    const email = localStorage.getItem('userEmail');
    // console.log('Retrieved email from localStorage:', email);
    return email;
  }

  clearUserEmail(): void {
    if (this.isBrowser) {
      localStorage.removeItem('userEmail');
    }
  }

  // Session management methods for email/password authentication
  getSessionId(): string | null {
    return this.isBrowser ? localStorage.getItem('session_id') : null;
  }

  getUserId(): number | null {
    if (this.isBrowser) {
      const userId = localStorage.getItem('user_id');
      return userId ? parseInt(userId, 10) : null;
    }
    return null;
  }

  getUserName(): string | null {
    return this.isBrowser ? localStorage.getItem('user_name') : null;
  }

  getSessionExpiresAt(): string | null {
    return this.isBrowser ? localStorage.getItem('session_expires_at') : null;
  }

  isSessionValid(): boolean {
    if (!this.isBrowser) return false;
    
    const sessionId = this.getSessionId();
    const expiresAt = this.getSessionExpiresAt();
    
    // console.log('🔍 Session validation debug:', {
    //   sessionId,
    //   expiresAt,
    //   hasSessionId: !!sessionId,
    //   hasExpiresAt: !!expiresAt
    // });
    
    if (!sessionId || !expiresAt) return false;
    
    // Simple fix: Just treat the server timestamp as UTC and add it directly
    // The server sends "2025-10-30T14:42:19.300838" which should be treated as UTC
    const expirationDate = new Date(expiresAt + 'Z'); // Force UTC interpretation
    const now = new Date();
    
    // Add a 5-minute buffer to account for any minor time sync issues
    const bufferMinutes = 5;
    const expirationWithBuffer = new Date(expirationDate.getTime() + (bufferMinutes * 60 * 1000));
    
    const timeDiffMinutes = (expirationDate.getTime() - now.getTime()) / (1000 * 60);
    const isValidWithBuffer = now < expirationWithBuffer;
    const isValidOriginal = now < expirationDate;
    
    // console.log('🔍 Date comparison debug (SIMPLE FIX):', {
    //    expiresAt,
    //    expirationDate: expirationDate.toISOString(),
    //    expirationDateLocal: expirationDate.toString(),
    //    expirationWithBuffer: expirationWithBuffer.toISOString(),
    //    now: now.toISOString(),
    //    nowLocal: now.toString(),
    //    isValidOriginal,
    //    isValidWithBuffer,
    //    timeDiffMinutes,
    //    bufferMinutes,
    //    expirationDateValid: !isNaN(expirationDate.getTime())
    //  });
    
    // Use the buffered validation to be more lenient
    return isValidWithBuffer;
  }

  clearSessionData(): void {
    if (this.isBrowser) {
      localStorage.removeItem('session_id');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_name');
      localStorage.removeItem('session_expires_at');
    }
  }

  // Updated authentication methods
  isLoggedIn(): boolean {
    // Check for OAuth-based authentication
    const userEmail = this.getUserEmail();
    const authToken = this.getAuthToken();
    const hasOAuthAuth = !!userEmail && !!authToken;
    
    // Check for session-based authentication
    const sessionId = this.getSessionId();
    const expiresAt = this.getSessionExpiresAt();
    const hasSessionAuth = this.isSessionValid();
    
    // console.log('🔍 Auth Debug:', {
    //   userEmail,
    //   authToken,
    //   hasOAuthAuth,
    //   sessionId,
    //   expiresAt,
    //   hasSessionAuth,
    //   isLoggedIn: hasOAuthAuth || hasSessionAuth
    // });
    
    return hasOAuthAuth || hasSessionAuth;
  }

  // Check if current user is admin
  isAdmin(): boolean {
    const email = this.getUserEmail();
    return email ? this.adminEmails.includes(email.toLowerCase()) : false;
  }

  logout(): void {
    this.clearAuthData();
    this.clearSessionData(); // Clear email/password session data
    // Best-effort backend logout to clear server-side OAuth session cookies
    try {
    this.http.post(`${AppEnv.API_BASE_URL}/logout`, {}, { withCredentials: true })
        .pipe(catchError(() => of(null)))
        .subscribe(() => {});
    } catch {}
  }

  // Optional: Method to check if user has specific roles/permissions
  hasPermission(permission: string): boolean {
    // Implement your permission checking logic here
    return true; // Replace with actual permission check
  }

  // Verify token validity (you can implement this based on your API)
  verifyToken(): Observable<boolean> {
    const token = this.getAuthToken();
    if (!token) {
      return of(false);
    }

    // If your API has a token verification endpoint, use it here
    // For now, we'll just check if token exists
    return of(true);
  }

  // Check user status via backend after OAuth
  checkUserStatus(email: string): Observable<{ id: number; email: string; name: string }> {
    return this.http
    .post<any>(`${AppEnv.API_BASE_URL}/users/check-user-status`, { email })
      .pipe(
        map((resp: any) => {
          const id = resp?.user_id ?? resp?.id ?? 0;
          const name = resp?.user_name ?? resp?.name ?? '';
          const emailOut = resp?.email ?? email;
          return { id, email: emailOut, name };
        })
      );
  }

  // Full user status response
  checkUserStatusFull(email: string): Observable<{
    user_id: number;
    email: string;
    user_name: string;
    free_tier_user: boolean;
    search_count: number;
    search_count_exceeded: boolean;
  }> {
    return this.http.post<any>(`${AppEnv.API_BASE_URL}/users/check-user-status`, { email }).pipe(
      map((resp: any) => ({
        user_id: resp?.user_id,
        email: resp?.email ?? email,
        user_name: resp?.user_name,
        free_tier_user: !!resp?.free_tier_user,
        search_count: resp?.search_count ?? 0,
        search_count_exceeded: !!resp?.search_count_exceeded,
      })),
      tap((mapped) => {
        // Keep localStorage in sync with the backend canonical email
        if (this.isBrowser && mapped?.email) {
          this.storeUserEmail(mapped.email);
        }
      })
    );
  }

  // Create user (after OAuth when user doesn't exist)
  createUser(payload: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(
    `${AppEnv.API_BASE_URL}/users/create-user`,
      payload
    );
  }

  // Get user locations
  getUserLocations(userId: number): Observable<UserLocationsResponse> {
    return this.http.get<UserLocationsResponse>(`${AppEnv.API_BASE_URL}/user-locations/${userId}`).pipe(
      map((resp: any) => resp as UserLocationsResponse)
    );
  }

  getUserSearchCount(userId: number): Observable<{ id: number; search_count: number }> {
    return this.http.get<any>(`${AppEnv.API_BASE_URL}/user-search-tracking/${userId}`).pipe(
      map((resp: any) => ({
        id: resp?.id ?? userId,
        search_count: resp?.search_count ?? 0
      }))
    );
  }

  // New methods for anonymous token flow
  
  // Generate Anonymous Token
  generateAnonymousToken(): Observable<AnonymousTokenResponse> {
    return this.http.get<AnonymousTokenResponse>(`${AppEnv.API_BASE_URL}/generate-anonymous-token`);
  }

  // Register UUID Tracking
  registerUUIDTracking(payload: RegisterUUIDTrackingRequest): Observable<RegisterUUIDTrackingResponse> {
    return this.http.post<RegisterUUIDTrackingResponse>(
    `${AppEnv.API_BASE_URL}/user-search-tracking/register-uuid-tracking`,
      payload
    );
  }

  // Get User Search Count by UUID
  getUUIDSearchCount(uuid: string): Observable<UUIDSearchCountResponse> {
    return this.http.get<UUIDSearchCountResponse>(`${AppEnv.API_BASE_URL}/user-search-tracking/${uuid}`);
  }

  // Store anonymous token in localStorage for reference (since it's also in HTTP-only cookie)
  storeAnonymousToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem('anonymousToken', token);
    }
  }

  // Get anonymous token from localStorage
  getAnonymousToken(): string | null {
    return this.isBrowser ? localStorage.getItem('anonymousToken') : null;
  }

  // Clear anonymous token
  clearAnonymousToken(): void {
    if (this.isBrowser) {
      localStorage.removeItem('anonymousToken');
    }
  }

  // Check if user is anonymous (has anonymous token but no user email)
  isAnonymousUser(): boolean {
    return !!this.getAnonymousToken() && !this.getUserEmail();
  }

  // New methods for location status management
  updateLocationStatus(payload: UpdateLocationStatusRequest): Observable<UpdateLocationStatusResponse> {
    const url = `${AppEnv.API_BASE_URL}/profile/update-location-status`;
    return this.http.post<UpdateLocationStatusResponse>(url, payload);
  }

  getUserProfileDetails(userId: number): Observable<UserProfileDetails> {
    const url = `${AppEnv.API_BASE_URL}/profile/profile-details/${userId}`;
    return this.http.get<UserProfileDetails>(url);
  }
}
import { AppEnv } from './config/env';