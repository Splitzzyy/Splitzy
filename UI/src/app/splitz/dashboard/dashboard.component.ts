import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router'; // <-- Import ActivatedRoute
import { SplitzService } from '../splitz.service';
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
    RouterModule
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

  constructor(
    private router: Router,
    private route: ActivatedRoute, // <-- Inject ActivatedRoute
    private splitzService: SplitzService
  ) { }

  ngOnInit(): void {
    this.onloadDashboardData();
  }

  onloadDashboardData() {
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
