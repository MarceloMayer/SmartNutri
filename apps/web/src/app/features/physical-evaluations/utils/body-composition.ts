/**
 * Cálculos de composição corporal e gasto calórico.
 *
 * Protocolos de dobras cutâneas:
 *   - Jackson & Pollock 3 dobras (JP3)
 *   - Jackson & Pollock 7 dobras (JP7)
 *   - Petroski 4 dobras
 *
 * Gasto calórico: Fórmula de Mifflin-St Jeor + fator de atividade
 */

export type BiologicalSex = 'male' | 'female';

export interface SkinfoldInputs {
  triceps:      number | null;
  biceps:       number | null;
  subscapular:  number | null;
  suprailiac:   number | null;
  abdominal:    number | null;
  pectoral:     number | null;
  midaxillary:  number | null;
  thigh:        number | null;
  calf:         number | null;
}

export interface BodyCompositionResult {
  bodyFatPct:  number;
  fatMassKg:   number;
  leanMassKg:  number;
}

export interface ProtocolStatus {
  available:     boolean;
  missingFields: string[];
  result:        BodyCompositionResult | null;
}

export interface ActivityLevel {
  label:  string;
  factor: number;
}

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  { label: 'Sedentário (sem exercício)',              factor: 1.2   },
  { label: 'Levemente ativo (1–3x por semana)',       factor: 1.375 },
  { label: 'Moderadamente ativo (3–5x por semana)',   factor: 1.55  },
  { label: 'Muito ativo (6–7x por semana)',           factor: 1.725 },
  { label: 'Extremamente ativo (treino 2x por dia)',  factor: 1.9   }
];

// ─── Idade ────────────────────────────────────────────────────────────────────

/** Calcula idade exata em anos entre birthDate e evaluatedAt (formato YYYY-MM-DD) */
export function calcAge(birthDate: string, evaluatedAt: string): number {
  const b = new Date(birthDate);
  const e = new Date(evaluatedAt);
  let age = e.getFullYear() - b.getFullYear();
  const m = e.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && e.getDate() < b.getDate())) age--;
  return age;
}

// ─── Siri ─────────────────────────────────────────────────────────────────────

function siri(bodyDensity: number): number {
  return (495 / bodyDensity) - 450;
}

// ─── Jackson & Pollock 3 dobras ───────────────────────────────────────────────
// Homens:   peitoral + abdominal + coxa
// Mulheres: tríceps  + suprailíaca + coxa

export const JP3_FIELDS: Record<BiologicalSex, (keyof SkinfoldInputs)[]> = {
  male:   ['pectoral', 'abdominal', 'thigh'],
  female: ['triceps', 'suprailiac', 'thigh']
};

export const JP3_FIELD_LABELS: Record<keyof SkinfoldInputs, string> = {
  triceps:     'Tríceps',
  biceps:      'Bíceps',
  subscapular: 'Subescapular',
  suprailiac:  'Suprailíaca',
  abdominal:   'Abdominal',
  pectoral:    'Peitoral',
  midaxillary: 'Axilar média',
  thigh:       'Coxa',
  calf:        'Panturrilha'
};

export function calcJP3(
  sex: BiologicalSex,
  age: number,
  s: SkinfoldInputs,
  weightKg: number
): BodyCompositionResult {
  const fields = JP3_FIELDS[sex];
  const sum = fields.reduce((acc, f) => acc + (s[f] as number), 0);

  let bd: number;
  if (sex === 'male') {
    bd = 1.10938 - (0.0008267 * sum) + (0.0000016 * sum * sum) - (0.0002574 * age);
  } else {
    bd = 1.0994921 - (0.0009929 * sum) + (0.0000023 * sum * sum) - (0.0001392 * age);
  }

  return toComposition(siri(bd), weightKg);
}

// ─── Jackson & Pollock 7 dobras ───────────────────────────────────────────────
// Ambos os sexos: peitoral + axilar média + tríceps + subescapular +
//                 abdominal + suprailíaca + coxa

export const JP7_FIELDS: (keyof SkinfoldInputs)[] = [
  'pectoral', 'midaxillary', 'triceps', 'subscapular',
  'abdominal', 'suprailiac', 'thigh'
];

export function calcJP7(
  sex: BiologicalSex,
  age: number,
  s: SkinfoldInputs,
  weightKg: number
): BodyCompositionResult {
  const sum = JP7_FIELDS.reduce((acc, f) => acc + (s[f] as number), 0);

  let bd: number;
  if (sex === 'male') {
    bd = 1.112 - (0.00043499 * sum) + (0.00000055 * sum * sum) - (0.00028826 * age);
  } else {
    bd = 1.097 - (0.00046971 * sum) + (0.00000056 * sum * sum) - (0.00012828 * age);
  }

  return toComposition(siri(bd), weightKg);
}

// ─── Petroski 4 dobras (1995) ─────────────────────────────────────────────────
// Ambos os sexos: tríceps + subescapular + suprailíaca + panturrilha

export const PETROSKI_FIELDS: (keyof SkinfoldInputs)[] = [
  'triceps', 'subscapular', 'suprailiac', 'calf'
];

export function calcPetroski(
  sex: BiologicalSex,
  age: number,
  s: SkinfoldInputs,
  weightKg: number,
  heightCm: number
): BodyCompositionResult {
  const sum = PETROSKI_FIELDS.reduce((acc, f) => acc + (s[f] as number), 0);

  let bd: number;
  if (sex === 'male') {
    bd = 1.10726863
      - (0.00081201 * sum)
      + (0.00000212 * sum * sum)
      - (0.00041761 * age);
  } else {
    bd = 1.19547130
      - (0.07513507 * Math.log10(sum))
      - (0.00041072 * age)
      + (0.00015821 * heightCm)
      - (0.00022315 * weightKg);
  }

  return toComposition(siri(bd), weightKg);
}

// ─── Verificação de disponibilidade ──────────────────────────────────────────

export function checkJP3(sex: BiologicalSex, s: SkinfoldInputs): ProtocolStatus {
  return checkFields(JP3_FIELDS[sex], s);
}

export function checkJP7(s: SkinfoldInputs): ProtocolStatus {
  return checkFields(JP7_FIELDS, s);
}

export function checkPetroski(s: SkinfoldInputs): ProtocolStatus {
  return checkFields(PETROSKI_FIELDS, s);
}

function checkFields(
  required: (keyof SkinfoldInputs)[],
  s: SkinfoldInputs
): ProtocolStatus {
  const missing = required.filter(f => s[f] === null || s[f] === undefined);
  return {
    available:     missing.length === 0,
    missingFields: missing.map(f => JP3_FIELD_LABELS[f]),
    result:        null
  };
}

// ─── Gasto calórico — Mifflin-St Jeor ────────────────────────────────────────

/** Taxa metabólica basal (kcal/dia) */
export function calcBMR(
  sex: BiologicalSex,
  age: number,
  weightKg: number,
  heightCm: number
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

/** Gasto total diário (TDEE) */
export function calcTDEE(bmr: number, activityFactor: number): number {
  return bmr * activityFactor;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toComposition(fatPct: number, weightKg: number): BodyCompositionResult {
  const clampedPct = Math.max(0, Math.min(fatPct, 100));
  const fatMassKg  = (clampedPct / 100) * weightKg;
  return {
    bodyFatPct:  round2(clampedPct),
    fatMassKg:   round2(fatMassKg),
    leanMassKg:  round2(weightKg - fatMassKg)
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
