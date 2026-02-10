import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-mobile-dashboard',
  imports: [
    CurrencyPipe,
    RouterModule,
    CommonModule
  ],
  templateUrl: './mobile-dashboard.component.html',
  styleUrl: './mobile-dashboard.component.css',
})
export class MobileDashboardComponent{

  @Input() userName: string = '';
  @Input() totalBalance: number = 0;
  @Input() youOwe: number = 0;
  @Input() youAreOwed: number = 0;
  @Input() groups: any[] = [];
  @Input() oweTo: any[] = [];
  @Input() owedFrom: any[] = [];
  @Input() userId: number | null = null;
  @Input() userEmail!: string;

  @Output() createGroup = new EventEmitter<void>();
  @Output() addExpense = new EventEmitter<number>();
  @Output() settleUp = new EventEmitter<void>();
  @Output() viewAllGroups = new EventEmitter<void>();
  @Output() openMenuEvent = new EventEmitter<void>();
  @Output() sendReminder = new EventEmitter<any>();

  showDebtsModal = false;
  debtsType: 'owe' | 'owed' = 'owe';

  get displayGroups() {
    return this.groups.slice(0, 2);
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getGroupStatus(balance: number): string {
    if (balance > 0) return 'You are owed';
    if (balance < 0) return 'You owe';
    return 'Settled up';
  }

  navigateToDebts(type: 'owe' | 'owed') {
    this.debtsType = type;
    this.showDebtsModal = true;
  }

  closeDebtsModal() {
    this.showDebtsModal = false;
  }
  formatTotalBalance(totalBalance: number): number {
  return Math.abs(totalBalance);
}
}
