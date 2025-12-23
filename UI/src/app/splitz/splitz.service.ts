import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from './splitz.model';

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
      'ngrok-skip-browser-warning': 'true'
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
    this.userIdSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.getUserId();
  }

  redirectToDashboard(userId: string): void {
    this.router.navigate(['/dashboard', userId]);
  }
  onFetchDashboardData(id: any) {
    const url = `${this.BASE_URL}${this.ENDPOINTS.DASHBOARD}/${id}`;
    console.log(`Fetching dashboard data from ${url}`);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<any>(url, { headers });
  }
  onFetchGroupData(userId: any, groupId: any) {
    const url = `${this.BASE_URL}${this.ENDPOINTS.GROUP}/${userId}/${groupId}`;
    console.log(`Fetching group data from ${url}`);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<any>(url, { headers });
  }
  onSaveExpense(expense: any) {
    const url = `${this.BASE_URL}${this.ENDPOINTS.EXPENSE}`;
    console.log(`Saving expense to ${url}`);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true',
      'Content-Type': 'application/json'
    });
    return this.http.post<any>(url, expense, { headers });
  }
  getRecentActivity(userId: any) {
    const url = `${this.BASE_URL}${this.ENDPOINTS.RECENT}/${userId}`;
    console.log(`Fetching recent activity from ${url}`);
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<any[]>(url, { headers });
  }
  onFetchSecureLogin(): Observable<LoginResponse> {
    const url = `${this.BASE_URL}${this.ENDPOINTS.SECURE}`;
    const headers = new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    return this.http.get<LoginResponse>(url, {
      headers,
      withCredentials: true
    });
  }
  ssoLoginRedirect() {
    window.location.href = `${this.BASE_URL}${this.ENDPOINTS.SSOLOGIN}`;
  }
}
