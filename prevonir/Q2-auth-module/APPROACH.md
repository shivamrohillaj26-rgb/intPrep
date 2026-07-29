# Q2 - User Authentication Module

## Problem
Build an Angular auth module with Login, Profile, AuthGuard, AppService.

## Data Flow
AppService (singleton) → holds loggedInUser
LoginComponent → calls appService.login() → navigate to /profile
ProfileComponent → reads appService.loggedInUser → shows data
AuthGuard → checks appService.isLoggedIn() → blocks /profile if false
AppComponent nav → *ngIf on appService.isLoggedIn() → shows Login OR Profile link

## Files Changed
1. app.service.ts       → added loggedInUser, login(), logout(), isLoggedIn()
2. app.component.ts     → made appService PUBLIC (needed by template)
3. app.component.html   → added routerLink + *ngIf to nav items
4. login.component.ts   → implemented onLogin() with error handling
5. login.component.html → added [(ngModel)], (click), [disabled], *ngIf for error
6. profile.component.ts → read user on ngOnInit, implemented onLogout()
7. profile.component.html → bound user data with interpolation
8. auth.guard.ts        → implemented canActivate() with redirect logic

## Required data-test-id attributes
- app-input-userName  (username input)
- app-input-password  (password input)  
- login-button        (submit button)
- login-error         (error div)
- profile-card        (profile section)
- logout-btn          (logout button)
- app-nav             (nav element)
- login-router-link   (login anchor)
- profile-router-link (profile anchor)

## Interview Talking Points
1. Why not reactive forms? Question banned them — used template-driven [(ngModel)]
2. How AuthGuard works? CanActivate interface, checks state.url === '/profile'
3. Why public appService? Template needs to call isLoggedIn() — private would error
4. Why [...guests] spread? Creates new reference → triggers Angular change detection
5. How nav toggles? *ngIf on each <a> tied to appService.isLoggedIn()
