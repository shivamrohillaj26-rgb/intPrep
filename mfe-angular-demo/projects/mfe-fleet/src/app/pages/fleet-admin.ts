import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from 'shared-auth';

@Component({
  selector: 'app-fleet-admin',
  template: `
    <section class="panel">
      <p class="badge">REMOTE · admin-only route</p>
      <h1>Fleet admin ops</h1>
      <p>
        Shell wrapped this remote path with <code>adminGuard</code>. Logged in as
        <strong>{{ user()?.name }}</strong> ({{ user()?.role }}).
      </p>
      <p>Interview: host owns authorization at the route boundary; remote assumes access was granted.</p>
    </section>
  `,
  styles: [
    `
      .panel {
        padding: 1.25rem 1.5rem;
        background: #fff8ef;
        border: 1px solid #efd2a8;
        border-radius: 12px;
      }
      .badge {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 700;
        color: #8a4b00;
        background: #ffe8c2;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
      }
      h1 {
        margin: 0.75rem 0 0.5rem;
        font-size: 1.4rem;
      }
    `,
  ],
})
export class FleetAdmin implements OnInit {
  private readonly auth = inject(AuthService);
  readonly user = this.auth.user;

  ngOnInit(): void {
    this.auth.hydrateFromSharedStore();
  }
}
