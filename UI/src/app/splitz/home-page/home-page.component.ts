import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent {

  isMobileMenuOpen = false;

  constructor(private router: Router) {}

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
    this.closeMobileMenu();
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
    this.closeMobileMenu();
  }

  scrollToFeatures() {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    this.closeMobileMenu();
  }
}
