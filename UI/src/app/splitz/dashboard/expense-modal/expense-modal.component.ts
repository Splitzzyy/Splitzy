import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SplitzService } from '../../services/splitz.service';
import { OcrService } from '../../services/ocr.service';
import { SplitMember } from '../../splitz.model';
@Component({
  selector: 'app-expense-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-modal.component.html',
  styleUrls: ['./expense-modal.component.css']
})
export class ExpenseModalComponent implements OnInit {
  @Input() groupId!: number;
  @Input() members: any[] = [];
  @Input() currentUserId!: number;
  @Input() addOrEdit: 'Add' | 'Edit' | null = null;
  @Input() expenseId: number | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();
  @Output() edit = new EventEmitter<any>();

  amount: number = 0;
  description: string = '';
  paidBy: number | null = null;
  splitMembers: SplitMember[] = [];
  selectAllChecked: boolean = false;
  isUnequalSplit: boolean = false;
  isScanning: boolean = false;
  constructor(
    private splitzService: SplitzService,
    private ocrService: OcrService
  ) { }
  ngOnInit() {
    // Initialize members with avatar letters
    this.splitMembers = this.members.map(member => ({
      name: member.memberName || member.name || 'Unknown',
      avatarLetter: (member.memberName || member.name || 'Unknown').charAt(0).toUpperCase(),
      isSelected: false,
      id: member.memberId || member.id,
      amount: 0,
      customAmount: 0
    }));
    // Set current user as paidBy by default
    if (this.currentUserId) {
      this.paidBy = this.currentUserId;
    }
    // Fetch and populate data for Edit mode
    if (this.addOrEdit === 'Edit' && this.expenseId) {
      this.splitzService.onGetExpenseDetails(this.expenseId).subscribe({
        next: (response) => {
          if (response.success) {
            this.expenseId = response.data.expenseId;
            this.description = response.data.name;
            this.amount = response.data.amount;
            this.paidBy = response.data.paidBy.userId;

            const splits = response.data.splits;
            const firstSplitAmount = splits[0]?.amount || 0;
            const isUnequal = splits.some((split: any) => Math.abs(split.amount - firstSplitAmount) > 0.01);

            this.isUnequalSplit = isUnequal;

            splits.forEach((split: any) => {
              const member = this.splitMembers.find(m => m.id === split.userId);
              if (member) {
                member.isSelected = true;
                member.amount = split.amount;
                if (this.isUnequalSplit) {
                  member.customAmount = split.amount;
                }
              }
            });
            // Update select all checkbox
            this.selectAllChecked = this.splitMembers.every(m => m.isSelected);
          } else {
            this.splitzService.show(response.message, 'error');
          }
        },
        error: (error) => {
          console.error('Error Getting Expense Detail', error);
          this.splitzService.show(error.error?.message || 'Failed to fetch expense details', 'error');
        }
      });
    }
  }

  getSplitAmount(member: SplitMember): number {
    if (!member.isSelected) {
      return 0;
    }

    if (this.isUnequalSplit) {
      return member.customAmount || 0;
    } else {
      const selectedMembers = this.splitMembers.filter(m => m.isSelected).length;
      return selectedMembers > 0 ? parseFloat(((this.amount / selectedMembers).toFixed(2))) : 0;
    }
  }

  setSplitMode(isUnequal: boolean) {
    if (this.isUnequalSplit === isUnequal) {
      return; // Already in the requested mode
    }

    this.isUnequalSplit = isUnequal;

    if (this.isUnequalSplit) {
      this.initializeUnequalSplit();
    } else {
      this.splitMembers.forEach(member => {
        member.customAmount = 0;
      });
    }
  }

  initializeUnequalSplit() {
    const selectedMembers = this.splitMembers.filter(m => m.isSelected);
    if (selectedMembers.length === 0 || this.amount === 0) {
      return;
    }

    const equalAmount = parseFloat((this.amount / selectedMembers.length).toFixed(2));
    selectedMembers.forEach(member => {
      member.customAmount = equalAmount;
    });
  }

  toggleSelectAll() {
    this.splitMembers.forEach(member => {
      member.isSelected = this.selectAllChecked;
    });
    this.onMemberToggle();
  }

  onAmountChange() {
    if (this.isUnequalSplit && this.amount > 0) {
      const selectedCount = this.splitMembers.filter(m => m.isSelected).length;
      if (selectedCount > 0) {
        this.initializeUnequalSplit();
      }
    }
  }

  onMemberToggle() {
    const allSelected = this.splitMembers.every(m => m.isSelected);
    this.selectAllChecked = allSelected;

    if (this.isUnequalSplit && this.amount > 0) {
      const selectedCount = this.splitMembers.filter(m => m.isSelected).length;
      if (selectedCount > 0) {
        this.initializeUnequalSplit();
      } else {
        this.splitMembers.forEach(m => m.customAmount = 0);
      }
    }
  }

  onCustomAmountChange(member: SplitMember) {
    const totalCustomAmount = this.getTotalCustomAmount();
    if (totalCustomAmount > this.amount) {
      const otherAmounts = this.splitMembers
        .filter(m => m.isSelected && m.id !== member.id)
        .reduce((sum, m) => sum + (m.customAmount || 0), 0);
      member.customAmount = Math.max(0, this.amount - otherAmounts);
    }

    if (member.customAmount && member.customAmount < 0) {
      member.customAmount = 0;
    }
  }

  getTotalCustomAmount(): number {
    return this.splitMembers
      .filter(m => m.isSelected)
      .reduce((sum, m) => sum + (m.customAmount || 0), 0);
  }

  getRemainingAmount(): number {
    return parseFloat((this.amount - this.getTotalCustomAmount()).toFixed(2));
  }

  isSplitValid(): boolean {
    if (!this.isUnequalSplit) {
      return true;
    }

    const remaining = this.getRemainingAmount();
    return Math.abs(remaining) < 0.02;
  }

  isValid(): boolean {
    const basicValid = this.amount > 0 &&
      this.description.trim() !== '' &&
      this.paidBy !== null &&
      this.splitMembers.some(m => m.isSelected);

    return basicValid && this.isSplitValid();
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

    if (this.addOrEdit === 'Add') {
      this.save.emit(expense);
    } else {
      // Include expenseId for edit operation
      this.edit.emit({ ...expense, expenseId: this.expenseId });
    }
    this.closeModal();
  }

  closeModal() {
    this.close.emit();
  }
  getAvatarColor(letter: string): string {
    const colors: { [key: string]: string } = {
      'A': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      'B': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      'C': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      'D': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      'E': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      'F': 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      'G': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
      'H': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      'S': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    };

    return colors[letter] || 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
  }

  triggerScan() {
    const fileInput = document.getElementById('receiptInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    this.isScanning = true;
    this.splitzService.show('Scanning receipt... Please wait.', 'info');

    try {
      const result = await this.ocrService.recognizeImage(file);

      if (result.amount) {
        this.amount = result.amount;
        this.splitzService.show(`Found amount: ₹${result.amount}`, 'success');
      } else {
        this.splitzService.show('Could not detect amount automatically', 'info');
      }

      if (result.date) {
        // Optional: Use date in description or a date field if we add one later
        console.log('Detected Date:', result.date);
      }

      if (result.merchantName) {
        this.description = result.merchantName;
      } else if (!this.description) {
        this.description = 'Scanned Receipt';
      }

    } catch (error) {
      console.error('OCR Error', error);
      this.splitzService.show('Failed to scan receipt', 'error');
    } finally {
      this.isScanning = false;
      // Reset input
      event.target.value = '';
    }
  }
}
