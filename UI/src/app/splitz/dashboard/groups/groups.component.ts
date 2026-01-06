import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { SplitzService } from '../../splitz.service';
import { firstValueFrom } from 'rxjs';
import { ExpenseModalComponent } from '../expense-modal/expense-modal.component';
import { SettleupComponent } from '../settleup/settleup.component';

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
    SettleupComponent
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private splitzService: SplitzService
  ) {}

  ngOnInit(): void {
    this.getDataFromRouteParams();
  }

  // Method 3: Getting data from route parameters (ID only)
  private getDataFromRouteParams(): void {
    this.route.params.subscribe(params => {
      this.userId = params['userId'];
      this.groupId = +params['groupId']; // Convert string to number
      console.log('Group ID from route:', this.groupId);
      
      // If no data from state/query, fetch from service/API
      if (!this.groupData) {
        this.fetchGroupData(this.groupId);
      }
    });
  }

  // Method 4: Fetch data from service/API if not available
  private async fetchGroupData(groupId: number): Promise<void> {
    try {
      const data: any = await firstValueFrom(this.splitzService.onFetchGroupData(groupId));
      console.log(data);
      this.groupData = {
        id: data.groupId,
        name: data.name,
        balance: data.groupBalance ?? 0,
        description: '',
        memberCount: data.membersCount,
        createdDate: data.created
      };
      this.expenses = data.expenses || [];
      this.members = data.members || [];
      this.balanceSummary = data.userSummaries || [];
      console.log('Group data fetched:', this.groupData);
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

  // Add expense functionality
  addExpense(): void {
    if (this.groupData) {
      this.router.navigate(['/group', this.groupData.id, 'add-expense']);
    }
  }

  // Add member functionality
  addMember(): void {
    if (this.groupData) {
      this.router.navigate(['/group', this.groupData.id, 'add-member']);
    }
  }

  openExpenseModal() {
    this.showExpenseModal = true;
  }

  openSettleModal() {
    this.showSettleModal = true;
  }

  handleExpenseSave(expense: any) {
    console.log('New expense:', expense)
    this.showExpenseModal = false;
    this.splitzService.onSaveExpense(expense).subscribe({
      next: (response) => {
        console.log('Expense saved successfully:', response);
        // Optionally, refresh the group data or show a success message
        this.fetchGroupData(this.groupId);
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
          console.log('Settle up successful:', response);

          // close modal only on success
          this.showSettleModal = false;

          // refresh group/dashboard data
          this.fetchGroupData(this.groupId);
        } else {
          // business failure (still HTTP 200)
          console.error('Settle up failed:', response?.message);
        }
      },
      error: (error) => {
        // HTTP or unexpected error
        console.error('Error settling up expense:', error);
      }
    });
  }
}