import { Component, EventEmitter, Input, Output } from '@angular/core';
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
export class ExpenseModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();
  @Input() groupId!: number;
  @Input() members: any[] = [];

  amount: number = 0;
  description: string = '';
  paidBy: string = '';

  ngOnInit() {
    // Initialize members with avatar letters
    this.members = this.members.map(member => ({
      name: member.memberName || 'Unknown',
      avatarLetter: member.memberName.charAt(0).toUpperCase(),
      isSelected: false,
      id: member.memberId,
    }));
  }

  getSplitAmount(member: SplitMember): number {
    const selectedMembers = this.members.filter(m => m.isSelected).length;
    return member.isSelected ? parseFloat(((this.amount / selectedMembers).toFixed(2))) : 0;
  }

  isValid(): boolean {
    return this.amount > 0 &&
      this.description.trim() !== '' &&
      this.paidBy !== null &&
      this.members.some(m => m.isSelected);
  }

  saveExpense() {
    const expense = {
      groupId: this.groupId,
      amount: this.amount,
      name: this.description,
      paidByUserId: parseInt(this.paidBy),
      splitDetails: this.members
        .filter(m => m.isSelected)
        .map(m => ({
          userId: m.id,
          amount: this.getSplitAmount(m)
        }))
    };
    this.save.emit(expense);
    this.close.emit();
  }
  printLogger() {
    console.log(this)
  }
}
