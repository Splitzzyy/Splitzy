import { Injectable } from '@angular/core';

/**
 * Lightweight service to manage access token in sessionStorage only
 * User data (userId, email, name) remain in localStorage
 */
@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  private readonly TOKEN_KEY = 'token';

  /**
   * Sets the access token in sessionStorage (cleared when tab closes)
   */
  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Gets the access token from sessionStorage
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Removes the access token from sessionStorage
   */
  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Checks if token exists
   */
  hasToken(): boolean {
    return !!this.getToken();
  }

  /**
   * Clears token from sessionStorage
   */
  clearToken(): void {
    this.removeToken();
  }

  /**
   * Clears token and deletes all cookies
   */
  clearTokenAndCookies(): void {
    this.removeToken();
    this.clearAllCookies();
  }

  /**
   * Deletes all cookies
   */
  private clearAllCookies(): void {
    document.cookie.split(';').forEach((c) => {
      const eqPos = c.indexOf('=');
      const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname}`;
      }
    });
  }
}

