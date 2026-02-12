import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, timer, Subscription, BehaviorSubject } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { JwtDecoderService } from './jwt-decoder.service';
import { TokenStorageService } from './token-storage.service';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class TokenRefreshService {
    private refreshSubscription: Subscription | null = null;
    private refreshInProgress$ = new BehaviorSubject<boolean>(false);

    private readonly REFRESH_BEFORE_EXPIRY = environment.REFRESH_BEFORE_EXPIRY;
    private readonly REFRESH_API_URL = `${environment.apiBaseUrl}${environment.endpoints.REFRESH}`;
    private readonly MAX_RETRY_ATTEMPTS = 3;
    private retryCount = 0;

    private readonly jwtDecoder = inject(JwtDecoderService);
    private readonly tokenStorage = inject(TokenStorageService);
    private readonly router = inject(Router);

    constructor(private http: HttpClient) { }

    /**
     * Starts automatic token refresh based on JWT expiration time
     * Dynamically calculates refresh interval from token's exp claim
     */
    startAutoRefresh(): void {
        this.stopAutoRefresh();

        const token = this.tokenStorage.getToken();
        if (!token) {
            console.warn('No token available for auto-refresh');
            return;
        }

        const timeUntilExpiration = this.jwtDecoder.getTimeUntilExpiration(token);
        if (!timeUntilExpiration) {
            console.error('Could not determine token expiration time');
            return;
        }

        // Calculate when to refresh (REFRESH_BEFORE_EXPIRY before expiration)
        const refreshIn = Math.max(0, timeUntilExpiration - this.REFRESH_BEFORE_EXPIRY);
        
        console.log(`Token will expire in ${Math.round(timeUntilExpiration / 1000)}s, refreshing in ${Math.round(refreshIn / 1000)}s`);

        // First refresh after calculated interval, then every REFRESH_BEFORE_EXPIRY
        this.refreshSubscription = timer(refreshIn, this.REFRESH_BEFORE_EXPIRY)
            .pipe(
                switchMap(() => {
                    if (this.refreshInProgress$.value) {
                        console.log('Refresh already in progress, skipping...');
                        return new Observable(observer => observer.complete());
                    }
                    return this.performTokenRefresh();
                }),
                catchError(error => {
                    console.error('Token refresh failed:', error);
                    this.handleRefreshError(error);
                    throw error;
                })
            ).subscribe({
                next: response => {
                    if (response.accessToken) {
                        this.tokenStorage.setToken(response.accessToken);
                        this.retryCount = 0;
                        console.log('Token refreshed successfully');
                        
                        // Schedule next refresh based on new token expiration
                        this.scheduleNextRefresh();
                    }
                },
                error: error => {
                    console.error('Refresh subscription error:', error);
                }
            });
    }

    /**
     * Stops automatic token refresh
     */
    stopAutoRefresh(): void {
        if (this.refreshSubscription) {
            this.refreshSubscription.unsubscribe();
            this.refreshSubscription = null;
        }
    }

    /**
     * Manually refresh token (e.g., when receiving 401 error)
     * Automatically retries failed requests
     */
    refreshTokenManually(): Observable<any> {
        return this.performTokenRefresh();
    }

    /**
     * Core token refresh logic with error handling
     */
    private performTokenRefresh(): Observable<any> {
        this.refreshInProgress$.next(true);

        return this.http.post(
            this.REFRESH_API_URL,
            {},
            {
                withCredentials: true
            }
        ).pipe(
            tap(response => {
                console.log('Token refresh response received', response);
            }),
            catchError(error => {
                console.error('Refresh API error:', error);
                
                // If refresh API returns 401, logout immediately
                if (error instanceof HttpErrorResponse && error.status === 401) {
                    console.error('Refresh token invalid or expired');
                    this.performLogout('Refresh token expired or invalid');
                    throw error;
                }

                // Retry on other errors (with max attempts)
                if (this.retryCount < this.MAX_RETRY_ATTEMPTS) {
                    this.retryCount++;
                    console.warn(`Retrying token refresh (attempt ${this.retryCount}/${this.MAX_RETRY_ATTEMPTS})`);
                    
                    // Retry after 2 seconds
                    return timer(2000).pipe(
                        switchMap(() => this.performTokenRefresh())
                    );
                }

                // Max retries exceeded
                console.error('Max retry attempts exceeded for token refresh');
                this.performLogout('Token refresh failed after retries');
                throw error;
            })
        ).pipe(
            tap(() => this.refreshInProgress$.next(false)),
            catchError(error => {
                this.refreshInProgress$.next(false);
                throw error;
            })
        );
    }

    /**
     * Schedules the next refresh based on current token expiration
     */
    private scheduleNextRefresh(): void {
        const token = this.tokenStorage.getToken();
        if (token) {
            // Restart auto refresh with updated token expiration time
            this.startAutoRefresh();
        }
    }

    /**
     * Handles errors during token refresh
     */
    private handleRefreshError(error: any): void {
        this.stopAutoRefresh();
        
        if (error instanceof HttpErrorResponse && error.status === 401) {
            console.error('Refresh token is invalid or expired');
            this.performLogout('Refresh token expired');
        }
    }

    /**
     * Performs complete logout and session cleanup
     * Clears all storage and cookies, navigates to login
     */
    private performLogout(reason: string = 'Session expired'): void {
        console.log(`Logout triggered: ${reason}`);
        
        // Stop auto-refresh
        this.stopAutoRefresh();

        // Clear all session data
        
        // Clear all cookies
        this.tokenStorage.clearTokenAndCookies();

        // Navigate to home page after logout
        this.router.navigate(['/home']);

        console.log('User session cleared and logged out');
    }

    /**
     * Gets the refresh in progress state
     */
    getRefreshInProgress$(): Observable<boolean> {
        return this.refreshInProgress$.asObservable();
    }

    /**
     * Gets current token expiration info
     */
    getTokenExpirationInfo(): { expiresAt: number | null; expiresIn: number | null; isExpired: boolean } {
        const token = this.tokenStorage.getToken();
        if (!token) {
            return { expiresAt: null, expiresIn: null, isExpired: true };
        }

        const expiresAt = this.jwtDecoder.getExpiration(token);
        const expiresIn = this.jwtDecoder.getTimeUntilExpiration(token);
        const isExpired = this.jwtDecoder.isTokenExpired(token);

        return { expiresAt, expiresIn, isExpired };
    }
}