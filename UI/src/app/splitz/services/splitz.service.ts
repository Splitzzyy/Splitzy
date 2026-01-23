import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, finalize, map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AddMembersRequest, GoogleLoginRequest, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, ResetData, SettleUpRequest, Toast, ToastType } from '../splitz.model';

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
  private toasts$ = new BehaviorSubject<Toast[]>([]);
  private id = 0;
  private groupWiseSummary: any;

  constructor(private http: HttpClient, private router: Router) { }

  login(loginData: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.BASE_URL}${this.ENDPOINTS.LOGIN}`, loginData);
  }

  register(registerData: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.BASE_URL}${this.ENDPOINTS.REGISTER}`, registerData);
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
    this.http.get(url).pipe(
      finalize(() => {
        this.clearLocalSession();
      })
    ).subscribe({
      next: () => {},
      error: (err) => console.error('Logout API call failed', err)
    });
  }

  private clearLocalSession(): void {
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
    return this.http.get<any>(url);
  }
  onFetchGroupData(groupId: any) {
    const url = `${this.BASE_URL}${this.ENDPOINTS.GROUP}/${groupId}`;
    return this.http.get<any>(url);
  }
  onSaveExpense(expense: any) {
    const url = `${this.BASE_URL}${this.ENDPOINTS.EXPENSE}`;
    return this.http.post<any>(url, expense);
  }

  onCreateGroup(group: any) {
    const url = `${this.BASE_URL}${this.ENDPOINTS.CREATE_GROUP}`;
    return this.http.post<any>(url, group);
  }

  getRecentActivity() {
    const url = `${this.BASE_URL}${this.ENDPOINTS.RECENT}`;
    return this.http.get<any[]>(url);
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
              this.tokenSubject.next(response.data.token);
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
    return this.http.post<any>(url, request)
  }

  forgotPassword(email: string): Observable<any> {
    const url = `${this.BASE_URL}${this.ENDPOINTS.FORGOTPASS}`;
    return this.http.post<any>(url, { email });
  }

  setupPassword(resetData: ResetData): Observable<any> {
    const url = `${this.BASE_URL}${this.ENDPOINTS.SETUPPASS}`;
    return this.http.post<any>(url, resetData);
  }
  onSettleExpense(request: SettleUpRequest) {
    const url = `${this.BASE_URL}${this.ENDPOINTS.SETTLEUP}`;
    return this.http.post<any>(url, request);
  }
  onAddMemeber(request: AddMembersRequest) {
    const url = `${this.BASE_URL}${this.ENDPOINTS.ADDUSERTOGROUP}/${request.groupId}`;
    return this.http.post<any>(url, request);
  }
  get stream() {
    return this.toasts$.asObservable();
  }

  show(message: string, type: ToastType = 'info', duration = 2500) {
    const toast: Toast = { id: ++this.id, message, type, duration };
    this.toasts$.next([...this.toasts$.value, toast]);

    setTimeout(() => this.dismiss(toast.id), duration);
  }

  dismiss(id: number) {
    this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
  }
}
