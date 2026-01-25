import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, Subscription } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TokenRefreshService {
    private refreshSubscription: Subscription | null = null;

    private readonly REFRESH_INTERVAL = environment.TOKEN_EXPIRY_TIME - environment.REFRESH_BEFORE_EXPIRY;
    private readonly REFRESH_API_URL = `${environment.apiBaseUrl}${environment.endpoints.REFRESH}`;

    constructor(private http: HttpClient) { }

    startAutoRefresh(): void {
        this.stopAutoRefresh();

        this.refreshSubscription = timer(0, this.REFRESH_INTERVAL)
            .pipe(
                switchMap(() => this.refreshToken()),
                catchError(error => {
                    console.error('Token refresh failed:', error);
                    this.handleRefreshError();
                    throw error;
                })
            ).subscribe({
                next: response => {
                    console.log('Token refreshed successfully', response);
                },
                error: error => {
                    console.error('Refresh subscription error:', error);
                }
            });
    }

    stopAutoRefresh(): void {
        if (this.refreshSubscription) {
            this.refreshSubscription.unsubscribe();
            this.refreshSubscription = null;
        }
    }

    private refreshToken(): Observable<any> {
        return this.http.post(
            this.REFRESH_API_URL,
            {},
            {
                withCredentials: true
            }
        );
    }

    private handleRefreshError(): void {
        this.stopAutoRefresh();

    }
}