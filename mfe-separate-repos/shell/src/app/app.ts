import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, SessionContextService } from 'shared-auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly auth = inject(AuthService);
  readonly ctx = inject(SessionContextService);
  private readonly router = inject(Router);

  readonly regions = ['all', 'west', 'east', 'central'];

  constructor() {
    this.auth.hydrateFromSharedStore();
    this.ctx.hydrateFromSharedStore();
  }

  onRegionChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.ctx.setRegion(value);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
