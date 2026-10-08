// deno test --allow-env --allow-net supabase/functions
// Testfaelle gegen die aus der Excel-Vorlage/BRi-Richtlinie verifizierten
// Stufentabellen (muss mit supabase/seed.sql::BRi-2026 uebereinstimmen).

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  calculatePflegegrad,
  type Module1Answers,
  type Module2Answers,
  type Module3Answers,
  type Module4Answers,
  type Module5Answers,
  type Module6Answers,
  type PflegegradInput,
  type ScoringRuleset,
} from './scoring.ts';

const RULESET: ScoringRuleset = {
  step_tables: {
    m1: [{ max: 1, value: 0 }, { max: 3, value: 2.5 }, { max: 5, value: 5 }, { max: 9, value: 7.5 }, { max: 15, value: 10 }],
    m2: [{ max: 1, value: 0 }, { max: 5, value: 3.75 }, { max: 10, value: 7.5 }, { max: 16, value: 11.25 }, { max: 33, value: 15 }],
    m3: [{ max: 0, value: 0 }, { max: 2, value: 3.75 }, { max: 4, value: 7.5 }, { max: 6, value: 11.25 }, { max: 65, value: 15 }],
    m4: [{ max: 2, value: 0 }, { max: 7, value: 10 }, { max: 18, value: 20 }, { max: 36, value: 30 }, { max: 54, value: 40 }],
    m5: [{ max: 0, value: 0 }, { max: 1, value: 5 }, { max: 3, value: 10 }, { max: 5, value: 15 }, { max: 15, value: 20 }],
    m6: [{ max: 0, value: 0 }, { max: 3, value: 3.75 }, { max: 6, value: 7.5 }, { max: 11, value: 11.25 }, { max: 18, value: 15 }],
  },
  pflegegrad_thresholds: [
    { min: 0, max: 12.5, pflegegrad: 0 },
    { min: 12.5, max: 27, pflegegrad: 1 },
    { min: 27, max: 47.5, pflegegrad: 2 },
    { min: 47.5, max: 70, pflegegrad: 3 },
    { min: 70, max: 90, pflegegrad: 4 },
    { min: 90, max: 100.01, pflegegrad: 5 },
  ],
};

const module1Zero: Module1Answers = {
  '4.1.1': 0, '4.1.2': 0, '4.1.3': 0, '4.1.4': 0, '4.1.5': 0,
};
const module2Zero: Module2Answers = {
  '4.2.1': 0, '4.2.2': 0, '4.2.3': 0, '4.2.4': 0, '4.2.5': 0, '4.2.6': 0,
  '4.2.7': 0, '4.2.8': 0, '4.2.9': 0, '4.2.10': 0, '4.2.11': 0,
};
const module3Zero: Module3Answers = {
  '4.3.1': 0, '4.3.2': 0, '4.3.3': 0, '4.3.4': 0, '4.3.5': 0, '4.3.6': 0, '4.3.7': 0,
  '4.3.8': 0, '4.3.9': 0, '4.3.10': 0, '4.3.11': 0, '4.3.12': 0, '4.3.13': 0,
};
const module4Zero: Module4Answers = {
  '4.4.1': 0, '4.4.2': 0, '4.4.3': 0, '4.4.4': 0, '4.4.5': 0, '4.4.6': 0, '4.4.7': 0,
  '4.4.8': 0, '4.4.9': 0, '4.4.10': 0, '4.4.13': 0,
};
const module5Zero: Module5Answers = {
  group1: {}, group2: {}, group3: {}, diaet: 0,
};
const module6Zero: Module6Answers = {
  '4.6.1': 0, '4.6.2': 0, '4.6.3': 0, '4.6.4': 0, '4.6.5': 0, '4.6.6': 0,
};

function baseInput(overrides: Partial<PflegegradInput> = {}): PflegegradInput {
  return {
    module1: module1Zero,
    module2: module2Zero,
    module3: module3Zero,
    module4: module4Zero,
    module5: module5Zero,
    module6: module6Zero,
    besondereBedarfskonstellation: false,
    ...overrides,
  };
}

Deno.test('alles unauffaellig -> kein Pflegegrad (0)', () => {
  const result = calculatePflegegrad(baseInput(), RULESET);
  assertEquals(result.totalScore, 0);
  assertEquals(result.pflegegrad, 0);
});

