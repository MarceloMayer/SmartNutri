import { NgFor } from '@angular/common';
import { Component, Input } from '@angular/core';

import type { NutritionComparisonRow } from '../../../../core/models/nutrition.models';

@Component({
  selector: 'app-nutrition-comparison-table',
  standalone: true,
  imports: [NgFor],
  templateUrl: './nutrition-comparison-table.component.html',
  styleUrl: './nutrition-comparison-table.component.scss'
})
export class NutritionComparisonTableComponent {
  @Input({ required: true }) rows: NutritionComparisonRow[] = [];

  formatValue(value: number | null, unit: string): string {
    return value === null ? '-' : `${value} ${unit}`;
  }

  formatDifference(row: NutritionComparisonRow): string {
    if (row.absoluteDifference === null || row.percentDifference === null) {
      return '-';
    }

    return `${row.absoluteDifference} ${row.unit} (${row.percentDifference}%)`;
  }
}
