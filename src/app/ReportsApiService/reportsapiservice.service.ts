import { Injectable } from '@angular/core';
import { HttpClient,HttpParams } from '@angular/common/http';
import { AppEnv } from '../config/env';
import { Observable,catchError,throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReportsapiserviceService {

  private baseUrl = AppEnv.API_BASE_URL;
  constructor(private readonly http: HttpClient) { }

  fetchRestaurantsData(payload : any):Observable<any>{
    return this.http.get(`${this.baseUrl}/user-locations/${payload}`).pipe(
      catchError((error) => {
        return throwError(error);
      })
    )
  }

  fetchLastMonths():Observable<any>{
    return this.http.get(`${this.baseUrl}/compstore/months`).pipe(
      catchError((error) => {
        return throwError(error);
      })
    )
  }

  fetchHostMenuItems(payload : any):Observable<any>{
   return this.http.post(`${this.baseUrl}/restaurant-menus`,payload).pipe(
     catchError((error) => {
       return throwError(error);
     })
   )
  }

  fetchCompstoreRestaurants(payload: { user_location_id: number; menu_item_name: string }): Observable<any> {
  let params = new HttpParams()
    .set('user_location_id', payload.user_location_id)
    .set('menu_item_name', payload.menu_item_name);

  return this.http.get(`${this.baseUrl}/compstore/restaurants`, { params }).pipe(
    catchError((error) => throwError(() => error))
  );
  }

  fetchReports(payload : any):Observable<any>{
    return this.http.post(`${this.baseUrl}/menu-report`,payload).pipe(
      catchError((error) => {
        return throwError(error);
      })
    )
  }

  downloadReport(payload : any):Observable<any>{
    return this.http.post(`${this.baseUrl}/download-report`,payload,{ responseType: 'blob' }).pipe(
      catchError((error) => {
        return throwError(error);
      })
    )
  }


}



