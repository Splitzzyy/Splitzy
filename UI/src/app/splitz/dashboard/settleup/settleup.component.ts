import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { SettleUpRequest } from '../../splitz.model';

interface Member {
  memberId: number;
  memberName: string;
  memberEmail?: string;
}


@Component({
  selector: 'app-settleup',
  imports: [
    FormsModule
],
  templateUrl: './settleup.component.html',
  styleUrl: './settleup.component.css',
})
export class SettleupComponent implements OnInit {

  @Input() groupId!: number;
  @Input() members: Member[] = [];
  @Input() currentUserId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<SettleUpRequest>();

  settleUpData: SettleUpRequest = {
    groupId: 0,
    paidByUserId: 0,
    paidToUserId: 0,
    amount: 0
  };

  errorMessage: string = '';

  ngOnInit() {
    this.settleUpData.groupId = this.groupId;
    if (this.currentUserId) {
      this.settleUpData.paidByUserId = parseInt(this.currentUserId);
    }
  }

  get filteredReceivers(): Member[] {
    return this.members.filter(m => m.memberId != this.settleUpData.paidByUserId);
  }

  getPayerName(): string {
    return this.members.find(m => m.memberId == this.settleUpData.paidByUserId)?.memberName || '';
  }

  getReceiverName(): string {
    return this.members.find(m => m.memberId == this.settleUpData.paidToUserId)?.memberName || '';
  }

  isFormValid(): boolean {
    return !!(
      this.settleUpData.paidByUserId &&
      this.settleUpData.paidToUserId &&
      this.settleUpData.amount > 0 &&
      this.settleUpData.paidByUserId != this.settleUpData.paidToUserId
    );
  }

  onSubmit() {
    this.errorMessage = '';

    if (!this.isFormValid()) {
      this.errorMessage = 'Please fill all fields correctly';
      return;
    }

    if (this.settleUpData.paidByUserId == this.settleUpData.paidToUserId) {
      this.errorMessage = 'Payer and receiver cannot be the same person';
      return;
    }

    this.save.emit(this.settleUpData);
  }

  onClose() {
    this.close.emit();
  }
}
