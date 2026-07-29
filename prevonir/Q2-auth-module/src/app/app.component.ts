// =============================================
// QUESTION 2 - USER AUTHENTICATION
// FILE: app.component.ts
//
// NOTE: appService must be PUBLIC so the template
// can call appService.isLoggedIn() for *ngIf on nav
// =============================================

import { Component } from '@angular/core';
import { AppService } from './app.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent {
  constructor(public appService: AppService) {}
}
