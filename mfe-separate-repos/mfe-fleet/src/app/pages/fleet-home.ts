import { Component, computed, inject, OnInit } from '@angular/core';
import { AuthService, SessionContextService } from 'shared-auth';

@Component({
  selector: 'app-fleet-home',
  template: `
    <section class="panel">
      <p class="badge">REMOTE · mfe-fleet · port 4202</p>
      <h1>Fleet domain</h1>
      <p class="lead">
        Second independently served remote. Same shared auth + region filter as Safety —
        proves cross-MFE data sharing without iframes.
      </p>

      <div class="cards">
        <article>
          <h2>Who am I?</h2>
          @if (user(); as u) {
            <p><strong>{{ u.name }}</strong></p>
            <p>Role: {{ u.role }} · Tenant: {{ u.tenantId }}</p>
            @if (u.role === 'viewer') {
              <p class="note">Viewer can see fleet list. Admin-only ops live behind adminGuard on shell.</p>
            }
          } @else {
            <p class="warn">No user in shared store.</p>
          }
        </article>

        <article>
          <h2>Vehicles (region = {{ region() }})</h2>
          <ul>
            @for (v of filteredVehicles(); track v.id) {
              <li>{{ v.name }} · {{ v.region }} · {{ v.status }}</li>
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
        background: #f3f6fc;
        border: 1px solid #b8c9ef;
        border-radius: 12px;
      }
      .badge {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        color: #1a3a8f;
        background: #dce6ff;
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
        color: #234;
      }
      .cards {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }
      article {
        background: #fff;
        border: 1px solid #d5dff0;
        border-radius: 8px;
        padding: 1rem;
      }
      h2 {
        margin: 0 0 0.5rem;
        font-size: 1rem;
      }
      .warn {
        color: #a30;
      }
      .note {
        color: #555;
        font-size: 0.9rem;
      }
      ul {
        margin: 0.5rem 0 0;
        padding-left: 1.1rem;
      }
    `,
  ],
})
export class FleetHome implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly ctx = inject(SessionContextService);

  readonly user = this.auth.user;
  readonly region = this.ctx.selectedRegion;

  private readonly vehicles = [
    { id: 'v1', name: 'Truck-101', region: 'west', status: 'active' },
    { id: 'v2', name: 'Van-22', region: 'east', status: 'idle' },
    { id: 'v3', name: 'Truck-77', region: 'central', status: 'active' },
    { id: 'v4', name: 'Bus-9', region: 'west', status: 'maintenance' },
  ];

  readonly filteredVehicles = computed(() => {
    const r = this.region();
    return r === 'all' ? this.vehicles : this.vehicles.filter((v) => v.region === r);
  });

  ngOnInit(): void {
    this.auth.hydrateFromSharedStore();
    this.ctx.hydrateFromSharedStore();
  }
}
