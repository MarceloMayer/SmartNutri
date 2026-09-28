import { NgFor } from '@angular/common';
import { Component, Input } from '@angular/core';

export type DashboardIconName =
  | 'patients'
  | 'plan-add'
  | 'plans'
  | 'calculator'
  | 'foods'
  | 'groups'
  | 'users'
  | 'settings';

const iconPaths: Record<DashboardIconName, string[]> = {
  patients: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75'
  ],
  'plan-add': [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
    'M14 2v6h6',
    'M12 18v-6',
    'M9 15h6'
  ],
  plans: [
    'M8 2v4',
    'M16 2v4',
    'M3 10h18',
    'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',
    'M8 14h.01',
    'M12 14h.01',
    'M16 14h.01',
    'M8 18h.01',
    'M12 18h.01'
  ],
  calculator: [
    'M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2',
    'M8 6h8',
    'M8 10h2',
    'M14 10h2',
    'M8 14h2',
    'M14 14h2',
    'M8 18h2',
    'M14 18h2'
  ],
  foods: [
    'M12 22a8 8 0 0 0 8-8c0-3-2-5-5-6 0-3-1-5-3-6-2 1-3 3-3 6-3 1-5 3-5 6a8 8 0 0 0 8 8',
    'M12 8c1.5-1.5 3.5-2.4 6-2.5',
    'M12 8c-1.5-1.5-3.5-2.4-6-2.5'
  ],
  groups: [
    'M12 2 3 7l9 5 9-5-9-5',
    'm3 12 9 5 9-5',
    'm3 17 9 5 9-5'
  ],
  users: [
    'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    'M4 21a8 8 0 0 1 16 0',
    'M19 8h3',
    'M20.5 6.5v3'
  ],
  settings: [
    'M4 21v-7',
    'M4 10V3',
    'M12 21v-9',
    'M12 8V3',
    'M20 21v-5',
    'M20 12V3',
    'M2 14h4',
    'M10 8h4',
    'M18 16h4'
  ]
};

@Component({
  selector: 'app-dashboard-icon',
  standalone: true,
  imports: [NgFor],
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path *ngFor="let path of paths" [attr.d]="path" />
    </svg>
  `,
  styles: [`
    :host {
      display: inline-grid;
      width: 28px;
      height: 28px;
      place-items: center;
    }

    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }
  `]
})
export class DashboardIconComponent {
  @Input({ required: true }) name!: DashboardIconName;

  get paths(): string[] {
    return iconPaths[this.name];
  }
}
