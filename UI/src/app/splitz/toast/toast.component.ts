import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { SplitzService } from '../splitz.service';
import { Toast } from '../splitz.model';

@Component({
  selector: 'app-toast',
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent {
  toasts$!: Observable<Toast[]>;
  constructor(private splitzService: SplitzService) {
    this.toasts$ = this.splitzService.stream;
  }
}
