// Client-seitige Live-Vorschau der Pflegegrad-Punkteberechnung (Einzelpunkte,
// Rohsumme, gewichteter Punktwert pro Modul) -- bewusst parallel zur
// serverseitigen Berechnung in supabase/functions/_shared/scoring.ts, da
// Angular (npm) und die Deno-Edge-Function unterschiedliche Build-Systeme
// haben und sich keine Datei direkt teilen lassen.
//
// WICHTIG: Muss inhaltlich synchron zu supabase/functions/_shared/scoring.ts
// gehalten werden. Reine Anzeige-Vorschau fuer die Nutzer:in waehrend des
// Ausfuellens -- das tatsaechliche, verbindliche Ergebnis berechnet weiterhin
// ausschliesslich die calculate-pflegegrad Edge Function serverseitig.

export type CriteriaLevel = 0 | 1 | 2 | 3;

export interface StepTableEntry {
  max: number;
  value: number;
}

export const FREQUENCY_POINTS: Record<CriteriaLevel, number> = { 0: 0, 1: 1, 2: 3, 3: 5 };
export const PARENTERAL_POINTS: Record<0 | 1 | 2, number> = { 0: 0, 1: 6, 2: 3 };

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function sumLevels(levels: Array<number | null | undefined>): number {
  return levels.reduce<number>((sum, level) => sum + (level ?? 0), 0);
}

export function computeModule1Raw(a: Record<string, CriteriaLevel>): number {
  return sumLevels([a['4.1.1'], a['4.1.2'], a['4.1.3'], a['4.1.4'], a['4.1.5']]);
}

export function computeModule2Raw(a: Record<string, CriteriaLevel>): number {
  return sumLevels([
    a['4.2.1'], a['4.2.2'], a['4.2.3'], a['4.2.4'], a['4.2.5'], a['4.2.6'],
    a['4.2.7'], a['4.2.8'], a['4.2.9'], a['4.2.10'], a['4.2.11'],
  ]);
}

export function computeModule3Raw(a: Record<string, CriteriaLevel>): number {
  const levels: Array<CriteriaLevel | undefined> = [
    a['4.3.1'], a['4.3.2'], a['4.3.3'], a['4.3.4'], a['4.3.5'], a['4.3.6'], a['4.3.7'],
    a['4.3.8'], a['4.3.9'], a['4.3.10'], a['4.3.11'], a['4.3.12'], a['4.3.13'],
  ];
  return levels.reduce<number>((sum, level) => sum + FREQUENCY_POINTS[level ?? 0], 0);
}

export function computeModule4Raw(
  base: Record<string, number | null | undefined>,
  weighted: Record<string, number | null | undefined>,
  incontinence: {
    harnApplies?: boolean | null;
    harnLevel?: number | null;
    stuhlApplies?: boolean | null;
    stuhlLevel?: number | null;
  },
  parenteral: (0 | 1 | 2) | null | undefined,
): number {
  const baseSum = sumLevels([
    base['4.4.1'], base['4.4.2'], base['4.4.3'], base['4.4.4'], base['4.4.5'], base['4.4.6'], base['4.4.7'],
  ]);
  const essen = (weighted['4.4.8'] ?? 0) * 3;
  const trinken = (weighted['4.4.9'] ?? 0) * 2;
  const toilette = (weighted['4.4.10'] ?? 0) * 2;
  const inkontinenzHarn = incontinence.harnApplies ? (incontinence.harnLevel ?? 0) : 0;
  const inkontinenzStuhl = incontinence.stuhlApplies ? (incontinence.stuhlLevel ?? 0) : 0;
  return baseSum + essen + trinken + toilette + inkontinenzHarn + inkontinenzStuhl + PARENTERAL_POINTS[parenteral ?? 0];
}

interface FrequencyEntry {
  perDay?: number;
  perWeek?: number;
  perMonth?: number;
}

function dailyAverage(entries: Array<FrequencyEntry | undefined>): number {
  const total = entries.reduce((sum, entry) => {
    if (!entry) return sum;
    return sum + (entry.perDay ?? 0) + (entry.perWeek ?? 0) / 7 + (entry.perMonth ?? 0) / 30;
  }, 0);
  return round4(total);
}

function pointsForGroup1(dailyAvg: number): number {
  if (dailyAvg < 1) return 0;
  if (dailyAvg < 4) return 1;
  if (dailyAvg <= 8) return 2;
  return 3;
}

function pointsForGroup2(dailyAvg: number): number {
  if (dailyAvg < 1 / 7) return 0;
  if (dailyAvg < 1) return 1;
  if (dailyAvg < 3) return 2;
  return 3;
}

function pointsForGroup3(sum: number): number {
  if (sum < 4.3) return 0;
  if (sum < 8.6) return 1;
  if (sum < 12.9) return 2;
  if (sum < 60) return 3;
  return 6;
}

export interface Module5GroupPoints {
  group1: number;
  group2: number;
  group3: number;
  diaet: number;
}

export function computeModule5GroupPoints(
  group1: Record<string, FrequencyEntry>,
  group2: Record<string, FrequencyEntry>,
  group3: Record<string, FrequencyEntry>,
  diaet: CriteriaLevel,
): Module5GroupPoints {
  const group1Avg = dailyAverage(Object.values(group1 ?? {}));
  const group2Avg = dailyAverage(Object.values(group2 ?? {}));

  const g12 = group3?.['4.5.12'];
  const g13 = group3?.['4.5.13'];
  const g14 = group3?.['4.5.14'];
  const g15 = group3?.['4.5.15'];
  const gK = group3?.['4.5.K'];
  const group3Sum = round4(
    (g12 ? (g12.perDay ?? 0) * 60 + (g12.perWeek ?? 0) * 8.6 + (g12.perMonth ?? 0) * 2 : 0) +
      (g13 ? (g13.perWeek ?? 0) * 4.3 + (g13.perMonth ?? 0) * 1 : 0) +
      (g14 ? (g14.perWeek ?? 0) * 4.3 + (g14.perMonth ?? 0) * 1 : 0) +
      (g15 ? (g15.perWeek ?? 0) * 8.6 + (g15.perMonth ?? 0) * 2 : 0) +
      (gK ? (gK.perWeek ?? 0) * 4.3 + (gK.perMonth ?? 0) * 1 : 0),
  );

  return {
    group1: pointsForGroup1(group1Avg),
    group2: pointsForGroup2(group2Avg),
    group3: pointsForGroup3(group3Sum),
    diaet,
  };
}

export function computeModule6Raw(a: Record<string, CriteriaLevel>): number {
  return sumLevels([a['4.6.1'], a['4.6.2'], a['4.6.3'], a['4.6.4'], a['4.6.5'], a['4.6.6']]);
}

export function lookupStepValue(table: StepTableEntry[], rawScore: number): number {
  if (!table || table.length === 0) return 0;
  const sorted = [...table].sort((a, b) => a.max - b.max);
  for (const entry of sorted) {
    if (rawScore <= entry.max) return entry.value;
  }
  return sorted[sorted.length - 1].value;
}
