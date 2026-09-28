import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface NutritionSummaryValues {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
}

interface MacroSlice {
  label: string;
  grams: number;
  pct: number;
  color: string;
  path: string;
}

@Component({
  selector: 'app-nutrition-summary-card',
  standalone: true,
  imports: [DecimalPipe, NgFor, NgIf],
  templateUrl: './nutrition-summary-card.component.html',
  styleUrl: './nutrition-summary-card.component.scss'
})
export class NutritionSummaryCardComponent {
  @Input({ required: true }) totals!: NutritionSummaryValues;
  @Input() title = 'Resumo nutricional';
  @Input() tone: 'default' | 'soft' = 'default';
  @Input() showChart = true;

  private static readonly CX = 80;
  private static readonly CY = 80;
  private static readonly R  = 68;
  private static readonly IR = 40;   // inner radius (donut hole)

  readonly nutrients = [
    { key: 'kcal',    label: 'kcal',         unit: 'kcal' },
    { key: 'carbs',   label: 'carboidratos',  unit: 'g'    },
    { key: 'protein', label: 'proteínas',     unit: 'g'    },
    { key: 'fat',     label: 'gorduras',      unit: 'g'    },
    { key: 'fiber',   label: 'fibras',        unit: 'g'    }
  ] as const;

  get hasMacros(): boolean {
    return (this.totals?.carbs ?? 0) + (this.totals?.protein ?? 0) + (this.totals?.fat ?? 0) > 0;
  }

  get macroSlices(): MacroSlice[] {
    const carbsKcal   = (this.totals?.carbs   ?? 0) * 4;
    const proteinKcal = (this.totals?.protein ?? 0) * 4;
    const fatKcal     = (this.totals?.fat     ?? 0) * 9;
    const total       = carbsKcal + proteinKcal + fatKcal;

    if (total === 0) return [];

    const raw = [
      { label: 'Carboidratos', kcal: carbsKcal,   grams: this.totals.carbs,   color: '#3b82f6' },
      { label: 'Proteínas',    kcal: proteinKcal,  grams: this.totals.protein, color: '#10b981' },
      { label: 'Gorduras',     kcal: fatKcal,      grams: this.totals.fat,     color: '#f59e0b' }
    ].filter(s => s.kcal > 0);

    const { CX, CY, R, IR } = NutritionSummaryCardComponent;
    let currentAngle = -Math.PI / 2;   // start at top

    return raw.map(slice => {
      const pct  = (slice.kcal / total) * 100;
      const span = (pct / 100) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle   = currentAngle + span;
      currentAngle = endAngle;

      return {
        label: slice.label,
        grams: slice.grams,
        pct,
        color: slice.color,
        path: buildDonutPath(startAngle, endAngle, CX, CY, R, IR)
      };
    });
  }

  valueOf(key: keyof NutritionSummaryValues): number {
    return this.totals?.[key] ?? 0;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDonutPath(
  startAngle: number,
  endAngle: number,
  cx: number, cy: number,
  R: number,  r: number
): string {
  // Full-circle edge case: SVG arc can't start and end at the same point
  if (Math.abs(endAngle - startAngle) >= 2 * Math.PI - 0.001) {
    const mid = startAngle + Math.PI;
    const s = p(startAngle, R, cx, cy);
    const m = p(mid,        R, cx, cy);
    const si = p(startAngle, r, cx, cy);
    const mi = p(mid,        r, cx, cy);
    return [
      `M ${s.x} ${s.y} A ${R} ${R} 0 1 1 ${m.x} ${m.y}`,
      `A ${R} ${R} 0 1 1 ${s.x} ${s.y}`,
      `L ${si.x} ${si.y} A ${r} ${r} 0 1 0 ${mi.x} ${mi.y}`,
      `A ${r} ${r} 0 1 0 ${si.x} ${si.y} Z`
    ].join(' ');
  }

  const la = endAngle - startAngle > Math.PI ? 1 : 0;
  const o1 = p(startAngle, R, cx, cy);
  const o2 = p(endAngle,   R, cx, cy);
  const i1 = p(startAngle, r, cx, cy);
  const i2 = p(endAngle,   r, cx, cy);

  return [
    `M ${o1.x} ${o1.y}`,
    `A ${R} ${R} 0 ${la} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${r} ${r} 0 ${la} 0 ${i1.x} ${i1.y}`,
    'Z'
  ].join(' ');
}

function p(angle: number, radius: number, cx: number, cy: number): { x: string; y: string } {
  return {
    x: (cx + radius * Math.cos(angle)).toFixed(3),
    y: (cy + radius * Math.sin(angle)).toFixed(3)
  };
}
