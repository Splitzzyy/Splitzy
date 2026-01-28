import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';

import { SplitzService } from '../../splitz/services/splitz.service';
import { LoaderComponent } from '../../splitz/loader/loader.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterModule,
    LoaderComponent
],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements OnInit {
  isModalOpen: boolean = false;
  modalType: 'expense' | 'settle' = 'expense';
  userId: string | null = null;
  userIdNumber: any = null;
  token: string | null = null;
  showLoader: boolean = true;
  showExpenseModal: boolean = false;
  selectedGroupId: number | null = null;
  selectedGroupMembers: any[] = [];
  allGroups: any[] = [];
  mobileMenuOpen: boolean = false;
  showSettleModal: boolean = false;
  showAddMenu = false;
  showProfileMenu = false;

  constructor(private router: Router, private splitzService: SplitzService) {
  }

  ngOnInit(): void {
    this.userId = localStorage.getItem('userId');
    if (this.userId) {
      this.userIdNumber = parseInt(this.userId, 10);
    }
    this.token = this.splitzService.getToken();
    this.checkAuthStatus();
  }
  checkAuthStatus() {
    // If bypassAuthOnLocalhost is enabled and running on localhost, bypass auth checks to ease local development and open dashboard.
    if (environment.bypassAuthOnLocalhost && this.isLocalhost()) {
      this.showLoader = false;
      const localUserId = localStorage.getItem('userId') || '1';
      // Ensure SplitzService state is updated for downstream components
      this.splitzService.setUserId(Number(localUserId));
      this.userIdNumber = Number(localUserId);
      // no token for local development
      try { this.splitzService.setToken(''); } catch { }
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
    this.closeMobileMenu();
    if (type === 'expense') {
      this.showLoader = true;
      // Fetch all groups for the expense modal
      this.splitzService.onFetchDashboardData().subscribe((data: any) => {
        this.allGroups = data.groupWiseSummary || [];
        if (this.allGroups.length > 0) {
          // Select the first group by default
          this.openAddExpenseModal(this.allGroups[0].groupId);
        } else {
          this.splitzService.show('No groups available. Please create a group first.', 'info');
        }
      });
    } else if (type === 'settle') {
      this.showSettleModal = true;
    }
    else {
      this.isModalOpen = true;
    }
  }

  openAddExpenseModal(groupId: number): void {
    this.selectedGroupId = groupId;
    // Fetch group members for the selected group
    this.splitzService.onFetchGroupData(groupId).subscribe((data: any) => {
      this.selectedGroupMembers = data.members || [];
      this.showLoader = false;
      this.showExpenseModal = true;
    });
  }

  closeExpenseModal(): void {
    this.showExpenseModal = false;
    this.selectedGroupId = null;
    this.selectedGroupMembers = [];
  }

  closeSettleModal() {
    this.showSettleModal = false;
  }

  onSettleUpSaved(settleData: any) {
    this.closeSettleModal();
  }

  onExpenseSaved(expense: any): void {
    this.showLoader = true;
    this.splitzService.onSaveExpense(expense).subscribe({
      next: (response: any) => {
        this.showLoader = false;
        this.closeExpenseModal();
        if (navigator.onLine) {
          this.splitzService.show('Expense Added Successfully!', 'success');
        } else {
          this.splitzService.show('Expense saved offline. Will sync automatically.', 'info');
        }
      },
      error: (error: any) => {
        console.error('Error saving expense:', error);
        this.splitzService.show('Failed to add expense. Please try again.', 'error')
      }
    });
  }

  navigateToRecentActivity() {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.router.navigate(['/recent-activity']);
    }
  }
  logout() {
    this.splitzService.logout();
  }
  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }
  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }
  openAddMenu() {
  this.showAddMenu = true;
}

closeAddMenu() {
  this.showAddMenu = false;
}

handleAddExpense() {
  this.closeAddMenu();
  // Navigate to add expense or open modal
  // You can emit an event or navigate based on your setup
  this.router.navigate(['/add-expense']);
  // OR if you handle it in dashboard:
  // Navigate to dashboard and trigger expense modal
}

handleSettleUp() {
  this.closeAddMenu();
  // Navigate or trigger settle up
  this.router.navigate(['/settle-up']);
}

handleCreateGroup() {
  this.closeAddMenu();
  // Navigate or trigger create group
  this.router.navigate(['/create-group']);
}

openProfileMenu() {
  this.showProfileMenu = true;
}

closeProfileMenu() {
  this.showProfileMenu = false;
}
}
