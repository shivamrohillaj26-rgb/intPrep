import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  userName = '';
  password = '';
  showError = false;

  onLogin() {
    const user = this.auth.login(this.userName, this.password);
    if (user) {
      this.showError = false;
      this.router.navigate(['/q2/profile']);
    } else {
      this.showError = true;
      this.userName = '';
      this.password = '';
    }
  }
}
