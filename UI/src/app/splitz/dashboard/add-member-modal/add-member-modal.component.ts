import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AddMembersRequest } from '../../splitz.model';

@Component({
  selector: 'app-add-member-modal',
  imports: [FormsModule],
  templateUrl: './add-member-modal.component.html',
  styleUrl: './add-member-modal.component.css',
})
export class AddMemberModalComponent {
  userEmails: string[] = [''];
  @Input() groupId!: number;
  @Input() errorMessage!: string;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();



  trackByIndex(index: number) {
    return index;
  }
  addMember() {
    const validEmails = this.userEmails.map(email => email.trim()).filter(email => email !== '' && this.isValidEmail(email));
    const addMemberRequest: AddMembersRequest = {
      groupId: this.groupId,
      userEmails: validEmails
    }
    this.save.emit(addMemberRequest);
  }
  onClose() {
   this.close.emit();
  }
  isValid(): boolean {
    const validEmails = this.userEmails.filter(email => {
      return email.trim() !== '' && this.isValidEmail(email);
    });
    return validEmails.length > 0;
  }
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }
  getEmailError(index: number): string {
    const email = this.userEmails[index];
    if (email.trim() === '') {
      return '';
    }
    if (!this.isValidEmail(email)) {
      return 'Invalid email format';
    }
    return '';
  }
  removeEmailField(index: number): void {
    if (this.userEmails.length > 1) {
      this.userEmails.splice(index, 1);
    }
  }
  addEmailField(): void {
    this.userEmails.push('');
  }

}
