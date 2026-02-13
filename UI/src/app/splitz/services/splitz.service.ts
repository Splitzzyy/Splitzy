import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, finalize, map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AddMembersRequest, GoogleLoginRequest, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, ReminderRequest, ResetData, SettleUpRequest, Toast, ToastType } from '../splitz.model';
import { TokenStorageService } from './token-storage.service';
import { TokenRefreshService } from './token-refresh.service';

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

  constructor(
    private http: HttpClient,
    private router: Router,
    private tokenStorageService: TokenStorageService,
    private tokenRefreshService: TokenRefreshService
  ) { }

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
    this.tokenStorageService.setToken(tokenStr);
    this.tokenSubject.next(tokenStr);
    
    // Start auto-refresh when token is set
    this.tokenRefreshService.startAutoRefresh();
  }

  getToken(): string | null {
    return this.tokenSubject.value || this.tokenStorageService.getToken();
  }

  logout(): void {
    const url = `${this.BASE_URL}${this.ENDPOINTS.LOGOUT}`;
    this.http.post(url, {}).pipe(
      finalize(() => {
        this.clearLocalSession();
      })
    ).subscribe({
      next: () => {
        console.log('Logout API call successful');
      },
      error: (err) => {
        console.error('Logout API call failed, clearing session anyway', err);
        this.clearLocalSession();
      }
    });
  }

  private clearLocalSession(): void {
    // Stop auto-refresh
    this.tokenRefreshService.stopAutoRefresh();

    // Clear localStorage
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('googleToken');

    // Clear token from sessionStorage and cookies
    this.tokenStorageService.clearTokenAndCookies();

    // Update subjects
    this.userIdSubject.next(null);
    this.tokenSubject.next(null);

    // Navigate to home page after logout
    this.router.navigate(['/welcome']);

    console.log('Local session cleared');
  }

  isLoggedIn(): boolean {
    return !!this.getUserId();
  }

  redirectToDashboard(): void {
    this.router.navigateByUrl('/dashboard', { replaceUrl: true });
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

      // Store user information from Google in localStorage
      const userEmail = userInfo.email;
      const userName = userInfo.name;

      localStorage.setItem('userEmail', userEmail);
      localStorage.setItem('userName', userName);
      localStorage.setItem('googleToken', token);

      // Update subject
      this.tokenSubject.next(token);

      // Send Google token to backend for authentication
      const googleLoginRequest: GoogleLoginRequest = {
        idToken: token
      }
      this.onGoogleLogin(googleLoginRequest).subscribe({
        next: (response) => {
          if (response.success == true && response?.data?.id) {
            // Store received credentials from backend
            localStorage.setItem('userId', response.data.id);
            this.tokenStorageService.setToken(response.data.token);
            
            this.userIdSubject.next(response.data.id);
            this.tokenSubject.next(response.data.token);
            
            // Start auto-refresh with new token
            this.tokenRefreshService.startAutoRefresh();
            
            this.router.navigateByUrl('/dashboard', { replaceUrl: true });
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

  onDeleteGroup(groupId: number): Observable<any> {
    const url = `${this.BASE_URL}${this.ENDPOINTS.DELETE_GROUP}/${groupId}`;
    return this.http.delete<any>(url);
  }

  onDeleteExpense(expenseId: number): Observable<any> {
    const url = `${this.BASE_URL}${this.ENDPOINTS.DELETE_EXPENSE}/${expenseId}`;
    return this.http.delete<any>(url);
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
  verifyEmail(token: string): Observable<any> {
    const url = `${this.BASE_URL}${this.ENDPOINTS.VERIFY_EMAIL}`;
    const params = new HttpParams().set('token', token);
    return this.http.get(url, { params });
  }

  resendVerificationEmail(email: string): Observable<any> {
    const url = `${this.BASE_URL}${this.ENDPOINTS.RESEND_VERIFICATION}`;
    return this.http.post<any>(url, { email });
  }

  getExpenseIcon(expenseName: string): string {
    const name = expenseName.toLowerCase();
    if (name.includes('dinner') || name.includes('food') || name.includes('lunch') || name.includes('breakfast') || name.includes('snack') || name.includes('restaurant') || name.includes('zomato') || name.includes('swiggy')) {
      return 'fas fa-utensils';
    }
    if (name.includes('grocery') || name.includes('vegetable') || name.includes('sabji') || name.includes('chawal') || name.includes('milk') || name.includes('fruit') || name.includes('market') || name.includes('blinkit') || name.includes('zepto')) {
      return 'fas fa-shopping-basket';
    }
    if (name.includes('uber') || name.includes('ola') || name.includes('taxi') || name.includes('cab') || name.includes('fuel') || name.includes('petrol') || name.includes('gas') || name.includes('train') || name.includes('flight') || name.includes('bus')) {
      return 'fas fa-car';
    }
    if (name.includes('hotel') || name.includes('booking') || name.includes('rent') || name.includes('airbnb') || name.includes('stay')) {
      return 'fas fa-bed';
    }
    if (name.includes('ticket') || name.includes('movie') || name.includes('cinema') || name.includes('show') || name.includes('netflix') || name.includes('subscription') || name.includes('game')) {
      return 'fas fa-film';
    }
    if (name.includes('wifi') || name.includes('internet') || name.includes('broadband') || name.includes('bill') || name.includes('electricity') || name.includes('recharge') || name.includes('mobile')) {
      return 'fas fa-bolt';
    }
    if (name.includes('amazon') || name.includes('flipkart') || name.includes('myntra') || name.includes('cloth') || name.includes('shoe') || name.includes('gratter') || name.includes('shopping')) {
      return 'fas fa-shopping-bag';
    }
    if (name.includes('medicine') || name.includes('doctor') || name.includes('pharmacy') || name.includes('hospital') || name.includes('checkup')) {
      return 'fas fa-briefcase-medical';
    }
    if (name.includes('beer') || name.includes('alcohol') || name.includes('wine') || name.includes('party') || name.includes('bar') || name.includes('drink')) {
      return 'fas fa-glass-cheers';
    }
    return 'fas fa-receipt';
  }

  sendReminder(reminderData: ReminderRequest): Observable<any> {
    const url = `${this.BASE_URL}${this.ENDPOINTS.REMIND}`;
    return this.http.post<any>(url, reminderData);
  }

  onUpdateExpense(expense: any) {
    const url = `${this.BASE_URL}${this.ENDPOINTS.UPDATE_EXPENSE}`;
    return this.http.put<any>(url, expense);
  }

  onGetExpenseDetails(expenseId: number) {
    const url = `${this.BASE_URL}${this.ENDPOINTS.GET_EXPENSE_DETAILS}/${expenseId}`;
    return this.http.get<any>(url);
  }
}
