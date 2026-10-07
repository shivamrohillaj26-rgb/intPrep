// =============================================
// QUESTION 2 - USER AUTHENTICATION
// FILE: app.service.ts
//
// ROLE: Single source of truth for auth state
// - Stores user list in memory
// - Tracks who is logged in
// - Provides login/logout/isLoggedIn methods
// =============================================

import { Injectable } from '@angular/core';

export interface IUser {
  fName: string;
  lName: string;
  userName: string;
  password: string;
  phoneNo: string;
  email: string;
  state: string;
}

@Injectable({ providedIn: 'root' })
export class AppService {
  public loggedInUser: IUser | null = null;

  public userList: IUser[] = [
    {
      fName: 'John',
      lName: 'Doe',
      userName: 'John',
      password: 'John@123',
      email: 'john@hackerrank.com',
      phoneNo: '+1 9876543210',
      state: 'California'
    },
    {
      fName: 'Alexa',
      lName: 'Musk',
      userName: 'Alexa',
      password: 'Alexa@123',
      email: 'alexa@hackerrank.com',
      phoneNo: '+1 1111111111',
      state: 'California'
    }
  ];

  login(userName: string, password: string): IUser | null {
    const user = this.userList.find(
      u => u.userName === userName && u.password === password
    );
    if (user) { this.loggedInUser = user; }
    return user || null;
  }

  logout(): void {
    this.loggedInUser = null;
  }

  isLoggedIn(): boolean {
    return this.loggedInUser !== null;
  }
}
