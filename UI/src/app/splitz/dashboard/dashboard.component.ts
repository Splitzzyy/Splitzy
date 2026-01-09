import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router'; // <-- Import ActivatedRoute
import { SplitzService } from '../splitz.service';
import { ExpenseModalComponent } from './expense-modal/expense-modal.component';
import { GroupModalComponent } from './group-modal/group-modal.component';
import { LoaderComponent } from '../loader/loader.component';

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
    LoaderComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
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
    private splitzService: SplitzService
  ) { }

  ngOnInit(): void {
    this.onloadDashboardData();
  }

  onloadDashboardData() {
    this.userEmail = localStorage.getItem('userEmail') ?? '';
    this.splitzService.onFetchDashboardData().subscribe((data: any) => {
      console.log(data);
      this.userName = data.userName;
      this.totalBalance = data.totalBalance;
      this.youOwe = data.youOwe;
      this.youAreOwed = data.youAreOwed;
      this.oweTo = data.oweTo;
      this.owedFrom = data.owedFrom;
      this.groups = data.groupWiseSummary;
      this.userId = data.userId;
      this.showLoader = false;
    });
  }

  openAddExpenseModal(groupId: number): void {
    this.selectedGroupId = groupId;
    // Fetch group members for the selected group
    this.splitzService.onFetchGroupData(groupId).subscribe((data: any) => {
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
    this.splitzService.onSaveExpense(expense).subscribe({
      next: (response: any) => {
        console.log('Expense saved successfully:', response);
        // Reload dashboard data to reflect the new expense
        this.onloadDashboardData();
        this.closeExpenseModal();
        // Show success message (you can add a toast notification here)
        alert('Expense added successfully!');
      },
      error: (error: any) => {
        console.error('Error saving expense:', error);
        alert('Failed to add expense. Please try again.');
      }
    });
  }

  openCreateGroupModal(): void {
    this.showGroupModal = true;
  }

  closeGroupModal(): void {
    this.showGroupModal = false;
  }

  onGroupSaved(group: any): void {
    console.log('Creating group:', group);
    this.splitzService.onCreateGroup(group).subscribe({
      next: (response: any) => {
        console.log('Group created successfully:', response);
        this.closeGroupModal();
        alert('Group created successfully!');
        // Reload dashboard data to show new group
        this.onloadDashboardData();
      },
      error: (error: any) => {
        console.error('Error creating group:', error);
        alert('Failed to create group. Please try again.');
      }
    });
  }

  navigateToGroup(groupId: number): void {
    this.router.navigate(['/group', this.userId, groupId]);
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
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
