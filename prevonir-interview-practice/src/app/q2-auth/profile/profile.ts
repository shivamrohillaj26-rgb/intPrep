import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, IUser } from '../auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  user: IUser | null = null;

  ngOnInit() {
    this.user = this.auth.loggedInUser;
  }

  onLogout() {
    this.auth.logout();
    this.router.navigate(['/q2']);
  }
}
