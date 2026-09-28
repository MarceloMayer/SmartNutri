import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

type QueryParams = Record<string, number | string | boolean | null | undefined>;

@Injectable({
  providedIn: 'root'
})
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get<TResponse>(path: string, params?: QueryParams): Observable<TResponse> {
    return this.http.get<TResponse>(this.resolveUrl(path), {
      params: this.resolveParams(params)
    });
  }

  post<TResponse, TPayload extends object>(path: string, payload: TPayload): Observable<TResponse> {
    return this.http.post<TResponse>(this.resolveUrl(path), payload);
  }

  put<TResponse, TPayload extends object>(path: string, payload: TPayload): Observable<TResponse> {
    return this.http.put<TResponse>(this.resolveUrl(path), payload);
  }

  patch<TResponse, TPayload extends object>(path: string, payload: TPayload): Observable<TResponse> {
    return this.http.patch<TResponse>(this.resolveUrl(path), payload);
  }

  delete<TResponse>(path: string): Observable<TResponse> {
    return this.http.delete<TResponse>(this.resolveUrl(path));
  }

  getBlob(path: string): Observable<Blob> {
    return this.http.get(this.resolveUrl(path), { responseType: 'blob' });
  }

  postFormData<TResponse>(path: string, formData: FormData, params?: QueryParams): Observable<TResponse> {
    return this.http.post<TResponse>(this.resolveUrl(path), formData, {
      params: this.resolveParams(params)
    });
  }

  private resolveUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  private resolveParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }
}
