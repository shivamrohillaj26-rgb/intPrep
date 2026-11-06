import { Component, inject } from '@angular/core';
import { AuthService } from '../auth-service';

@Component({
  selector: 'app-profile',
  imports: [],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  authService = inject(AuthService);
  logout() {
    this.authService.logout();
  }
}
