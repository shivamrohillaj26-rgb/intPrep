import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  isLoggedIn: boolean = false;
  router = inject(Router);
  login(username: string, password: string) {
    if(username === 'admin' && password === 'admin') {
      this.isLoggedIn = true;
      this.router.navigate(['/auth-prac/profile']);
    }
  }
  logout() {
    this.isLoggedIn = false;
    this.router.navigate(['/auth-prac/login']);
  }
}
