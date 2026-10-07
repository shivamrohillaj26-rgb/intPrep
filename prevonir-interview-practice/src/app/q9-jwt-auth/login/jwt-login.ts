import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JwtAuthService } from '../jwt-auth.service';

@Component({
  selector: 'app-jwt-login',
  imports: [FormsModule],
  templateUrl: './jwt-login.html',
  styleUrl: './jwt-login.css',
})
export class JwtLogin {
  private auth = inject(JwtAuthService);
  private router = inject(Router);

  username = '';
  password = '';
  error = signal(false);

  onLogin() {
    const ok = this.auth.login(this.username.trim(), this.password);
    if (!ok) {
      this.error.set(true);
      this.password = '';
      return;
    }
    this.error.set(false);
    this.router.navigate(['/q9/dashboard']);
  }
}