Deno.test('alles maximal unselbstaendig -> 100 Punkte, Pflegegrad 5', () => {
  const module1: Module1Answers = { '4.1.1': 3, '4.1.2': 3, '4.1.3': 3, '4.1.4': 3, '4.1.5': 3 };
  const module2: Module2Answers = {
    '4.2.1': 3, '4.2.2': 3, '4.2.3': 3, '4.2.4': 3, '4.2.5': 3, '4.2.6': 3,
    '4.2.7': 3, '4.2.8': 3, '4.2.9': 3, '4.2.10': 3, '4.2.11': 3,
  };
  const module3: Module3Answers = {
    '4.3.1': 3, '4.3.2': 3, '4.3.3': 3, '4.3.4': 3, '4.3.5': 3, '4.3.6': 3, '4.3.7': 3,
    '4.3.8': 3, '4.3.9': 3, '4.3.10': 3, '4.3.11': 3, '4.3.12': 3, '4.3.13': 3,
  };
  const module4: Module4Answers = {
    '4.4.1': 3, '4.4.2': 3, '4.4.3': 3, '4.4.4': 3, '4.4.5': 3, '4.4.6': 3, '4.4.7': 3,
    '4.4.8': 3, '4.4.9': 3, '4.4.10': 3, '4.4.11': 3, '4.4.12': 3, '4.4.13': 1,
  };
  const module5: Module5Answers = {
    group1: { '4.5.1': { perDay: 10 } },
    group2: { '4.5.8': { perDay: 5 } },
    group3: { '4.5.12': { perDay: 1 } },
    diaet: 3,
  };
  const module6: Module6Answers = { '4.6.1': 3, '4.6.2': 3, '4.6.3': 3, '4.6.4': 3, '4.6.5': 3, '4.6.6': 3 };

  const result = calculatePflegegrad(
    baseInput({ module1, module2, module3, module4, module5, module6 }),
    RULESET,
  );

  assertEquals(result.moduleRawScores, { m1: 15, m2: 33, m3: 65, m4: 54, m5: 15, m6: 18 });
  assertEquals(result.moduleWeightedScores, { m1: 10, m2: 15, m3: 15, m4: 40, m5: 20, m6: 15 });
  assertEquals(result.totalScore, 100);
  assertEquals(result.pflegegrad, 5);
});

Deno.test('nur Modul 3 auffaellig -> hoeherer Wert aus M2/M3 zaehlt, Pflegegrad 1', () => {
  // Level 2 -> FREQUENCY_POINTS[2] = 3 Punkte je Kriterium; wir brauchen Rohsumme > 6 fuer die 15-Punkte-Stufe.
  const module3High: Module3Answers = {
    ...module3Zero,
    '4.3.1': 2, '4.3.2': 2, '4.3.3': 2, // je 3 Punkte -> Rohsumme 9 (> 6 -> oberste Stufe)
  };
  const result = calculatePflegegrad(baseInput({ module3: module3High }), RULESET);

  assertEquals(result.moduleRawScores.m3, 9);
  assertEquals(result.moduleWeightedScores.m3, 15);
  assertEquals(result.moduleWeightedScores.m2, 0);
  assertEquals(result.m2OrM3Used, 'm3');
  assertEquals(result.totalScore, 15);
  assertEquals(result.pflegegrad, 1);
});

Deno.test('besondere Bedarfskonstellation erzwingt Pflegegrad 5 unabhaengig vom Punktwert', () => {
  const result = calculatePflegegrad(baseInput({ besondereBedarfskonstellation: true }), RULESET);
  assertEquals(result.totalScore, 0);
  assertEquals(result.pflegegrad, 5);
});

Deno.test('Modul 4 Sonderfaelle: parenterale Ernaehrung "taeglich zusaetzlich" zaehlt mehr als "ausschliesslich"', () => {
  const withZusaetzlich = calculatePflegegrad(
    baseInput({ module4: { ...module4Zero, '4.4.13': 1 } }),
    RULESET,
  );
  const withAusschliesslich = calculatePflegegrad(
    baseInput({ module4: { ...module4Zero, '4.4.13': 2 } }),
    RULESET,
  );
  assertEquals(withZusaetzlich.moduleRawScores.m4, 6);
  assertEquals(withAusschliesslich.moduleRawScores.m4, 3);
});

Deno.test('Modul 4: Inkontinenz-Kriterien zaehlen nur, wenn angegeben (undefined = 0)', () => {
  const result = calculatePflegegrad(
    baseInput({ module4: { ...module4Zero, '4.4.11': 3, '4.4.12': undefined } }),
    RULESET,
  );
  assertEquals(result.moduleRawScores.m4, 3);
});

Deno.test('Pflegegrad-Schwellen: 47.5 zaehlt bereits zu Pflegegrad 3', () => {
  const thresholds = RULESET.pflegegrad_thresholds;
  const result = calculatePflegegrad(
    baseInput({
      module1: { ...module1Zero, '4.1.1': 3, '4.1.2': 3, '4.1.3': 3, '4.1.4': 3, '4.1.5': 3 }, // 10
      module4: { ...module4Zero, '4.4.1': 3, '4.4.2': 3, '4.4.3': 3, '4.4.4': 3, '4.4.5': 3, '4.4.6': 3, '4.4.7': 2 }, // raw 20 -> weighted 30
      module6: { ...module6Zero, '4.6.1': 3, '4.6.2': 3, '4.6.3': 3, '4.6.4': 3, '4.6.5': 2, '4.6.6': 0 }, // raw 14 -> weighted 15
    }),
    RULESET,
  );
  // 10 (M1) + 0 (M2/M3) + 30 (M4) + 0 (M5) + 15 (M6) = 55 -> Pflegegrad 3 (47.5 bis <70)
  assertEquals(result.totalScore, 55);
  assertEquals(result.pflegegrad, 3);
  assertEquals(thresholds[3], { min: 47.5, max: 70, pflegegrad: 3 });
});
