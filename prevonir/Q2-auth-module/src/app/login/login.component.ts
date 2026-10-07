// =============================================
// QUESTION 2 - USER AUTHENTICATION
// FILE: login/login.component.ts
//
// APPROACH:
// - NO reactive forms (question explicitly banned them)
// - Used [(ngModel)] with simple variables
// - Submit button disabled until both fields filled
// - Wrong credentials: show error, reset inputs
// - Correct credentials: navigate to /profile
// =============================================

import { Component, OnInit } from '@angular/core';
import { AppService } from '../app.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false
})
export class LoginComponent implements OnInit {
  userName: string = '';
  password: string = '';
  showError: boolean = false;

  constructor(private appService: AppService, private router: Router) {}

  ngOnInit() {}

  onLogin() {
    const user = this.appService.login(this.userName, this.password);
    if (user) {
      this.showError = false;
      this.router.navigate(['/profile']);
    } else {
      this.showError = true;
      this.userName = '';
      this.password = '';
    }
  }
}
