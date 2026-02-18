import { Component, OnInit, HostListener } from '@angular/core';
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
  expenseId: number | null = null;
  pendingDeleteAction: () => void = () => { };
  expandedExpenseMenu: number | null = null;
  userName: string | null = null;
  addOrEdit: 'Add' | 'Edit' | null = 'Add';
  expandedExpenseOverview: number | null = null;
  expenseDetailsCache: Map<number, any> = new Map();
  settlements: any[] = [];

  combinedActivities: any[] = [];
  showGroupMenu: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    public splitzService: SplitzService
  ) { }

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
      this.expenses = data.expenses || [];
      this.settlements = data.settlements || [];
      this.members = data.members || [];
      this.balanceSummary = data.userSummaries || [];

      // Combine expenses and settlements, then sort by date
      this.combinedActivities = [
        ...this.expenses.map((e: any) => ({ ...e, type: 'expense' })),
        ...this.settlements.map((s: any) => ({ ...s, type: 'settlement' }))
      ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
    this.addOrEdit = 'Add';
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
  handleExpenseEdit(expense: any) {
    this.showExpenseModal = false;
    this.splitzService.onUpdateExpense(expense).subscribe({
      next: (response: any) => {
        this.splitzService.show('Expense Updated Successfully!', 'success');
        this.fetchGroupData(this.groupId);
      }, error: (error) => {
        this.splitzService.show(error.error, 'error');
        console.error('Error updating expense', error.error);
      }
    })
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

  // Update Expense Functionality
  openEditExpenseModal(expenseId: number) {
    this.addOrEdit = 'Edit';
    this.showExpenseModal = true;
    this.expenseId = expenseId;
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
  closeExpenseModal(): void {
    this.showExpenseModal = false;
    this.addOrEdit = null;
  }
  toggleExpenseOverview(expenseId: number, event: Event): void {
    event.stopPropagation();

    if (this.expandedExpenseOverview === expenseId) {
      this.expandedExpenseOverview = null;
    } else {
      this.expandedExpenseOverview = expenseId;

      // Fetch expense details if not already cached
      if (!this.expenseDetailsCache.has(expenseId)) {
        this.splitzService.onGetExpenseDetails(expenseId).subscribe({
          next: (response) => {
            if (response.success) {
              this.expenseDetailsCache.set(expenseId, response.data);
            } else {
              this.splitzService.show(response.message, 'error');
              this.expandedExpenseOverview = null;
            }
          },
          error: (error) => {
            console.error('Error Getting Expense Detail', error);
            this.splitzService.show(error.error, 'error');
            this.expandedExpenseOverview = null;
          }
        });
      }
    }
  }
  getExpenseSplits(expenseId: number): any[] {
    const details = this.expenseDetailsCache.get(expenseId);
    return details?.splits || [];
  }
  closeExpenseMenu(): void {
    this.expandedExpenseMenu = null;
    this.expandedExpenseOverview = null;
  }

  toggleGroupMenu(event: Event): void {
    event.stopPropagation();
    this.showGroupMenu = !this.showGroupMenu;
  }

  // Close menus when clicking outside
  @HostListener('document:click')
  onDocumentClick() {
    this.showGroupMenu = false;
    this.expandedExpenseMenu = null;
  }

  getGroupedActivities(): { date: string, displayDate: string, activities: any[] }[] {
    const grouped = new Map<string, any[]>();

    this.combinedActivities.forEach(activity => {
      const date = new Date(activity.createdAt);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(activity);
    });

    // Convert to array and sort by date (newest first)
    return Array.from(grouped.entries())
      .map(([date, activities]) => ({
        date,
        displayDate: this.formatGroupDate(date),
        activities
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  formatGroupDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time parts for comparison
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      // Format as "Month DD, YYYY" (e.g., "February 12, 2026")
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }

  // Export to Excel / CSV
  exportToExcel(): void {
    if (!this.groupData || !this.expenses || this.expenses.length === 0) {
      if (this.splitzService) {
        this.splitzService.show('No expenses to export', 'info');
      }
      return;
    }

    // Define CSV headers
    const headers = ['Date', 'Expense Name', 'Amount', 'Paid By', 'You Owe', 'You Lent'];

    // Format data rows
    const rows = this.expenses.map(expense => {
      const date = new Date(expense.createdAt).toLocaleDateString();
      const name = `"${(expense.name || '').replace(/"/g, '""')}"`; // Escape quotes
      const amount = expense.amount;
      const paidBy = `"${(expense.paidBy || '').replace(/"/g, '""')}"`;
      const youOwe = expense.youOwe;
      const youLent = expense.youLent;

      return [date, name, amount, paidBy, youOwe, youLent].join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${this.groupData.name}_Expenses.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}