// Reine Berechnungslogik fuer den Pflegegrad nach § 15 SGB XI.
// Verifiziert gegen die offizielle Excel-Vorlage
// (2016_11_Begutachtungsmodul_Pflegegrade.xltx) und die BRi-Richtlinie
// (2026_10_01_BRi_Pflege.pdf, S. 96-111). Keine Supabase-/Deno-Abhaengigkeit,
// damit diese Datei ohne Deploy/DB per `deno test` pruefbar ist.

export type CriteriaLevel = 0 | 1 | 2 | 3;

export interface Module1Answers {
  '4.1.1': CriteriaLevel;
  '4.1.2': CriteriaLevel;
  '4.1.3': CriteriaLevel;
  '4.1.4': CriteriaLevel;
  '4.1.5': CriteriaLevel;
}

export interface Module2Answers {
  '4.2.1': CriteriaLevel;
  '4.2.2': CriteriaLevel;
  '4.2.3': CriteriaLevel;
  '4.2.4': CriteriaLevel;
  '4.2.5': CriteriaLevel;
  '4.2.6': CriteriaLevel;
  '4.2.7': CriteriaLevel;
  '4.2.8': CriteriaLevel;
  '4.2.9': CriteriaLevel;
  '4.2.10': CriteriaLevel;
  '4.2.11': CriteriaLevel;
}

// Level reprasentiert hier die Haeufigkeits-Kategorie (0=nie/selten,
// 1=selten, 2=haeufig, 3=taeglich), nicht den Grad der Selbstaendigkeit.
export interface Module3Answers {
  '4.3.1': CriteriaLevel;
  '4.3.2': CriteriaLevel;
  '4.3.3': CriteriaLevel;
  '4.3.4': CriteriaLevel;
  '4.3.5': CriteriaLevel;
  '4.3.6': CriteriaLevel;
  '4.3.7': CriteriaLevel;
  '4.3.8': CriteriaLevel;
  '4.3.9': CriteriaLevel;
  '4.3.10': CriteriaLevel;
  '4.3.11': CriteriaLevel;
  '4.3.12': CriteriaLevel;
  '4.3.13': CriteriaLevel;
}

export interface Module4Answers {
  '4.4.1': CriteriaLevel;
  '4.4.2': CriteriaLevel;
  '4.4.3': CriteriaLevel;
  '4.4.4': CriteriaLevel;
  '4.4.5': CriteriaLevel;
  '4.4.6': CriteriaLevel;
  '4.4.7': CriteriaLevel;
  '4.4.8': CriteriaLevel; // Essen (dreifach gewichtet)
  '4.4.9': CriteriaLevel; // Trinken (doppelt gewichtet)
  '4.4.10': CriteriaLevel; // Toilette (doppelt gewichtet)
  // Zaehlen nur, wenn ueberwiegend/komplett inkontinent bzw. kuenstliche
  // Ableitung vorliegt. undefined = nicht einschlaegig -> 0 Punkte.
  '4.4.11'?: CriteriaLevel;
  '4.4.12'?: CriteriaLevel;
  '4.4.13': 0 | 1 | 2; // 0=keine/nicht taeglich, 1=taeglich zusaetzlich, 2=ausschliesslich
}

export interface FrequencyEntry {
  perDay?: number;
  perWeek?: number;
  perMonth?: number;
}

export interface Module5Answers {
  group1: Partial<Record<'4.5.1' | '4.5.2' | '4.5.3' | '4.5.4' | '4.5.5' | '4.5.6' | '4.5.7', FrequencyEntry>>;
  group2: Partial<Record<'4.5.8' | '4.5.9' | '4.5.10' | '4.5.11', FrequencyEntry>>;
  group3: Partial<Record<'4.5.12' | '4.5.13' | '4.5.14' | '4.5.15' | '4.5.K', FrequencyEntry>>;
  diaet: CriteriaLevel; // 4.5.16
}

export interface Module6Answers {
  '4.6.1': CriteriaLevel;
  '4.6.2': CriteriaLevel;
  '4.6.3': CriteriaLevel;
  '4.6.4': CriteriaLevel;
  '4.6.5': CriteriaLevel;
  '4.6.6': CriteriaLevel;
}

