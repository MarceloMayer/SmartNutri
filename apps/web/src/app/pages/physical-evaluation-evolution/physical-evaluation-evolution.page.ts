import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type {
  EvaluationComparison,
  EvaluationEvolution,
  PhysicalEvaluation
} from '../../core/models/physical-evaluation.models';
import { PhysicalEvaluationService } from '../../features/physical-evaluations/services/physical-evaluation.service';
import { PatientService } from '../../features/patients/services/patient.service';
import {
  LineChartComponent,
  type ChartPoint
} from '../../shared/components/line-chart/line-chart.component';
import {
  type BiologicalSex,
  calcAge,
  calcJP3,
  calcJP7,
  calcPetroski,
  checkJP3,
  checkJP7,
  checkPetroski
} from '../../features/physical-evaluations/utils/body-composition';

type ViewState = 'idle' | 'loading' | 'error';

export interface ComparisonRow {
  label:     string;
  unit:      string;
  current:   number | null;
  reference: number | null;
  diff:      number | null;
  diffPct:   number | null;
}

interface SummaryCard {
  label:  string;
  unit:   string;
  format: string;
  value:  number | null;
  diff:   number | null;
}

const COMPARISON_FIELDS: Array<{ key: keyof EvaluationComparison; label: string; unit: string }> = [
  { key: 'weightKg',     label: 'Peso',                unit: 'kg' },
  { key: 'bmi',          label: 'IMC',                 unit: ''   },
  { key: 'waistCm',      label: 'Cintura',             unit: 'cm' },
  { key: 'hipCm',        label: 'Quadril',             unit: 'cm' },
  { key: 'abdomenCm',    label: 'Abdômen',             unit: 'cm' },
  { key: 'chestCm',      label: 'Tórax',               unit: 'cm' },
  { key: 'rightArmCm',   label: 'Braço direito',       unit: 'cm' },
  { key: 'leftArmCm',    label: 'Braço esquerdo',      unit: 'cm' },
  { key: 'rightThighCm', label: 'Coxa direita',        unit: 'cm' },
  { key: 'leftThighCm',  label: 'Coxa esquerda',       unit: 'cm' },
  { key: 'rightCalfCm',  label: 'Panturrilha direita', unit: 'cm' },
  { key: 'leftCalfCm',   label: 'Panturrilha esquer.', unit: 'cm' }
];

@Component({
  selector: 'app-physical-evaluation-evolution-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, NgFor, NgIf, RouterLink, LineChartComponent],
  templateUrl: './physical-evaluation-evolution.page.html',
  styleUrl: './physical-evaluation-evolution.page.scss'
})
export class PhysicalEvaluationEvolutionPage implements OnInit {
  private readonly route             = inject(ActivatedRoute);
  private readonly evaluationService = inject(PhysicalEvaluationService);
  private readonly patientService    = inject(PatientService);

  viewState:    ViewState = 'loading';
  errorMessage = '';
  evolution:   EvaluationEvolution | null = null;

  // Dados demográficos do paciente (necessários para os cálculos de composição corporal)
  patientSex:       BiologicalSex | null = null;
  patientBirthDate: string | null        = null;

  get patientId(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    // Carrega dados do paciente e evolução em paralelo
    this.patientService.findPatientById(this.patientId).subscribe({
      next: (patient) => {
        this.patientSex       = (patient.sex as BiologicalSex | null) ?? null;
        this.patientBirthDate = patient.birthDate ?? null;
      },
      error: () => { /* silencioso — cálculos de gordura ficam desabilitados */ }
    });

    this.evaluationService.getEvolution(this.patientId).subscribe({
      next: (data) => {
        this.evolution = data;
        this.viewState = 'idle';
      },
      error: (error: unknown) => {
        this.viewState    = 'error';
        this.errorMessage = this.resolveErrorMessage(error, 'Nao foi possivel carregar a evolucao.');
      }
    });
  }

  // ─── Composição corporal ─────────────────────────────────────────────────

  get hasPatientDemographics(): boolean {
    return this.patientSex !== null && this.patientBirthDate !== null;
  }

  /**
   * Melhor protocolo disponível por avaliação: JP7 → JP3 → Petroski.
   * Retorna null se os dados demográficos ou as dobras necessárias estiverem ausentes.
   */
  bodyFatForEvaluation(ev: PhysicalEvaluation): number | null {
    const sex       = this.patientSex;
    const birthDate = this.patientBirthDate;
    if (!sex || !birthDate) return null;

    const age = calcAge(birthDate, ev.evaluatedAt);
    const s   = toSkinfoldInputs(ev);

    if (checkJP7(s).available)       return calcJP7(sex, age, s, ev.weightKg).bodyFatPct;
    if (checkJP3(sex, s).available)  return calcJP3(sex, age, s, ev.weightKg).bodyFatPct;
    if (checkPetroski(s).available)  return calcPetroski(sex, age, s, ev.weightKg, ev.heightCm).bodyFatPct;
    return null;
  }

  get hasBodyFatData(): boolean {
    if (!this.hasPatientDemographics) return false;
    return (this.evolution?.timeline ?? []).some(ev => this.bodyFatForEvaluation(ev) !== null);
  }

