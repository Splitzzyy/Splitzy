import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { SplitzService } from '../../services/splitz.service';
import { firstValueFrom } from 'rxjs';
import { ExpenseModalComponent } from '../expense-modal/expense-modal.component';
import { SettleupComponent } from '../settleup/settleup.component';
import { AddMemberModalComponent } from '../add-member-modal/add-member-modal.component';
import { LoaderComponent } from '../../loader/loader.component';
import { ConfirmationModalComponent } from '../confirmation-modal/confirmation-modal.component';

export interface Group {
  id: number;
  name: string;
  balance: number;
  description?: string;
  memberCount?: number;
  createdDate?: Date;
}

@Component({
  selector: 'app-groups',
  imports: [
    CommonModule,
    ExpenseModalComponent,
    SettleupComponent,
    AddMemberModalComponent,
    LoaderComponent,
    ConfirmationModalComponent
  ],
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.css']
})
export class GroupsComponent implements OnInit {
  groupId: number = 0;
  groupData: Group | null = null;
  activeTab: string = 'expenses'; // Default active tab
  userId: any;
  expenses: any[] = [];
  members: any[] = [];
  balanceSummary: any[] = [];
  showExpenseModal: boolean = false;
  showSettleModal: boolean = false;
  showAddMemberModal: boolean = false;
  errorMessage: string = '';
  showConfirmModal: boolean = false;
  confirmModalConfig: any = {};
  pendingDeleteAction: () => void = () => {};
  expandedExpenseMenu: number | null = null;
  userName: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    public splitzService: SplitzService
  ) {}

  ngOnInit(): void {
    this.getDataFromRouteParams();
    this.userName = localStorage.getItem('userName');
  }

  private getDataFromRouteParams(): void {
    this.route.params.subscribe(params => {
      this.userId = params['userId'];
      this.groupId = +params['groupId'];
      
      if (!this.groupData) {
        this.fetchGroupData(this.groupId);
      }
    });
  }

  // Method 4: Fetch data from service/API if not available
  private async fetchGroupData(groupId: number): Promise<void> {
    try {
      const data: any = await firstValueFrom(this.splitzService.onFetchGroupData(groupId));
      this.groupData = {
        id: data.groupId,
        name: data.name,
        balance: data.groupBalance ?? 0,
        description: '',
        memberCount: data.membersCount,
        createdDate: data.createdAt
      };
      this.expenses = data.expenses.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];
      this.members = data.members || [];
      this.balanceSummary = data.userSummaries || [];
    } catch (error) {
      console.error('Error fetching group data:', error);
      this.groupData = null;
    }
  }

  // Navigation helper methods
  goBack(): void {
    this.location.back();
  }

  navigateToExpenses(): void {
    if (this.groupData) {
      this.router.navigate(['/group', this.groupData.id, 'expenses']);
    }
  }

  navigateToMembers(): void {
    if (this.groupData) {
      this.router.navigate(['/group', this.groupData.id, 'members']);
    }
  }

  // Tab management
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  openExpenseModal() {
    this.showExpenseModal = true;
  }

  openSettleModal() {
    this.showSettleModal = true;
  }

  openAddMemberModal() {
    this.errorMessage = '';
    this.showAddMemberModal = true;
  }

  handleExpenseSave(expense: any) {
    this.showExpenseModal = false;
    this.splitzService.onSaveExpense(expense).subscribe({
      next: (response) => {
        this.fetchGroupData(this.groupId);
        if (navigator.onLine) {
          this.splitzService.show('Expense Added Successfully!', 'success');
        } else {
          this.splitzService.show('Expense saved offline. Will sync automatically.', 'info');
        }
      },
      error: (error) => {
        console.error('Error saving expense:', error);
      }
    });
  }
  onSettleUpSaved(expense: any) {
    this.splitzService.onSettleExpense(expense).subscribe({
      next: (response: any) => {
        if (response?.success) {
          this.splitzService.show('Settle up successful', 'success');
          this.showSettleModal = false;
          this.fetchGroupData(this.groupId);
        } else {
          console.error('Settle up failed:', response?.message);
          this.splitzService.show(`Settle up failed: ${response?.message}`, 'success');
        }
      },
      error: (error) => {
        // HTTP or unexpected error
        const errorMessage = error.error || 'Settle Up Failed';
        this.splitzService.show(errorMessage, 'error');
        console.error('Error settling up expense:', error);
      },
    });
  }
  onAddMembers(memebers: any) {
    this.splitzService.onAddMemeber(memebers).subscribe({
      next: (response: any) => {
        if (response) {
          this.splitzService.show('Memeber Added Successfully', 'success');
        }
        this.showAddMemberModal = false;
      }, error: (error) => {
        console.error("Add members failed", error);
        this.splitzService.show(`Add members failed: ${error?.error}`, 'success');
        this.errorMessage = error.error;
      }
    })
  }

  // Delete Group functionality
  openDeleteGroupModal(): void {
    this.confirmModalConfig = {
      title: 'Delete Group',
      message: `Are you sure you want to delete <strong>${this.groupData?.name}</strong>?<br>This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDanger: true
    };
    this.pendingDeleteAction = () => this.deleteGroup();
    this.showConfirmModal = true;
  }

  private deleteGroup(): void {
    this.splitzService.onDeleteGroup(this.groupId).subscribe({
      next: (response: any) => {
        this.splitzService.show('Group deleted successfully', 'success');
        this.showConfirmModal = false;
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Error deleting group:', error);
        const errorMessage = error?.error?.message || 'Failed to delete group';
        this.splitzService.show(errorMessage, 'error');
      }
    });
  }

  // Delete Expense functionality
  openDeleteExpenseModal(expenseId: number, expenseName: string): void {
    this.confirmModalConfig = {
      title: 'Delete Expense',
      message: `Are you sure you want to delete <strong>"${expenseName}"</strong> expense?<br> This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDanger: true
    };
    this.pendingDeleteAction = () => this.deleteExpense(expenseId);
    this.showConfirmModal = true;
  }

  private deleteExpense(expenseId: number): void {
    this.splitzService.onDeleteExpense(expenseId).subscribe({
      next: (response: any) => {
        this.splitzService.show('Expense deleted successfully', 'success');
        this.showConfirmModal = false;
        this.expandedExpenseMenu = null;
        this.fetchGroupData(this.groupId);
      },
      error: (error) => {
        console.error('Error deleting expense:', error);
        this.splitzService.show('Failed to delete expense', 'error');
      }
    });
  }

  onConfirmDelete(): void {
    this.pendingDeleteAction();
  }

  onCancelDelete(): void {
    this.showConfirmModal = false;
  }

  toggleExpenseMenu(expenseId: number): void {
    this.expandedExpenseMenu = this.expandedExpenseMenu === expenseId ? null : expenseId;
  }

  closeExpenseMenu(): void {
    this.expandedExpenseMenu = null;
  }

  formatName(fullName: string): string {
    if (!fullName) return '';
    if (fullName === this.userName) return 'You';
    const parts = fullName.split(' ');
    return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : fullName;
  }
  getTotalBalance(totalOrMonthly: string): number {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let totalAmount = 0.0;
    this.expenses.forEach((expense: any) => {
      if (totalOrMonthly === 'total') return totalAmount += expense.amount;
      
      const expenseDate = new Date(expense.createdAt);
      if (expenseDate.getMonth() === currentMonth &&
        expenseDate.getFullYear() === currentYear) {
        totalAmount += expense.amount;
      }
    });
    return totalAmount;
  }
}