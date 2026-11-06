import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth-service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  username: string = '';
  password: string = '';
  authService = inject(AuthService);
  login() {
    this.authService.login(this.username, this.password);
  }
  logout() {
    this.authService.logout();
  }

}
