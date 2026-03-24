import { Injectable } from '@angular/core';
import { Observable,forkJoin, of, catchError } from 'rxjs';
import { map } from 'rxjs/operators';
import { IRole } from './model/interface/role';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// New interface for Form2 registration data
export interface IRegistrationData {
  restaurant_name: string;
  restaurant_address: string;
  state: string;
  city: string;
  zip_or_postal_code: string;
  email: string;
  name: string;
  phone_number?: string;
  created_at?: string;
  is_active?: boolean;
  revenue?: string;
  quality_of_restaurant?: string;
  liquor_license?: string;
  delivery_or_takeaway?: string;
  seating?: string;
  restaurant_type?: string;
  cuisine_type?: string[];
  distance_from_zip_code?: number;
  latitude?: number;
  longitude?: number;
}

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private apiKey = 'dapif4fb3a4ddc6bc98fe20910fb3ba74c03-3';
  private apiUrl = `${AppEnv.API_BASE_URL}/search`;
  private loginUrl = `${AppEnv.API_BASE_URL}/login`;
  private registerUrl = `${AppEnv.API_BASE_URL}/register-user`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    });
  }

  private fetchDataForMonth(baseParams: any, month: string): Observable<IRole[]> {
    // console.log(`Fetching data for month: ${month}`);
    const body = { ...baseParams, month: month };
    
    return this.http.post<IRole[]>(this.apiUrl, body, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        // console.log(`Error fetching data for month ${month}:`, error);
        return of([]);
      })
    );
  }

  getForm1(
    menuname: string,
    zipCode: string,
    style: string = '',
    price: number | null = null,
    description: string = '',
    menuCategory: string = '',
    month: string = '',
    limit: number = 250,
    includeDescription: boolean = false,
    latitude?: number,
    longitude?: number,
    category?: string,
    exactMatch: boolean = false, // Add exact match parameter
    distanceFromZipCode: number = 5,
    userId?: number,
    userEmail?: string
  ): Observable<IRole[]> {
    const requestBody: any = {
      search_q: menuname,
      auto_correct: false,
      limit: limit,
      include_description: includeDescription,
      month: month || this.getPreviousMonth(),
      zip_or_postal_code: zipCode,
      distance_from_zip_code: distanceFromZipCode,
      use_and_operator: exactMatch, // Use exact match for AND operator
    };

    // Attach user context
    if (userId !== undefined) {
      requestBody.user_id = userId;
    }
    if (userEmail) {
      requestBody.email = userEmail;
    }
  
    // Add latitude and longitude if provided
    if (latitude !== undefined && longitude !== undefined) {
      requestBody.latitude = latitude;
      requestBody.longitude = longitude;
    }

    // Add category to API request if provided
    if (category && category.trim()) {
      requestBody.category = category;
    }
  
    if (price !== null) {
      requestBody.price = price;
    }
    if (description) {
      requestBody.description = description;
    }
    if (menuCategory) {
      requestBody.cuisine_type = menuCategory;
    }
  
    // console.log('API Request Body:', requestBody);
  
    return this.http.post<IRole[]>(this.apiUrl, requestBody, { headers: this.getAuthHeaders() }).pipe(
      map((result: IRole[]) => {
        if (style && result.length > 0) {
          result = result.filter(item => {
            const itemStyle = item.restaurant_type?.toLowerCase().trim();
            const selectedStyle = style.toLowerCase().trim();
            return itemStyle === selectedStyle;
          });
        }
  
        if (result.length > 0) {
          // Apply exact match filtering on the client side if needed
          if (exactMatch && menuname.trim()) {
            // console.log('Applying exact match for:', menuname);
            const searchTerms = menuname.toLowerCase().trim().split(/\s+/);
            
            result = result.filter(item => {
              const itemName = (item.menu_item_name || '').toLowerCase();
              const itemDescription = (item.description || '').toLowerCase();
              const searchText = includeDescription ? `${itemName} ${itemDescription}` : itemName;
              
              // Simple approach: check if all terms exist as separate words
              return searchTerms.every(term => {
                // Split search text into words and check for exact matches
                const words = searchText.split(/\s+/);
                return words.some(word => word === term);
              });
            });
          }
          
          if (price !== null) {
            result = result.filter(item => 
              item.price && Math.abs(item.price - price) <= 2
            );
          }
          if (description) {
            const descLower = description.toLowerCase();
            result = result.filter(item =>
              item.description && item.description.toLowerCase().includes(descLower)
            );
          }
        }
  
        return result;
      }),
      catchError((err) => {
        console.error('Error in getForm1:', err);
        return of([]);
      })
    );
  }

  private getPreviousMonth(offset: number = 1): string {
    const now = new Date();
    now.setMonth(now.getMonth() - offset);
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

 getForm2(
  menuname: string,
  zipCode: string,
  distance: string,
  limit: number = 250
): Observable<IRole[]> {
  const previousMonth = this.getPreviousMonth();
  const fallbackMonth = this.getPreviousMonth(2);
  const baseParams = {
    search_q: menuname,
    include_description: false,
    auto_correct: false,
    use_and_operator: false,
    zip_or_postal_code: zipCode,
    distance_from_zip_code: distance,
    limit: limit
  };

  return forkJoin([
    this.fetchDataForMonth(baseParams, previousMonth),
    this.fetchDataForMonth(baseParams, fallbackMonth),
  ]).pipe(
    catchError((err) => {
      console.error('Error fetching data for both months:', err);
      return of([[], []] as [IRole[], IRole[]]);
    }),
    map(([previousMonthData, fallbackMonthData]: [IRole[], IRole[]]) => {
      return previousMonthData.length > 0 ? previousMonthData : fallbackMonthData;
    })
  );
}

  getlogin(email: string): Observable<any> {
    // console.log(`Logging in with email: ${email}`);
    const body = { email: email };
    return this.http.post<any>(this.loginUrl, body, { headers: this.getAuthHeaders() });
  }

  registerUser(data: IRegistrationData): Observable<any> {
    // console.log('Registering user with data:', data);
    
    // Ensure required fields are present
    if (!data.restaurant_name || !data.restaurant_address || !data.city || !data.state || 
        !data.zip_or_postal_code || !data.email || !data.name) {
      throw new Error('Missing required fields');
    }

    // Validate field lengths
    if (data.restaurant_name.length > 100 ||
        data.restaurant_address.length > 200 ||
        data.state.length > 50 ||
        data.city.length > 50 ||
        data.zip_or_postal_code.length > 6 ||
        (data.name && data.name.length > 50)) {
      throw new Error('Field length exceeds maximum allowed');
    }

    // Set default values and format the data
    const registrationData = {
      ...data,
      created_at: data.created_at || new Date().toISOString(),
      is_active: data.is_active ?? true,
      ...(data.phone_number && { phone_number: data.phone_number }),
      ...(data.revenue && { revenue: data.revenue }),
      ...(data.quality_of_restaurant && { quality_of_restaurant: data.quality_of_restaurant }),
      ...(data.liquor_license && { liquor_license: data.liquor_license }),
      ...(data.delivery_or_takeaway && { delivery_or_takeaway: data.delivery_or_takeaway }),
      ...(data.seating && { seating: data.seating }),
      ...(data.restaurant_type && { restaurant_type: data.restaurant_type }),
      ...(data.cuisine_type && data.cuisine_type.length > 0 && { cuisine_type: data.cuisine_type }),
      ...(data.distance_from_zip_code && { distance_from_zip_code: data.distance_from_zip_code }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
    };

    return this.http.post<any>(this.registerUrl, registrationData, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Registration error:', error);
        throw error;
      })
    );
  }

  getDistinctCategories(): Observable<string[]> {
    const categoriesUrl = `${AppEnv.API_BASE_URL}/distinct-categories`;
    return this.http.get<string[]>(categoriesUrl, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error fetching categories:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  // New UUID-based search method for anonymous users
  searchWithUUID(
    uuid: string,
    menuname: string,
    zipCode: string,
    latitude: number,
    longitude: number,
    month: string = '',
    includeDescription: boolean = false,
    exactMatch: boolean = false,
    limit: number = 5000,
    distanceFromZipCode: number = 5
  ): Observable<IRole[]> {
    const requestBody: any = {
      uuid: uuid,
      search_q: menuname,
      auto_correct: false,
      limit: limit,
      include_description: includeDescription,
      month: month || this.getPreviousMonth(),
      zip_or_postal_code: zipCode,
      distance_from_zip_code: distanceFromZipCode,
      use_and_operator: exactMatch,
      latitude: latitude,
      longitude: longitude
    };

    // console.log('UUID-based API Request Body:', requestBody);

    return this.http.post<IRole[]>(this.apiUrl, requestBody, { headers: this.getAuthHeaders() }).pipe(
      map((result: IRole[]) => {
        if (result.length > 0) {
          // Apply exact match filtering on the client side if needed
          if (exactMatch && menuname.trim()) {
            // console.log('Applying exact match for:', menuname);
            const searchTerms = menuname.toLowerCase().trim().split(/\s+/);
            
            result = result.filter(item => {
              const itemName = (item.menu_item_name || '').toLowerCase();
              const itemDescription = (item.description || '').toLowerCase();
              const searchText = includeDescription ? `${itemName} ${itemDescription}` : itemName;
              
              // Simple approach: check if all terms exist as separate words
              return searchTerms.every(term => {
                // Split search text into words and check for exact matches
                const words = searchText.split(/\s+/);
                return words.some(word => word === term);
              });
            });
          }
        }

        return result;
      }),
      catchError((err) => {
        console.error('Error in searchWithUUID:', err);
        return of([]);
      })
    );
  }
}
import { AppEnv } from './config/env';