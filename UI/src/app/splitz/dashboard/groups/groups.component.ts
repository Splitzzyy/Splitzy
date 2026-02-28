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

export interface MonthlyChartData {
  month: string;
  shortMonth: string;
  amount: number;
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

  // Chart state
  chartData: MonthlyChartData[] = [];
  chartMaxAmount: number = 1;
  chartSelectedMonth: MonthlyChartData | null = null;
  chartHoveredMonth: string | null = null;
  chartGridLines: number[] = [];
  chartTotalAmount: number = 0;
  chartYear: number = new Date().getFullYear();
  Math = Math;

  private readonly CHART_BAR_HEIGHT = 150;

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

      this.buildChartData();
    } catch (error) {
      console.error('Error fetching group data:', error);
      this.groupData = null;
    }
  }

  // ===================== CHART LOGIC =====================
  private buildChartData(): void {
    const monthNames = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
    const shortNames = ['Jan','Feb','Mar','Apr','May','Jun',
                        'Jul','Aug','Sep','Oct','Nov','Dec'];

    const now = new Date();
    this.chartYear = now.getFullYear();

    const monthMap = new Map<number, number>();
    for (let i = 0; i < 12; i++) monthMap.set(i, 0);

    this.expenses.forEach(expense => {
      const date = new Date(expense.createdAt + 'Z');
      const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      if (istDate.getFullYear() === this.chartYear) {
        const m = istDate.getMonth();
        monthMap.set(m, (monthMap.get(m) || 0) + expense.amount);
      }
    });

    this.chartData = Array.from(monthMap.entries()).map(([idx, amount]) => ({
      month: monthNames[idx],
      shortMonth: shortNames[idx],
      amount
    }));

    this.chartMaxAmount = Math.max(...this.chartData.map(d => d.amount), 1);
    this.chartTotalAmount = this.chartData.reduce((sum, d) => sum + d.amount, 0);

    this.chartGridLines = [
      this.chartMaxAmount,
      this.chartMaxAmount * 0.75,
      this.chartMaxAmount * 0.5,
      this.chartMaxAmount * 0.25
    ];

    const currentMonthName = monthNames[now.getMonth()];
    this.chartSelectedMonth = this.chartData.find(d => d.month === currentMonthName) || null;
  }

  getBarHeight(amount: number): number {
    if (this.chartMaxAmount === 0) return 0;
    return Math.max((amount / this.chartMaxAmount) * this.CHART_BAR_HEIGHT, amount > 0 ? 4 : 0);
  }

  selectChartMonth(data: MonthlyChartData): void {
    this.chartSelectedMonth = this.chartSelectedMonth?.month === data.month ? null : data;
  }

  getChartMonthChange(): number | null {
    if (!this.chartSelectedMonth) return null;
    const idx = this.chartData.findIndex(d => d.month === this.chartSelectedMonth!.month);
    if (idx <= 0) return null;
    const prev = this.chartData[idx - 1].amount;
    if (prev === 0) return null;
    return Math.round(((this.chartSelectedMonth.amount - prev) / prev) * 100);
  }

  formatYAxisLabel(value: number): string {
    if (value >= 100000) return (value / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    if (value >= 1000) return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return Math.round(value).toString();
  }

  getPeakMonth(): string {
    if (this.chartTotalAmount === 0) return '—';
    const peak = this.chartData.find(d => d.amount === this.chartMaxAmount);
    return peak?.shortMonth || '—';
  }

  getPrevMonthShortName(): string {
    if (!this.chartSelectedMonth) return '';
    const idx = this.chartData.findIndex(d => d.month === this.chartSelectedMonth!.month);
    if (idx <= 0) return '';
    return this.chartData[idx - 1]?.shortMonth || '';
  }
  // ===================== END CHART LOGIC =====================

  goBack(): void { this.location.back(); }

  navigateToExpenses(): void {
    if (this.groupData) this.router.navigate(['/group', this.groupData.id, 'expenses']);
  }

  navigateToMembers(): void {
    if (this.groupData) this.router.navigate(['/group', this.groupData.id, 'members']);
  }

  setActiveTab(tab: string): void { this.activeTab = tab; }

  openExpenseModal() { this.addOrEdit = 'Add'; this.showExpenseModal = true; }
  openSettleModal() { this.showSettleModal = true; }
  openAddMemberModal() { this.errorMessage = ''; this.showAddMemberModal = true; }

  handleExpenseSave(expense: any) {
    this.showExpenseModal = false;
    this.splitzService.onSaveExpense(expense).subscribe({
      next: () => {
        this.fetchGroupData(this.groupId);
        if (navigator.onLine) {
          this.splitzService.show('Expense Added Successfully!', 'success');
        } else {
          this.splitzService.show('Expense saved offline. Will sync automatically.', 'info');
        }
      },
      error: (error) => console.error('Error saving expense:', error)
    });
  }

  handleExpenseEdit(expense: any) {
    this.showExpenseModal = false;
    this.splitzService.onUpdateExpense(expense).subscribe({
      next: () => {
        this.splitzService.show('Expense Updated Successfully!', 'success');
        this.fetchGroupData(this.groupId);
      },
      error: (error) => {
        this.splitzService.show(error.error, 'error');
        console.error('Error updating expense', error.error);
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
          this.splitzService.show(`Settle up failed: ${response?.message}`, 'error');
        }
      },
      error: (error) => {
        this.splitzService.show(error.error || 'Settle Up Failed', 'error');
      }
    });
  }

  onAddMembers(members: any) {
    this.splitzService.onAddMemeber(members).subscribe({
      next: (response: any) => {
        if (response) this.splitzService.show('Member Added Successfully', 'success');
        this.showAddMemberModal = false;
      },
      error: (error) => {
        this.splitzService.show(`Add members failed: ${error?.error}`, 'error');
        this.errorMessage = error.error;
      }
    });
  }

  openDeleteGroupModal(): void {
    this.confirmModalConfig = {
      title: 'Delete Group',
      message: `Are you sure you want to delete <strong>${this.groupData?.name}</strong>?<br>This action cannot be undone.`,
      confirmText: 'Delete', cancelText: 'Cancel', isDanger: true
    };
    this.pendingDeleteAction = () => this.deleteGroup();
    this.showConfirmModal = true;
  }

  private deleteGroup(): void {
    this.splitzService.onDeleteGroup(this.groupId).subscribe({
      next: () => {
        this.splitzService.show('Group deleted successfully', 'success');
        this.showConfirmModal = false;
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.splitzService.show(error?.error?.message || 'Failed to delete group', 'error');
      }
    });
  }

  openDeleteExpenseModal(expenseId: number, expenseName: string): void {
    this.confirmModalConfig = {
      title: 'Delete Expense',
      message: `Are you sure you want to delete <strong>"${expenseName}"</strong> expense?<br>This action cannot be undone.`,
      confirmText: 'Delete', cancelText: 'Cancel', isDanger: true
    };
    this.pendingDeleteAction = () => this.deleteExpense(expenseId);
    this.showConfirmModal = true;
  }

  openEditExpenseModal(expenseId: number) {
    this.addOrEdit = 'Edit';
    this.showExpenseModal = true;
    this.expenseId = expenseId;
  }

  private deleteExpense(expenseId: number): void {
    this.splitzService.onDeleteExpense(expenseId).subscribe({
      next: () => {
        this.splitzService.show('Expense deleted successfully', 'success');
        this.showConfirmModal = false;
        this.expandedExpenseMenu = null;
        this.fetchGroupData(this.groupId);
      },
      error: () => this.splitzService.show('Failed to delete expense', 'error')
    });
  }

  onConfirmDelete(): void { this.pendingDeleteAction(); }
  onCancelDelete(): void { this.showConfirmModal = false; }

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
      if (totalOrMonthly === 'total') { totalAmount += expense.amount; return; }
      const expenseDate = new Date(expense.createdAt + 'Z');
      const expenseIST = new Date(expenseDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      if (expenseIST.getMonth() === currentMonth && expenseIST.getFullYear() === currentYear) {
        totalAmount += expense.amount;
      }
    });

    return totalAmount;
  }

  closeExpenseModal(): void { this.showExpenseModal = false; this.addOrEdit = null; }

  toggleExpenseOverview(expenseId: number, event: Event): void {
    event.stopPropagation();
    if (this.expandedExpenseOverview === expenseId) {
      this.expandedExpenseOverview = null;
    } else {
      this.expandedExpenseOverview = expenseId;
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
            this.splitzService.show(error.error, 'error');
            this.expandedExpenseOverview = null;
          }
        });
      }
    }
  }

  getExpenseSplits(expenseId: number): any[] {
    return this.expenseDetailsCache.get(expenseId)?.splits || [];
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
      const istDateStr = new Date(activity.createdAt + 'Z')
        .toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      if (!grouped.has(istDateStr)) grouped.set(istDateStr, []);
      grouped.get(istDateStr)!.push(activity);
    });

    return Array.from(grouped.entries())
      .map(([date, activities]) => ({ date, displayDate: this.formatGroupDate(date), activities }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  formatGroupDate(dateString: string): string {
    const [year, month, day] = dateString.split('-').map(Number);
    const dateIST = new Date(year, month - 1, day);
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayMidnight = new Date(todayMidnight);
    yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);

    if (dateIST.getTime() === todayMidnight.getTime()) return 'Today';
    if (dateIST.getTime() === yesterdayMidnight.getTime()) return 'Yesterday';

    return dateIST.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  exportToExcel(): void {
    if (!this.groupData || !this.expenses?.length) {
      this.splitzService.show('No expenses to export', 'info');
      return;
    }
    const headers = ['Date', 'Expense Name', 'Amount', 'Paid By', 'You Owe', 'You Lent'];
    const rows = this.expenses.map(expense => {
      const date = new Date(expense.createdAt + 'Z').toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      const name = `"${(expense.name || '').replace(/"/g, '""')}"`;
      const paidBy = `"${(expense.paidBy || '').replace(/"/g, '""')}"`;
      return [date, name, expense.amount, paidBy, expense.youOwe, expense.youLent].join(',');
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