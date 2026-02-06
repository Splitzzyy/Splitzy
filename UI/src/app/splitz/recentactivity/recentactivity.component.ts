import { Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SplitzService } from '../services/splitz.service';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LoaderComponent } from '../loader/loader.component';

interface ActivityItem {
  actor: string;
  action: string;
  expenseName: string;
  groupName: string;
  createdAt: string;
  impact: {
    type: 'get_back' | 'owe' | 'info';
    amount: number;
  };
}
@Component({
  selector: 'app-recentactivity',
  imports: [CommonModule, FormsModule, LoaderComponent],
  templateUrl: './recentactivity.component.html',
  styleUrl: './recentactivity.component.css'
})
export class RecentactivityComponent implements OnInit {
  activityData: ActivityItem[] = [];
  userId: number | null = null;
  showLoader: boolean = true;
  constructor(public splitzService: SplitzService, private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.getDataFromRouteParam();
  }
  private getDataFromRouteParam(): void {
      this.loadActivityData();

  }
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  }
  trackByIndex(index: number, item: ActivityItem): number {
    return index;
  }

  async loadActivityData(): Promise<any> {
    try {
      this.activityData = await firstValueFrom(this.splitzService.getRecentActivity());
      this.showLoader = false;
    } catch (error) {
      console.error('Error loading activity data:', error);
    }
  }
}
