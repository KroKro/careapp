import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AssessmentService } from '../data-access/assessment.service';
import { INDEPENDENCE_SCALE, MODULE1_QUESTIONS } from '../module-configs';
import { BESONDERE_BEDARFSKONSTELLATION_EXPLANATION, QUESTION_EXPLANATIONS } from '../question-explanations';
import { autosaveOnChange } from '../autosave';
import { computeModule1Raw, lookupStepValue, StepTableEntry } from '../scoring-preview';
import { LevelQuestionGroupComponent } from '../shared/level-question-group/level-question-group.component';
import { ModuleScoreSummaryComponent } from '../shared/module-score-summary/module-score-summary.component';
import { WizardProgressComponent } from '../shared/wizard-progress/wizard-progress.component';

@Component({
  selector: 'app-module-1-step',
  standalone: true,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, LevelQuestionGroupComponent, WizardProgressComponent, ModuleScoreSummaryComponent],
  templateUrl: './module-1-step.component.html',
})
export class Module1StepComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly questions = MODULE1_QUESTIONS;
  readonly scaleLabels = INDEPENDENCE_SCALE;
  readonly explanations = QUESTION_EXPLANATIONS;
  readonly besondereBedarfskonstellationExplanation = BESONDERE_BEDARFSKONSTELLATION_EXPLANATION;
  readonly saving = signal(false);
  readonly showBedarfskonstellationDetail = signal(false);
  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  private readonly basePath = (this.route.snapshot.data['basePath'] as string) ?? '/assessment';

  readonly form = this.fb.group({
    '4.1.1': [0],
    '4.1.2': [0],
    '4.1.3': [0],
    '4.1.4': [0],
    '4.1.5': [0],
    besondereBedarfskonstellation: [false],
  });

  // Live-Punktevorschau (Rohsumme/gewichteter Wert), analog zur Excel-Vorlage.
  readonly values = signal(this.form.getRawValue());
  readonly stepTable = signal<StepTableEntry[]>([]);
  readonly rawScore = computed(() => computeModule1Raw(this.values() as any));
  readonly weightedScore = computed(() => lookupStepValue(this.stepTable(), this.rawScore()));
  private readonly subscriptions = new Subscription();

  async ngOnInit() {
    this.subscriptions.add(this.form.valueChanges.subscribe(() => this.values.set(this.form.getRawValue())));
    this.subscriptions.add(
      autosaveOnChange(this.form.valueChanges, (v) =>
        this.assessmentService.autosaveModuleAnswers(this.assessmentId, 1, v),
      ),
    );

    const [existing, stepTables] = await Promise.all([
      this.assessmentService.getModuleAnswers(this.assessmentId, 1),
      this.assessmentService.getActiveStepTables(),
    ]);
    if (existing) this.form.patchValue(existing as any);
    this.values.set(this.form.getRawValue());
    this.stepTable.set(stepTables['m1'] ?? []);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async submit() {
    this.saving.set(true);
    try {
      await this.assessmentService.saveModuleAnswers(this.assessmentId, 1, this.form.getRawValue(), '2');
      this.router.navigate([this.basePath, this.assessmentId, 'module', 2]);
    } finally {
      this.saving.set(false);
    }
  }

  cancel() {
    this.router.navigate([this.basePath]);
  }
}
