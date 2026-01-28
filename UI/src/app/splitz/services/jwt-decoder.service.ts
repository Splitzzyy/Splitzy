import { Injectable } from '@angular/core';

export interface DecodedToken {
  exp: number;
  iat: number;
  userId?: string;
  email?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class JwtDecoderService {
  /**
   * Decodes a JWT token without verifying the signature
   * Only decodes the payload - suitable for extracting claims like exp time
   */
  decode(token: string): DecodedToken | null {
    try {
      const parts = token.split('.');
      
      if (parts.length !== 3) {
        console.error('Invalid token format');
        return null;
      }

      const decoded = JSON.parse(this.atob(parts[1]));
      return decoded as DecodedToken;
    } catch (error) {
      console.error('Token decoding failed:', error);
      return null;
    }
  }

  /**
   * Gets the expiration time of a token in milliseconds
   */
  getExpiration(token: string): number | null {
    const decoded = this.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    // JWT exp is in seconds, convert to milliseconds
    return decoded.exp * 1000;
  }

  /**
   * Checks if a token is expired
   */
  isTokenExpired(token: string, offsetSeconds: number = 0): boolean {
    const expTime = this.getExpiration(token);
    if (!expTime) {
      return true;
    }
    return Date.now() >= (expTime - offsetSeconds * 1000);
  }

  /**
   * Gets remaining time until token expiration in milliseconds
   */
  getTimeUntilExpiration(token: string): number | null {
    const expTime = this.getExpiration(token);
    if (!expTime) {
      return null;
    }
    const remaining = expTime - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Base64 URL decoding
   */
  private atob(str: string): string {
    let output = '';
    str += new Array(5 - str.length % 4).join('=');
    str = str.replace(/\-/g, '+').replace(/_/g, '/');

    try {
      output = decodeURIComponent(
        atob(str)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (err) {
      output = str;
    }

    return output;
  }
}