  private bodyFatComparisonRow(
    current:   PhysicalEvaluation | null,
    reference: PhysicalEvaluation | null
  ): ComparisonRow | null {
    const currentBF   = current   ? this.bodyFatForEvaluation(current)   : null;
    const referenceBF = reference ? this.bodyFatForEvaluation(reference) : null;
    if (currentBF === null && referenceBF === null) return null;

    const diff    = currentBF !== null && referenceBF !== null ? round2(currentBF - referenceBF) : null;
    const diffPct = diff !== null && referenceBF !== null && referenceBF > 0
      ? round2((diff / referenceBF) * 100)
      : null;

    return { label: '% Gordura', unit: '%', current: currentBF, reference: referenceBF, diff, diffPct };
  }

  // ─── Rows de comparação ──────────────────────────────────────────────────

  get vsPreviousRows(): ComparisonRow[] {
    const rows  = this.evolution?.vsPrevious ? toRows(this.evolution.vsPrevious) : [];
    const bfRow = this.bodyFatComparisonRow(
      this.evolution?.current  ?? null,
      this.evolution?.previous ?? null
    );
    return bfRow ? [bfRow, ...rows] : rows;
  }

  get vsFirstRows(): ComparisonRow[] {
    const rows  = this.evolution?.vsFirst ? toRows(this.evolution.vsFirst) : [];
    const bfRow = this.bodyFatComparisonRow(
      this.evolution?.current ?? null,
      this.evolution?.first   ?? null
    );
    return bfRow ? [bfRow, ...rows] : rows;
  }

  // ─── Cards de resumo ─────────────────────────────────────────────────────

  get summaryCards(): SummaryCard[] {
    const c  = this.evolution?.current   ?? null;
    const vp = this.evolution?.vsPrevious ?? null;

    const currentBF  = c                        ? this.bodyFatForEvaluation(c)                        : null;
    const previousBF = this.evolution?.previous  ? this.bodyFatForEvaluation(this.evolution.previous)  : null;
    const diffBF     = currentBF !== null && previousBF !== null ? round2(currentBF - previousBF) : null;

    const cards: SummaryCard[] = [
      { label: 'Peso',    unit: 'kg', format: '1.0-1', value: c?.weightKg  ?? null, diff: vp?.weightKg.diff  ?? null },
      { label: 'IMC',     unit: '',   format: '1.0-2', value: c?.bmi        ?? null, diff: vp?.bmi.diff        ?? null },
      { label: 'Cintura', unit: 'cm', format: '1.0-1', value: c?.waistCm   ?? null, diff: vp?.waistCm.diff   ?? null },
      { label: 'Abdômen', unit: 'cm', format: '1.0-1', value: c?.abdomenCm ?? null, diff: vp?.abdomenCm.diff ?? null }
    ];

    if (currentBF !== null) {
      cards.push({ label: '% Gordura', unit: '%', format: '1.1-1', value: currentBF, diff: diffBF });
    }

    return cards;
  }

  // ─── Dados para gráficos ─────────────────────────────────────────────────

  get weightPoints(): ChartPoint[] {
    return toChartPoints(this.evolution?.timeline ?? [], 'weightKg');
  }

  get bmiPoints(): ChartPoint[] {
    return toChartPoints(this.evolution?.timeline ?? [], 'bmi');
  }

  get waistPoints(): ChartPoint[] {
    return toChartPoints(this.evolution?.timeline ?? [], 'waistCm');
  }

  get abdomenPoints(): ChartPoint[] {
    return toChartPoints(this.evolution?.timeline ?? [], 'abdomenCm');
  }

  get bodyFatPoints(): ChartPoint[] {
    if (!this.hasPatientDemographics) return [];
    return (this.evolution?.timeline ?? [])
      .map(ev => ({ label: ev.evaluatedAt, value: this.bodyFatForEvaluation(ev) }))
      .filter((p): p is ChartPoint => p.value !== null);
  }

  // ─── Histórico ───────────────────────────────────────────────────────────

  get historyRows(): PhysicalEvaluation[] {
    return this.evolution?.timeline ? [...this.evolution.timeline].reverse() : [];
  }

  get hasEnoughData(): boolean {
    return (this.evolution?.timeline.length ?? 0) >= 2;
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const msg = error.error?.message;
      if (typeof msg === 'string' && msg.trim().length > 0) return msg;
    }
    return fallback;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSkinfoldInputs(ev: PhysicalEvaluation) {
  return {
    triceps:     ev.tricepsSkinfoldMm,
    biceps:      ev.bicepsSkinfoldMm,
    subscapular: ev.subscapularSkinfoldMm,
    suprailiac:  ev.suprailiacSkinfoldMm,
    abdominal:   ev.abdominalSkinfoldMm,
    pectoral:    ev.pectoralSkinfoldMm,
    midaxillary: ev.midaxillarySkinfoldMm,
    thigh:       ev.thighSkinfoldMm,
    calf:        ev.calfSkinfoldMm
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toRows(comparison: EvaluationComparison): ComparisonRow[] {
  return COMPARISON_FIELDS
    .map(({ key, label, unit }) => ({ label, unit, ...comparison[key] }))
    .filter((row) => row.current !== null || row.reference !== null);
}

function toChartPoints(
  timeline: PhysicalEvaluation[],
  field: keyof PhysicalEvaluation
): ChartPoint[] {
  return timeline
    .filter((e) => e[field] !== null)
    .map((e) => ({ label: e.evaluatedAt, value: e[field] as number }));
}
