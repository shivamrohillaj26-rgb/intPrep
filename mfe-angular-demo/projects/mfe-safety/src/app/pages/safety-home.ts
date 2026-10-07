import { Component, computed, inject, OnInit } from '@angular/core';
import { AuthService, SessionContextService } from 'shared-auth';

@Component({
  selector: 'app-safety-home',
  template: `
    <section class="panel">
      <p class="badge">REMOTE · mfe-safety · port 4201</p>
      <h1>Safety domain</h1>
      <p class="lead">
        This page is loaded into the shell via <code>loadRemoteModule('mfe-safety', './Routes')</code>.
        It does not run its own login — it reads the shared session.
      </p>

      <div class="cards">
        <article>
          <h2>Shared user</h2>
          @if (user(); as u) {
            <p><strong>{{ u.name }}</strong> ({{ u.role }})</p>
            <p>Tenant: {{ u.tenantId }}</p>
            <p class="mono">token: {{ tokenPreview() }}</p>
          } @else {
            <p class="warn">No user — shell auth missing.</p>
          }
        </article>

        <article>
          <h2>Shared region filter</h2>
          <p>
            Shell set region to <strong>{{ region() }}</strong>. Same
            <code>SessionContextService</code> store.
          </p>
          <ul>
            @for (a of filteredAlerts(); track a.id) {
              <li>{{ a.title }} · {{ a.region }}</li>
            }
          </ul>
        </article>
      </div>
    </section>
  `,
  styles: [
    `
      .panel {
        padding: 1.25rem 1.5rem;
        background: #f4faf7;
        border: 1px solid #b7e0c8;
        border-radius: 12px;
      }
      .badge {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        color: #0b6b3a;
        background: #d8f5e5;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        margin: 0 0 0.75rem;
      }
      h1 {
        margin: 0 0 0.5rem;
        font-size: 1.5rem;
      }
      .lead {
        margin: 0 0 1.25rem;
        max-width: 52rem;
        color: #244;
      }
      .cards {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }
      article {
        background: #fff;
        border: 1px solid #d5e8dc;
        border-radius: 8px;
        padding: 1rem;
      }
      h2 {
        margin: 0 0 0.5rem;
        font-size: 1rem;
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.8rem;
        word-break: break-all;
      }
      .warn {
        color: #a30;
      }
      ul {
        margin: 0.5rem 0 0;
        padding-left: 1.1rem;
      }
      code {
        font-size: 0.85em;
      }
    `,
  ],
})
export class SafetyHome implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly ctx = inject(SessionContextService);

  readonly user = this.auth.user;
  readonly region = this.ctx.selectedRegion;
  readonly tokenPreview = computed(() => {
    const t = this.auth.token();
    return t ? `${t.slice(0, 28)}…` : '—';
  });

  private readonly alerts = [
    { id: 1, title: 'Harsh braking', region: 'west' },
    { id: 2, title: 'Speeding', region: 'east' },
    { id: 3, title: 'Distraction', region: 'west' },
    { id: 4, title: 'Tailgating', region: 'central' },
  ];

  readonly filteredAlerts = computed(() => {
    const r = this.region();
    return r === 'all' ? this.alerts : this.alerts.filter((a) => a.region === r);
  });

  ngOnInit(): void {
    this.auth.hydrateFromSharedStore();
    this.ctx.hydrateFromSharedStore();
  }
}
