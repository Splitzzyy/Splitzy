import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router'; // <-- Import ActivatedRoute
import { SplitzService } from '../services/splitz.service';
import { ExpenseModalComponent } from './expense-modal/expense-modal.component';
import { GroupModalComponent } from './group-modal/group-modal.component';
import { LoaderComponent } from '../loader/loader.component';
import { MobileDashboardComponent } from '../mobile-dashboard/mobile-dashboard.component';
import { TokenRefreshService } from '../services/token-refresh.service';
import { ReminderRequest } from '../splitz.model';

export interface Group {
  groupId: number;
  groupName: string;
  netBalance: number;
}
export interface OwedFrom {
  name: string;
  amount: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    ExpenseModalComponent,
    GroupModalComponent,
    LoaderComponent,
    MobileDashboardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  public userName: string = '';
  public totalBalance: number = 0;
  public youOwe: number = 0;
  public youAreOwed: number = 0;
  public oweTo: any[] = [];
  public owedFrom: OwedFrom[] = [];
  public groups: Group[] = [];
  public userId: number | null = null;
  public showExpenseModal: boolean = false;
  public selectedGroupId: number | null = null;
  public selectedGroupMembers: any[] = [];
  public showGroupModal: boolean = false;
  public showLoader: boolean = true;
  public userEmail: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private splitzService: SplitzService,
  ) {}

  ngOnInit(): void {
    this.onloadDashboardData();
  }

  onloadDashboardData() {
    this.userEmail = localStorage.getItem('userEmail') ?? '';
    this.splitzService.onFetchDashboardData().subscribe({
      next: (data) => {
        this.userName = data.userName;
        this.totalBalance = data.totalBalance;
        this.youOwe = data.youOwe;
        this.youAreOwed = data.youAreOwed;
        this.oweTo = data.oweTo;
        this.owedFrom = data.owedFrom;
        this.groups = data.groupWiseSummary;
        this.userId = data.userId;
        this.showLoader = false;
      },
    });
  }

  openAddExpenseModal(groupId: number): void {
    this.selectedGroupId = groupId;
    this.splitzService.onFetchGroupData(groupId).subscribe((data: any) => {
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
    this.splitzService.onSaveExpense(expense).subscribe({
      next: (response: any) => {
        this.onloadDashboardData();
        this.closeExpenseModal();
        if (navigator.onLine) {
          this.splitzService.show('Expense Added Successfully!', 'success');
        } else {
          this.splitzService.show(
            'Expense saved offline. Will sync automatically.',
            'info',
          );
        }
      },
      error: (error: any) => {
        console.error('Error saving expense:', error);
        this.splitzService.show(
          'Failed to add expense. Please try again.',
          'error',
        );
      },
    });
  }

  openCreateGroupModal(): void {
    this.showGroupModal = true;
  }

  closeGroupModal(): void {
    this.showGroupModal = false;
  }

  onGroupSaved(group: any): void {
    this.splitzService.onCreateGroup(group).subscribe({
      next: (response: any) => {
        this.closeGroupModal();
        this.splitzService.show('Group created successfully!', 'success');
        this.onloadDashboardData();
      },
      error: (error: any) => {
        console.error('Error creating group:', error);
        this.splitzService.show(
          'Failed to create group. Please try again.',
          'error',
        );
      },
    });
  }

  sendReminder(groupId: number, owedUserId: number, amount: number) {
    const currentUserId = Number(this.userId);

    const reminderRequest: ReminderRequest = {
      groupId: groupId,
      owedUserId: owedUserId,
      owedToUserId: currentUserId,
      amount: amount,
    };

    this.splitzService.sendReminder(reminderRequest).subscribe({
      next: (response) => {
        if (response.success) {
          this.splitzService.show(
            `Reminder sent successfully! Amount: ₹${response.amount}`,
            'success',
          );
        } else {
          this.splitzService.show(
            response.message || 'Failed to send reminder',
            'error',
          );
        }
      },
      error: (error) => {
        console.error('Error sending reminder:', error);
        this.splitzService.show(
          'Failed to send reminder. Please try again.',
          'error',
        );
      },
    });
  }

  navigateToGroup(groupId: number): void {
    this.router.navigate(['/group', this.userId, groupId]);
  }

  navigateToAllGroups(): void {
    this.router.navigate(['/all-groups']);
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  getGroupStatus(netBalance: number): string {
    if (netBalance > 0) {
      return 'You are owed';
    } else if (netBalance < 0) {
      return 'You owe';
    } else {
      return 'Settled up';
    }
  }

  trackByPersonName(index: number, person: any): string {
    return person.name;
  }

  trackByGroupId(index: number, group: any): string {
    return group.groupId;
  }

  ngOnDestroy(): void {
    console.clear();
  }
}
