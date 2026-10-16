import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AssessmentService } from '../data-access/assessment.service';
import { INDEPENDENCE_SCALE, MODULE4_BASE_QUESTIONS, MODULE4_WEIGHTED_QUESTIONS } from '../module-configs';
import { QUESTION_EXPLANATIONS } from '../question-explanations';
import {
  computeModule4Raw,
  lookupStepValue,
  PARENTERAL_POINTS,
  StepTableEntry,
} from '../scoring-preview';
import { LevelQuestionGroupComponent } from '../shared/level-question-group/level-question-group.component';
import { ModuleScoreSummaryComponent, ScoreBreakdownItem } from '../shared/module-score-summary/module-score-summary.component';
import { WizardProgressComponent } from '../shared/wizard-progress/wizard-progress.component';

// Essen (x3), Trinken (x2), Benutzen einer Toilette (x2) -- siehe
// supabase/functions/_shared/scoring.ts computeModule4Raw.
const WEIGHTED_MULTIPLIERS: Record<string, number> = { '4.4.8': 3, '4.4.9': 2, '4.4.10': 2 };

@Component({
  selector: 'app-module-4-step',
  standalone: true,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, LevelQuestionGroupComponent, WizardProgressComponent, ModuleScoreSummaryComponent],
  templateUrl: './module-4-step.component.html',
})
export class Module4StepComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly baseQuestions = MODULE4_BASE_QUESTIONS;
  readonly weightedQuestions = MODULE4_WEIGHTED_QUESTIONS;
  readonly scaleLabels = INDEPENDENCE_SCALE;
  readonly explanations = QUESTION_EXPLANATIONS;
  readonly saving = signal(false);
  // Erläuterung wird pro Antwortoption einzeln ein-/ausgeblendet, siehe
  // level-question-group.component.ts fuer die Begruendung.
  readonly openExplanation = signal<string | null>(null);

  readonly weightedPointsMap = (questionId: string, level: number) => level * (WEIGHTED_MULTIPLIERS[questionId] ?? 1);

  isExplanationOpen(questionId: string, level: number): boolean {
    return this.openExplanation() === `${questionId}:${level}`;
  }

  toggleLevelExplanation(questionId: string, level: number) {
    const key = `${questionId}:${level}`;
    this.openExplanation.set(this.openExplanation() === key ? null : key);
  }
  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  private readonly basePath = (this.route.snapshot.data['basePath'] as string) ?? '/assessment';

  readonly baseForm = this.fb.group(
    Object.fromEntries(this.baseQuestions.map((q) => [q.id, this.fb.control(0)])),
  );
  readonly weightedForm = this.fb.group(
    Object.fromEntries(this.weightedQuestions.map((q) => [q.id, this.fb.control(0)])),
  );

  readonly incontinenceForm = this.fb.group({
    harnApplies: [false],
    harnLevel: [0],
    stuhlApplies: [false],
    stuhlLevel: [0],
  });

  readonly parenteralForm = this.fb.group({
    '4.4.13': [0 as 0 | 1 | 2],
  });

  // Siehe level-question-group.component.ts: Zoneless Change Detection
  // reagiert nicht auf blosse FormGroup-Wertaenderungen, daher hier per
  // valueChanges in Signale gespiegelt.
  readonly baseValues = signal(this.baseForm.getRawValue());
  readonly weightedValues = signal(this.weightedForm.getRawValue());
  readonly incontinenceValues = signal(this.incontinenceForm.getRawValue());
  readonly parenteralValues = signal(this.parenteralForm.getRawValue());
  readonly stepTable = signal<StepTableEntry[]>([]);
  private readonly subscriptions = new Subscription();

  readonly rawScore = computed(() =>
    computeModule4Raw(
      this.baseValues() as any,
      this.weightedValues() as any,
      this.incontinenceValues(),
      this.parenteralValues()['4.4.13'],
    ),
  );
  readonly weightedScore = computed(() => lookupStepValue(this.stepTable(), this.rawScore()));

  readonly breakdown = computed((): ScoreBreakdownItem[] => {
    const base = this.baseValues();
    const baseSum = Object.values(base).reduce<number>((sum, v) => sum + (v ?? 0), 0);
    const weighted = this.weightedValues();
    const weightedSum = Object.entries(weighted).reduce<number>(
      (sum, [id, v]) => sum + (v ?? 0) * (WEIGHTED_MULTIPLIERS[id] ?? 1),
      0,
    );
    const incontinence = this.incontinenceValues();
    const incontinenceSum =
      (incontinence.harnApplies ? (incontinence.harnLevel ?? 0) : 0) +
      (incontinence.stuhlApplies ? (incontinence.stuhlLevel ?? 0) : 0);
    const parenteral = PARENTERAL_POINTS[this.parenteralValues()['4.4.13'] ?? 0];
    return [
      { label: 'Basis-Kriterien', value: baseSum },
      { label: 'Essen/Trinken/Toilette (gewichtet)', value: weightedSum },
      { label: 'Inkontinenz', value: incontinenceSum },
      { label: 'Parenterale Ernährung', value: parenteral },
    ];
  });

  async ngOnInit() {
    this.subscriptions.add(this.baseForm.valueChanges.subscribe(() => this.baseValues.set(this.baseForm.getRawValue())));
    this.subscriptions.add(
      this.weightedForm.valueChanges.subscribe(() => this.weightedValues.set(this.weightedForm.getRawValue())),
    );
    this.subscriptions.add(
      this.incontinenceForm.valueChanges.subscribe(() =>
        this.incontinenceValues.set(this.incontinenceForm.getRawValue()),
      ),
    );
    this.subscriptions.add(
      this.parenteralForm.valueChanges.subscribe(() =>
        this.parenteralValues.set(this.parenteralForm.getRawValue()),
      ),
    );

    const [existing, stepTables] = await Promise.all([
      this.assessmentService.getModuleAnswers(this.assessmentId, 4),
      this.assessmentService.getActiveStepTables(),
    ]);
    this.stepTable.set(stepTables['m4'] ?? []);
    if (existing) {
      this.baseForm.patchValue(existing as any);
      this.weightedForm.patchValue(existing as any);
      this.parenteralForm.patchValue({ '4.4.13': existing['4.4.13'] as 0 | 1 | 2 });
      this.incontinenceForm.patchValue({
        harnApplies: existing['4.4.11'] !== undefined && existing['4.4.11'] !== null,
        harnLevel: (existing['4.4.11'] as number) ?? 0,
        stuhlApplies: existing['4.4.12'] !== undefined && existing['4.4.12'] !== null,
        stuhlLevel: (existing['4.4.12'] as number) ?? 0,
      });
    }
    this.baseValues.set(this.baseForm.getRawValue());
    this.weightedValues.set(this.weightedForm.getRawValue());
    this.incontinenceValues.set(this.incontinenceForm.getRawValue());
    this.parenteralValues.set(this.parenteralForm.getRawValue());
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async submit() {
    this.saving.set(true);
    try {
      const incontinence = this.incontinenceForm.getRawValue();
      const answers = {
        ...this.baseForm.getRawValue(),
        ...this.weightedForm.getRawValue(),
        ...this.parenteralForm.getRawValue(),
        '4.4.11': incontinence.harnApplies ? incontinence.harnLevel : undefined,
        '4.4.12': incontinence.stuhlApplies ? incontinence.stuhlLevel : undefined,
      };
      await this.assessmentService.saveModuleAnswers(this.assessmentId, 4, answers, '5');
      this.router.navigate([this.basePath, this.assessmentId, 'module', 5]);
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate([this.basePath, this.assessmentId, 'module', 3]);
  }

  cancel() {
    this.router.navigate([this.basePath]);
  }
}
