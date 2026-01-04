import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ModalComponent } from '../../splitz/modal/modal.component';
import { CommonModule } from '@angular/common';
import { SplitzService } from '../../splitz/splitz.service';
import { LoginResponse } from '../../splitz/splitz.model';
import { LoaderComponent } from '../../splitz/loader/loader.component';
import { ExpenseModalComponent } from '../../splitz/dashboard/expense-modal/expense-modal.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterModule,
    ModalComponent,
    CommonModule,
    LoaderComponent,
    ExpenseModalComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements OnInit {
  isModalOpen: boolean = false;
  modalType: 'expense' | 'settle' = 'expense';
  userId: string | null = null;
  userIdNumber: number | null = null;
  token: string | null = null;
  showLoader: boolean = true;
  showExpenseModal: boolean = false;
  selectedGroupId: number | null = null;
  selectedGroupMembers: any[] = [];
  allGroups: any[] = [];

  constructor(private router: Router, private spltizService: SplitzService) {
  }
  
  ngOnInit(): void {
    this.userId = localStorage.getItem('userId');
    if (this.userId) {
      this.userIdNumber = parseInt(this.userId, 10);
    }
    this.token = localStorage.getItem('token');
    this.checkAuthStatus();
  }
  checkAuthStatus() {
    // If bypassAuthOnLocalhost is enabled and running on localhost, bypass auth checks to ease local development and open dashboard.
    if (environment.bypassAuthOnLocalhost && this.isLocalhost()) {
      this.showLoader = false;
      const localUserId = localStorage.getItem('userId') || '1';
      // Ensure SplitzService state is updated for downstream components
      this.spltizService.setUserId(Number(localUserId));
      this.userIdNumber = Number(localUserId);
      // no token for local development
      try { this.spltizService.setToken(''); } catch {}
      this.userId = localUserId;
      this.token = '';
      this.router.navigate(['/dashboard']);
      return;
    }

    if (this.userId && this.token) {
      this.showLoader = false;
      this.router.navigate(['/dashboard']);
      return;
    }

  }

  isLocalhost(): boolean {
    try {
      const host = window?.location?.hostname || '';
      return host === 'localhost' || host === '127.0.0.1' || host === '::1';
    } catch {
      return false;
    }
  }

  openModal(type: 'expense' | 'settle') {
    this.modalType = type;
    
    if (type === 'expense') {
      // Fetch all groups for the expense modal
      this.spltizService.onFetchDashboardData().subscribe((data: any) => {
        this.allGroups = data.groupWiseSummary || [];
        if (this.allGroups.length > 0) {
          // Select the first group by default
          this.openAddExpenseModal(this.allGroups[0].groupId);
        } else {
          alert('No groups available. Please create a group first.');
        }
      });
    } else {
      this.isModalOpen = true;
    }
  }

  openAddExpenseModal(groupId: number): void {
    this.selectedGroupId = groupId;
    // Fetch group members for the selected group
    this.spltizService.onFetchGroupData(groupId).subscribe((data: any) => {
      console.log('Group data:', data);
      this.selectedGroupMembers = data.members || [];
      this.showExpenseModal = true;
    });
  }

  closeExpenseModal(): void {
    this.showExpenseModal = false;
    this.selectedGroupId = null;
    this.selectedGroupMembers = [];
  }

  onExpenseSaved(expense: any): void {
    console.log('Saving expense:', expense);
    this.spltizService.onSaveExpense(expense).subscribe({
      next: (response: any) => {
        console.log('Expense saved successfully:', response);
        this.closeExpenseModal();
        // Show success message
        alert('Expense added successfully!');
      },
      error: (error: any) => {
        console.error('Error saving expense:', error);
        alert('Failed to add expense. Please try again.');
      }
    });
  }

  navigateToDashboard() {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.router.navigate(['/dashboard']);
    }
  }

  navigateToRecentActivity() {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.router.navigate(['/recent-activity']);
    }
  }
  logout() {
    this.spltizService.logout();
    this.router.navigate(['/login']);
  }
}
