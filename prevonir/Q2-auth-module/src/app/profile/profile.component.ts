// =============================================
// QUESTION 2 - USER AUTHENTICATION
// FILE: profile/profile.component.ts
//
// APPROACH:
// - On init, read loggedInUser from AppService
// - Logout: clear service state + navigate to /
// =============================================

import { Component, OnInit } from '@angular/core';
import { AppService, IUser } from '../app.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: false
})
export class ProfileComponent implements OnInit {
  user: IUser | null = null;

  constructor(private appService: AppService, private router: Router) {}

  ngOnInit() {
    this.user = this.appService.loggedInUser;
  }

  onLogout() {
    this.appService.logout();
    this.router.navigate(['/']);
  }
}
