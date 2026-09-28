import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { EquivalenceNutrient, SubstituteResult } from '../../../../core/models/nutrition.models';

@Component({
  selector: 'app-substitution-card',
  standalone: true,
  imports: [NgIf],
  templateUrl: './substitution-card.component.html',
  styleUrl: './substitution-card.component.scss'
})
export class SubstitutionCardComponent {
  @Input({ required: true }) substitution!: SubstituteResult;
  @Input() resultIndex = 0;
  @Input() resultCount = 1;
  @Input() equivalenceNutrient: EquivalenceNutrient = 'carbs';
  @Input() equivalenceLabel = 'carboidratos';
  @Input() showActions = true;
  @Output() substitutionSelected = new EventEmitter<SubstituteResult>();
  @Output() favoriteSelected = new EventEmitter<SubstituteResult>();
  @Output() blockSelected = new EventEmitter<SubstituteResult>();

  get scoreTone(): 'best' | 'middle' | 'worst' {
    if (this.resultCount <= 1 || this.resultIndex === 0) {
      return 'best';
    }

    if (this.resultIndex === this.resultCount - 1) {
      return 'worst';
    }

    return 'middle';
  }

  selectSubstitution(): void {
    this.substitutionSelected.emit(this.substitution);
  }

  favoriteSubstitution(event: Event): void {
    event.stopPropagation();
    this.favoriteSelected.emit(this.substitution);
  }

  blockSubstitution(event: Event): void {
    event.stopPropagation();
    this.blockSelected.emit(this.substitution);
  }

  formatValue(value: number | null, unit: string): string {
    return value === null ? '-' : `${value} ${unit}`;
  }

  formatPercent(value: number | null): string {
    return value === null ? '-' : `${value}%`;
  }
}
