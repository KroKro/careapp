import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AssessmentService } from '../data-access/assessment.service';
import { COGNITIVE_SCALE, MODULE2_QUESTIONS } from '../module-configs';
import { QUESTION_EXPLANATIONS } from '../question-explanations';
import { autosaveOnChange } from '../autosave';
import { computeModule2Raw, lookupStepValue, StepTableEntry } from '../scoring-preview';
import { LevelQuestionGroupComponent } from '../shared/level-question-group/level-question-group.component';
import { ModuleScoreSummaryComponent } from '../shared/module-score-summary/module-score-summary.component';
import { WizardProgressComponent } from '../shared/wizard-progress/wizard-progress.component';

@Component({
  selector: 'app-module-2-step',
  standalone: true,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, LevelQuestionGroupComponent, WizardProgressComponent, ModuleScoreSummaryComponent],
  templateUrl: './module-2-step.component.html',
})
export class Module2StepComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly questions = MODULE2_QUESTIONS;
  readonly scaleLabels = COGNITIVE_SCALE;
  readonly explanations = QUESTION_EXPLANATIONS;
  readonly saving = signal(false);
  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  private readonly basePath = (this.route.snapshot.data['basePath'] as string) ?? '/assessment';

  readonly form = this.fb.group(
    Object.fromEntries(this.questions.map((q) => [q.id, this.fb.control(0)])),
  );

  readonly values = signal(this.form.getRawValue());
  readonly stepTable = signal<StepTableEntry[]>([]);
  readonly rawScore = computed(() => computeModule2Raw(this.values() as any));
  readonly weightedScore = computed(() => lookupStepValue(this.stepTable(), this.rawScore()));
  private readonly subscriptions = new Subscription();

  async ngOnInit() {
    this.subscriptions.add(this.form.valueChanges.subscribe(() => this.values.set(this.form.getRawValue())));
    this.subscriptions.add(
      autosaveOnChange(this.form.valueChanges, (v) =>
        this.assessmentService.autosaveModuleAnswers(this.assessmentId, 2, v),
      ),
    );

    const [existing, stepTables] = await Promise.all([
      this.assessmentService.getModuleAnswers(this.assessmentId, 2),
      this.assessmentService.getActiveStepTables(),
    ]);
    if (existing) this.form.patchValue(existing as any);
    this.values.set(this.form.getRawValue());
    this.stepTable.set(stepTables['m2'] ?? []);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async submit() {
    this.saving.set(true);
    try {
      await this.assessmentService.saveModuleAnswers(this.assessmentId, 2, this.form.getRawValue(), '3');
      this.router.navigate([this.basePath, this.assessmentId, 'module', 3]);
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate([this.basePath, this.assessmentId, 'module', 1]);
  }

  cancel() {
    this.router.navigate([this.basePath]);
  }
}
