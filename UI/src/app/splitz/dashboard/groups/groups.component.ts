import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { SplitzService } from '../../splitz.service';
import { firstValueFrom } from 'rxjs';
import { ExpenseModalComponent } from '../expense-modal/expense-modal.component';
import { SettleupComponent } from '../settleup/settleup.component';
import { AddMemberModalComponent } from '../add-member-modal/add-member-modal.component';
import { LoaderComponent } from '../../loader/loader.component';

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
    LoaderComponent
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private splitzService: SplitzService
  ) {}

  ngOnInit(): void {
    this.getDataFromRouteParams();
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
        createdDate: data.created
      };
      this.expenses = data.expenses || [];
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
        this.splitzService.show('Expense Added Successfully!', 'success');
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
        console.error('Error settling up expense:', error);
      }
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
}