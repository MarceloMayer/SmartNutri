import { NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface ChartPoint {
  label: string; // ISO date 'YYYY-MM-DD'
  value: number;
}

interface Dot {
  cx: number;
  cy: number;
  value: number;
  label: string;
}

interface YLabel {
  y: number;
  text: string;
}

interface XLabel {
  x: number;
  text: string;
}

const PAD_LEFT = 40;
const PAD_RIGHT = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 24;
const SVG_W = 320;
const SVG_H = 120;
const PLOT_W = SVG_W - PAD_LEFT - PAD_RIGHT;  // 272
const PLOT_H = SVG_H - PAD_TOP - PAD_BOTTOM;   // 88

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <svg
      class="line-chart-svg"
      [attr.viewBox]="'0 0 ' + svgW + ' ' + svgH"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      [attr.aria-label]="title"
    >
      <!-- Linhas de grade horizontais -->
      <line
        *ngFor="let yl of yLabels"
        [attr.x1]="padLeft"
        [attr.y1]="yl.y"
        [attr.x2]="padLeft + plotW"
        [attr.y2]="yl.y"
        stroke="#eef2f6"
        stroke-width="1"
      />

      <!-- Área preenchida -->
      <path
        *ngIf="points.length >= 2"
        [attr.d]="areaPath"
        [attr.fill]="color"
        fill-opacity="0.08"
      />

      <!-- Linha -->
      <polyline
        *ngIf="points.length >= 2"
        [attr.points]="polylinePoints"
        [attr.stroke]="color"
        stroke-width="2"
        fill="none"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

      <!-- Pontos -->
      <g *ngFor="let dot of dots">
        <circle
          [attr.cx]="dot.cx"
          [attr.cy]="dot.cy"
          r="3.5"
          [attr.fill]="color"
          stroke="#ffffff"
          stroke-width="1.5"
        />
        <title>{{ dot.label }}: {{ dot.value }}{{ unit ? ' ' + unit : '' }}</title>
      </g>

      <!-- Rótulos eixo Y -->
      <text
        *ngFor="let yl of yLabels"
        [attr.x]="padLeft - 4"
        [attr.y]="yl.y + 3.5"
        text-anchor="end"
        font-size="9"
        fill="#9aabb8"
      >{{ yl.text }}</text>

      <!-- Rótulos eixo X -->
      <text
        *ngFor="let xl of xLabels"
        [attr.x]="xl.x"
        [attr.y]="svgH - 4"
        text-anchor="middle"
        font-size="9"
        fill="#9aabb8"
      >{{ xl.text }}</text>
    </svg>
  `,
  styles: [`
    :host { display: block; }
    .line-chart-svg { width: 100%; height: auto; display: block; }
  `]
})
export class LineChartComponent {
  @Input() points: ChartPoint[] = [];
  @Input() color = '#db2777';
  @Input() unit = '';
  @Input() title = '';

  readonly svgW = SVG_W;
  readonly svgH = SVG_H;
  readonly padLeft = PAD_LEFT;
  readonly plotW = PLOT_W;

  private get dataMin(): number {
    return Math.min(...this.points.map((p) => p.value));
  }

  private get dataMax(): number {
    return Math.max(...this.points.map((p) => p.value));
  }

  private get yRange(): number {
    const pad = Math.max((this.dataMax - this.dataMin) * 0.12, 0.5);
    return this.dataMax - this.dataMin + pad * 2;
  }

  private get yOffset(): number {
    const pad = Math.max((this.dataMax - this.dataMin) * 0.12, 0.5);
    return this.dataMin - pad;
  }

  private toX(i: number): number {
    const n = this.points.length;
    if (n <= 1) return PAD_LEFT + PLOT_W / 2;
    return PAD_LEFT + (i / (n - 1)) * PLOT_W;
  }

  private toY(value: number): number {
    if (this.yRange === 0) return PAD_TOP + PLOT_H / 2;
    return PAD_TOP + (1 - (value - this.yOffset) / this.yRange) * PLOT_H;
  }

  get polylinePoints(): string {
    return this.points.map((p, i) => `${this.toX(i)},${this.toY(p.value)}`).join(' ');
  }

  get areaPath(): string {
    if (this.points.length < 2) return '';
    const bottomY = PAD_TOP + PLOT_H;
    const linePts = this.points.map((p, i) => `${this.toX(i)},${this.toY(p.value)}`).join(' L ');
    const x0 = this.toX(0);
    const xN = this.toX(this.points.length - 1);
    return `M ${x0},${bottomY} L ${linePts} L ${xN},${bottomY} Z`;
  }

  get dots(): Dot[] {
    return this.points.map((p, i) => ({
      cx: this.toX(i),
      cy: this.toY(p.value),
      value: p.value,
      label: formatDateShort(p.label)
    }));
  }

  get yLabels(): YLabel[] {
    if (this.points.length === 0) return [];
    const min = this.dataMin;
    const max = this.dataMax;
    const mid = (min + max) / 2;
    return [
      { y: this.toY(max), text: fmt(max) },
      { y: this.toY(mid), text: fmt(mid) },
      { y: this.toY(min), text: fmt(min) }
    ];
  }

  get xLabels(): XLabel[] {
    const n = this.points.length;
    if (n === 0) return [];
    const indices = new Set<number>([0]);
    if (n > 2) indices.add(Math.floor((n - 1) / 2));
    if (n > 1) indices.add(n - 1);
    return [...indices].map((i) => ({
      x: this.toX(i),
      text: formatDateShort(this.points[i].label)
    }));
  }
}

function fmt(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function formatDateShort(iso: string): string {
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const parts = iso.split('-');
  const year = parts[0] ?? '';
  const month = parts[1] ?? '01';
  return `${months[Number(month) - 1] ?? '?'}/${year.slice(2)}`;
}
