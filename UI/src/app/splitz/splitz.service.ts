import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { GoogleLoginRequest, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from './splitz.model';

@Injectable({
  providedIn: 'root'
})
export class SplitzService {
  private readonly BASE_URL = environment.apiBaseUrl;
  private readonly ENDPOINTS = environment.endpoints;

  private userIdSubject = new BehaviorSubject<string | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  public userId$ = this.userIdSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) { }

  login(loginData: LoginRequest): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.post<LoginResponse>(`${this.BASE_URL}${this.ENDPOINTS.LOGIN}`, loginData, { headers });
  }

  register(registerData: RegisterRequest): Observable<RegisterResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.http.post<RegisterResponse>(`${this.BASE_URL}${this.ENDPOINTS.REGISTER}`, registerData, { headers });
  }

  setUserId(userId: number): void {
    const userIdStr = userId.toString();
    localStorage.setItem('userId', userIdStr);
    
    this.userIdSubject.next(userIdStr);
  }

  getUserId(): string | null {
    return this.userIdSubject.value || localStorage.getItem('userId');
  }

  setToken(token: string): void {
    const tokenStr = token.toString();
    localStorage.setItem('token', tokenStr);
    
    this.tokenSubject.next(tokenStr);
  }

  getToken(): string | null {
    return this.tokenSubject.value || localStorage.getItem('token');
  }

  logout(): void {
    const url = `${this.BASE_URL}${this.ENDPOINTS.LOGOUT}`;
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
      'Authorization': `Bearer ${this.getToken()}`
    });
    this.http.get(url, { headers }).subscribe({
      next: () => {
        console.log('Logout successful');
      },
      error: (error) => {
        console.error('Logout failed', error);
      }
    });
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('googleToken');
    this.userIdSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.getUserId();
  }

  redirectToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
  onFetchDashboardData() {
    const url = `${this.BASE_URL}${this.ENDPOINTS.DASHBOARD}`;
    const token = this.getToken();
    console.log(`Fetching dashboard data from ${url}`);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
      'Authorization': `Bearer ${token}`
    });
    return this.http.get<any>(url, { headers });
  }
  onFetchGroupData(groupId: any) {
    const url = `${this.BASE_URL}${this.ENDPOINTS.GROUP}/${groupId}`;
    const token = this.getToken();
    console.log(`Fetching group data from ${url}`);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
      'Authorization': `Bearer ${token}`
    });
    return this.http.get<any>(url, { headers });
  }
  onSaveExpense(expense: any) {
    const url = `${this.BASE_URL}${this.ENDPOINTS.EXPENSE}`;
    console.log(`Saving expense to ${url}`);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    });
    return this.http.post<any>(url, expense, { headers });
  }
  getRecentActivity() {
    const url = `${this.BASE_URL}${this.ENDPOINTS.RECENT}`;
    console.log(`Fetching recent activity from ${url}`);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
      'Authorization': `Bearer ${this.getToken()}`
    });
    return this.http.get<any[]>(url, { headers });
  }
  ssoLoginRedirect() {
    window.location.href = `${this.BASE_URL}${this.ENDPOINTS.SSOLOGIN}`;
  }
  handleGoogleSignIn(googleResponse: any): void {
    try {
      // Decode the JWT token to get user information
      const token = googleResponse.credential;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const userInfo = JSON.parse(jsonPayload);

      // Store user information from Google
      const userId = userInfo.sub; // Google's unique user ID
      const userEmail = userInfo.email;
      const userName = userInfo.name;

      // Store in localStorage
      // localStorage.setItem('userId', userId);
      localStorage.setItem('userEmail', userEmail);
      localStorage.setItem('userName', userName);
      localStorage.setItem('googleToken', token);

      // Update subjects
      // this.userIdSubject.next(userId);
      this.tokenSubject.next(token);

      // Redirect to dashboard
      const googleLoginRequest: GoogleLoginRequest = {
        idToken: token
      }
      this.onGoogleLogin(googleLoginRequest).subscribe({
        next: (response) => {
          if (response.success == true) {
            if (response?.data?.id) {
              localStorage.setItem('userId', response.data.id);
              localStorage.setItem('token', response.data.token);
              this.userIdSubject.next(response.data.id);
              this.router.navigate(['/dashboard']);
            }
          }
          else {
            this.router.navigate(['/login']);
          }
        },
        error: (error) => {
          console.error('Error Google Login:', error);
        }
      })
    } catch (error) {
      console.error('Error processing Google Sign-In:', error);
    }
  }
  onGoogleLogin(request: GoogleLoginRequest) {
    const url = `${this.BASE_URL}${this.ENDPOINTS.GOOGLELOGIN}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    });
    return this.http.post<any>(url, request, { headers })
  }
}
