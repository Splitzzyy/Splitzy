import { Component, EventEmitter, Input, Output } from '@angular/core';
import {FormsModule} from '@angular/forms';


@Component({
  selector: 'app-modal',
  imports: [
    FormsModule
],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
  @Input() show: boolean = false;
  @Input() type: 'expense' | 'settle' = 'expense';
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }
}
