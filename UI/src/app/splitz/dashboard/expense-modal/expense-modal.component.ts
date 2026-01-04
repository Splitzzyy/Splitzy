import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SplitMember {
  id: number;
  name: string;
  amount: number;
  isSelected: boolean;
  avatarLetter: string;
}

@Component({
  selector: 'app-expense-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-modal.component.html',
  styleUrls: ['./expense-modal.component.css']
})
export class ExpenseModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();
  @Input() groupId!: number;
  @Input() members: any[] = [];
  @Input() currentUserId!: number;

  amount: number = 0;
  description: string = '';
  paidBy: number | null = null;
  splitMembers: SplitMember[] = [];
  selectAllChecked: boolean = false;

  ngOnInit() {
    // Initialize members with avatar letters
    this.splitMembers = this.members.map(member => ({
      name: member.memberName || member.name || 'Unknown',
      avatarLetter: (member.memberName || member.name || 'Unknown').charAt(0).toUpperCase(),
      isSelected: false,
      id: member.memberId || member.id,
      amount: 0
    }));
    // Set current user as paidBy by default
    if (this.currentUserId) {
      this.paidBy = this.currentUserId;
    }
  }

  getSplitAmount(member: SplitMember): number {
    const selectedMembers = this.splitMembers.filter(m => m.isSelected).length;
    return member.isSelected && selectedMembers > 0 ? parseFloat(((this.amount / selectedMembers).toFixed(2))) : 0;
  }

  toggleSelectAll() {
    this.selectAllChecked = !this.selectAllChecked;
    this.splitMembers.forEach(member => {
      member.isSelected = this.selectAllChecked;
    });
  }

  onMemberToggle() {
    const allSelected = this.splitMembers.every(m => m.isSelected);
    const noneSelected = this.splitMembers.every(m => !m.isSelected);
    this.selectAllChecked = allSelected;
  }

  isValid(): boolean {
    return this.amount > 0 &&
      this.description.trim() !== '' &&
      this.paidBy !== null &&
      this.splitMembers.some(m => m.isSelected);
  }

  saveExpense() {
    if (!this.isValid()) {
      return;
    }

    const expense = {
      groupId: this.groupId,
      amount: this.amount,
      name: this.description,
      paidByUserId: this.paidBy,
      splitDetails: this.splitMembers
        .filter(m => m.isSelected)
        .map(m => ({
          userId: m.id,
          amount: this.getSplitAmount(m)
        }))
    };

    console.log('Saving expense:', expense);
    this.save.emit(expense);
    this.closeModal();
  }

  closeModal() {
    this.close.emit();
  }
}
