import { Component, EventEmitter, Output, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-group-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './group-modal.component.html',
  styleUrls: ['./group-modal.component.css']
})
export class GroupModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  groupName: string = '';
  userEmails: string[] = [''];
  spltizService: any;
  
  ngOnInit() {
    // Initialize with empty email field
  }

  addEmailField(): void {
    this.userEmails.push('');
  }

  removeEmailField(index: number): void {
    if (this.userEmails.length > 1) {
      this.userEmails.splice(index, 1);
    }
  }
  trackByIndex(index: number): number {
    return index;
  }

  isValid(): boolean {
    // Validate group name is not empty
    if (this.groupName.trim() === '') {
      return false;
    }
    
    // Validate at least one email is provided and valid
    const validEmails = this.userEmails.filter(email => {
      return email.trim() !== '' && this.isValidEmail(email);
    });
    
    return validEmails.length > 0;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  saveGroup(): void {
    if (!this.isValid()) {
      // alert('Please enter a valid group name and at least one valid email');
      this.spltizService.show('Please enter a valid group name and at least one valid email');
      return;
    }
    const validEmails = this.userEmails
      .map(email => email.trim())
      .filter(email => email !== '' && this.isValidEmail(email));

    const groupData = {
      groupName: this.groupName.trim(),
      userEmails: validEmails
    };
    this.save.emit(groupData);
  }

  closeModal(): void {
    this.close.emit();
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
}