export interface PflegegradInput {
  module1: Module1Answers;
  module2: Module2Answers;
  module3: Module3Answers;
  module4: Module4Answers;
  module5: Module5Answers;
  module6: Module6Answers;
  besondereBedarfskonstellation: boolean;
}

export interface StepTableEntry {
  max: number;
  value: number;
}

export interface ThresholdEntry {
  min: number;
  max: number;
  pflegegrad: number;
}

export interface ScoringRuleset {
  step_tables: {
    m1: StepTableEntry[];
    m2: StepTableEntry[];
    m3: StepTableEntry[];
    m4: StepTableEntry[];
    m5: StepTableEntry[];
    m6: StepTableEntry[];
  };
  pflegegrad_thresholds: ThresholdEntry[];
}

export interface PflegegradResult {
  moduleRawScores: { m1: number; m2: number; m3: number; m4: number; m5: number; m6: number };
  moduleWeightedScores: { m1: number; m2: number; m3: number; m4: number; m5: number; m6: number };
  m2OrM3Used: 'm2' | 'm3';
  totalScore: number;
  pflegegrad: number;
  besondereBedarfskonstellation: boolean;
}

const FREQUENCY_POINTS: Record<CriteriaLevel, number> = { 0: 0, 1: 1, 2: 3, 3: 5 };
const PARENTERAL_POINTS: Record<0 | 1 | 2, number> = { 0: 0, 1: 6, 2: 3 };

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function sumLevels(levels: CriteriaLevel[]): number {
  return levels.reduce<number>((sum, level) => sum + level, 0);
}

function dailyAverage(entries: Array<FrequencyEntry | undefined>): number {
  const total = entries.reduce((sum, entry) => {
    if (!entry) return sum;
    return (
      sum + (entry.perDay ?? 0) + (entry.perWeek ?? 0) / 7 + (entry.perMonth ?? 0) / 30
    );
  }, 0);
  return round4(total);
}

export function computeModule1Raw(a: Module1Answers): number {
  return sumLevels([a['4.1.1'], a['4.1.2'], a['4.1.3'], a['4.1.4'], a['4.1.5']]);
}

export function computeModule2Raw(a: Module2Answers): number {
  return sumLevels([
    a['4.2.1'], a['4.2.2'], a['4.2.3'], a['4.2.4'], a['4.2.5'], a['4.2.6'],
    a['4.2.7'], a['4.2.8'], a['4.2.9'], a['4.2.10'], a['4.2.11'],
  ]);
}

export function computeModule3Raw(a: Module3Answers): number {
  const levels: CriteriaLevel[] = [
    a['4.3.1'], a['4.3.2'], a['4.3.3'], a['4.3.4'], a['4.3.5'], a['4.3.6'], a['4.3.7'],
    a['4.3.8'], a['4.3.9'], a['4.3.10'], a['4.3.11'], a['4.3.12'], a['4.3.13'],
  ];
  return levels.reduce<number>((sum, level) => sum + FREQUENCY_POINTS[level], 0);
}

