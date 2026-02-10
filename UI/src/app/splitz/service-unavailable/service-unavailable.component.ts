import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiAvailabilityService } from '../services/api-availability.service';

@Component({
  selector: 'app-service-unavailable',
  imports: [CommonModule],
  templateUrl: './service-unavailable.component.html',
  styleUrl: './service-unavailable.component.css',
  standalone: true
})
export class ServiceUnavailableComponent implements OnInit {
  statusCode: number = 503;
  errorMessage: string = 'The service is temporarily unavailable. Please try again later.';
  statusMessage: string = 'Connecting...';

  constructor(private apiAvailabilityService: ApiAvailabilityService) {}

  ngOnInit(): void {
    // Listen for error details if available
    this.apiAvailabilityService.getApiStatus().subscribe(status => {
      if (!status.isAvailable && status.error) {
        this.errorMessage = status.error;
      }
    });
  }

  retry(): void {
    // Reset API availability and reload the page
    this.apiAvailabilityService.setApiAvailable();
    window.location.reload();
  }
}
