import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SplitzService } from '../services/splitz.service';
import { LoaderComponent } from '../loader/loader.component';
import { GroupModalComponent } from '../../splitz/dashboard/group-modal/group-modal.component';
import { ExpenseModalComponent } from '../dashboard/expense-modal/expense-modal.component';

export interface Group {
  groupId: number;
  groupName: number;
  netBalance: number;
}

@Component({
  selector: 'app-all-groups',
  imports: [
    CommonModule,
    RouterModule,
    CurrencyPipe,
    LoaderComponent,
    GroupModalComponent,
  ],
  templateUrl: './all-groups.component.html',
  styleUrl: './all-groups.component.css'
})
export class AllGroupsComponent implements OnInit {
  public groups: Group[] = [];
  public userId: number | null = null;
  public showLoader: boolean = true;
  public showGroupModal: boolean = false;


  constructor(
    private splitzService: SplitzService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadAllGroups();
  }

  loadAllGroups(): void {
    this.splitzService.onFetchDashboardData().subscribe((data: any) => {
      this.groups = data.groupWiseSummary;
      this.userId = data.userId;
      this.showLoader = false;
    });
  }

  getGroupStatus(balance: number): string {
    if (balance > 0) return 'You are owed';
    if (balance < 0) return 'You owe';
    return 'Settled up';
  }

  getStatusColor(balance: number): string {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-600';
  }

  getStatusBackground(balance: number): string {
    if (balance > 0) return 'bg-green-50 border-green-200';
    if (balance < 0) return 'bg-red-50 border-red-200';
    return 'bg-gray-50 border-gray-200';
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
      },
      error: (error: any) => {
        console.error('Error creating group:', error);
        this.splitzService.show('Failed to create group. Please try again.', 'error');
      }
    });
  }
}