export function computeModule4Raw(a: Module4Answers): number {
  const base = sumLevels([a['4.4.1'], a['4.4.2'], a['4.4.3'], a['4.4.4'], a['4.4.5'], a['4.4.6'], a['4.4.7']]);
  const essen = a['4.4.8'] * 3;
  const trinken = a['4.4.9'] * 2;
  const toilette = a['4.4.10'] * 2;
  const inkontinenzHarn = a['4.4.11'] ?? 0;
  const inkontinenzStuhl = a['4.4.12'] ?? 0;
  const parenteral = PARENTERAL_POINTS[a['4.4.13']];
  return base + essen + trinken + toilette + inkontinenzHarn + inkontinenzStuhl + parenteral;
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

export function computeModule5Raw(a: Module5Answers): number {
  const group1Avg = dailyAverage([
    a.group1['4.5.1'], a.group1['4.5.2'], a.group1['4.5.3'], a.group1['4.5.4'],
    a.group1['4.5.5'], a.group1['4.5.6'], a.group1['4.5.7'],
  ]);
  const group2Avg = dailyAverage([
    a.group2['4.5.8'], a.group2['4.5.9'], a.group2['4.5.10'], a.group2['4.5.11'],
  ]);

  const g12 = a.group3['4.5.12'];
  const g13 = a.group3['4.5.13'];
  const g14 = a.group3['4.5.14'];
  const g15 = a.group3['4.5.15'];
  const gK = a.group3['4.5.K'];
  const group3Sum = round4(
    (g12 ? (g12.perDay ?? 0) * 60 + (g12.perWeek ?? 0) * 8.6 + (g12.perMonth ?? 0) * 2 : 0) +
      (g13 ? (g13.perWeek ?? 0) * 4.3 + (g13.perMonth ?? 0) * 1 : 0) +
      (g14 ? (g14.perWeek ?? 0) * 4.3 + (g14.perMonth ?? 0) * 1 : 0) +
      (g15 ? (g15.perWeek ?? 0) * 8.6 + (g15.perMonth ?? 0) * 2 : 0) +
      (gK ? (gK.perWeek ?? 0) * 4.3 + (gK.perMonth ?? 0) * 1 : 0),
  );

  const p1 = pointsForGroup1(group1Avg);
  const p2 = pointsForGroup2(group2Avg);
  const p3 = pointsForGroup3(group3Sum);
  const p4 = a.diaet;

  return p1 + p2 + p3 + p4;
}

export function computeModule6Raw(a: Module6Answers): number {
  return sumLevels([a['4.6.1'], a['4.6.2'], a['4.6.3'], a['4.6.4'], a['4.6.5'], a['4.6.6']]);
}

export function lookupStepValue(table: StepTableEntry[], rawScore: number): number {
  const sorted = [...table].sort((a, b) => a.max - b.max);
  for (const entry of sorted) {
    if (rawScore <= entry.max) return entry.value;
  }
  return sorted[sorted.length - 1].value;
}

export function lookupPflegegrad(thresholds: ThresholdEntry[], totalScore: number): number {
  for (const t of thresholds) {
    if (totalScore >= t.min && totalScore < t.max) return t.pflegegrad;
  }
  return thresholds[thresholds.length - 1].pflegegrad;
}

export function calculatePflegegrad(input: PflegegradInput, ruleset: ScoringRuleset): PflegegradResult {
  const rawM1 = computeModule1Raw(input.module1);
  const rawM2 = computeModule2Raw(input.module2);
  const rawM3 = computeModule3Raw(input.module3);
  const rawM4 = computeModule4Raw(input.module4);
  const rawM5 = computeModule5Raw(input.module5);
  const rawM6 = computeModule6Raw(input.module6);

  const weightedM1 = lookupStepValue(ruleset.step_tables.m1, rawM1);
  const weightedM2 = lookupStepValue(ruleset.step_tables.m2, rawM2);
  const weightedM3 = lookupStepValue(ruleset.step_tables.m3, rawM3);
  const weightedM4 = lookupStepValue(ruleset.step_tables.m4, rawM4);
  const weightedM5 = lookupStepValue(ruleset.step_tables.m5, rawM5);
  const weightedM6 = lookupStepValue(ruleset.step_tables.m6, rawM6);

  const m2OrM3Used: 'm2' | 'm3' = weightedM2 >= weightedM3 ? 'm2' : 'm3';
  const m2OrM3Value = Math.max(weightedM2, weightedM3);

  const totalScore = weightedM1 + m2OrM3Value + weightedM4 + weightedM5 + weightedM6;

  const pflegegrad = input.besondereBedarfskonstellation
    ? 5
    : lookupPflegegrad(ruleset.pflegegrad_thresholds, totalScore);

  return {
    moduleRawScores: { m1: rawM1, m2: rawM2, m3: rawM3, m4: rawM4, m5: rawM5, m6: rawM6 },
    moduleWeightedScores: {
      m1: weightedM1, m2: weightedM2, m3: weightedM3, m4: weightedM4, m5: weightedM5, m6: weightedM6,
    },
    m2OrM3Used,
    totalScore,
    pflegegrad,
    besondereBedarfskonstellation: input.besondereBedarfskonstellation,
  };
}
