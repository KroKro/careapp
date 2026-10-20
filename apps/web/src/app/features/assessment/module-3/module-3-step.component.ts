import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AssessmentService } from '../data-access/assessment.service';
import { FREQUENCY_SCALE, MODULE3_QUESTIONS } from '../module-configs';
import { QUESTION_EXPLANATIONS } from '../question-explanations';
import { autosaveOnChange } from '../autosave';
import { computeModule3Raw, FREQUENCY_POINTS, lookupStepValue, StepTableEntry } from '../scoring-preview';
import { LevelQuestionGroupComponent } from '../shared/level-question-group/level-question-group.component';
import { ModuleScoreSummaryComponent } from '../shared/module-score-summary/module-score-summary.component';
import { WizardProgressComponent } from '../shared/wizard-progress/wizard-progress.component';

@Component({
  selector: 'app-module-3-step',
  standalone: true,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, LevelQuestionGroupComponent, WizardProgressComponent, ModuleScoreSummaryComponent],
  templateUrl: './module-3-step.component.html',
})
export class Module3StepComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly questions = MODULE3_QUESTIONS;
  readonly scaleLabels = FREQUENCY_SCALE;
  readonly explanations = QUESTION_EXPLANATIONS;
  readonly saving = signal(false);
  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  private readonly basePath = (this.route.snapshot.data['basePath'] as string) ?? '/assessment';

  // Modul 3 bewertet Haeufigkeit, nicht Selbstaendigkeit -- die Punktetabelle
  // ist daher 0/1/3/5 statt 0-3, siehe FREQUENCY_POINTS in scoring-preview.ts.
  readonly pointsMap = (_questionId: string, level: number) => FREQUENCY_POINTS[(level ?? 0) as 0 | 1 | 2 | 3];

  readonly form = this.fb.group(
    Object.fromEntries(this.questions.map((q) => [q.id, this.fb.control(0)])),
  );

  readonly values = signal(this.form.getRawValue());
  readonly stepTable = signal<StepTableEntry[]>([]);
  readonly rawScore = computed(() => computeModule3Raw(this.values() as any));
  readonly weightedScore = computed(() => lookupStepValue(this.stepTable(), this.rawScore()));
  private readonly subscriptions = new Subscription();

  async ngOnInit() {
    this.subscriptions.add(this.form.valueChanges.subscribe(() => this.values.set(this.form.getRawValue())));
    this.subscriptions.add(
      autosaveOnChange(this.form.valueChanges, (v) =>
        this.assessmentService.autosaveModuleAnswers(this.assessmentId, 3, v),
      ),
    );

    const [existing, stepTables] = await Promise.all([
      this.assessmentService.getModuleAnswers(this.assessmentId, 3),
      this.assessmentService.getActiveStepTables(),
    ]);
    if (existing) this.form.patchValue(existing as any);
    this.values.set(this.form.getRawValue());
    this.stepTable.set(stepTables['m3'] ?? []);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async submit() {
    this.saving.set(true);
    try {
      await this.assessmentService.saveModuleAnswers(this.assessmentId, 3, this.form.getRawValue(), '4');
      this.router.navigate([this.basePath, this.assessmentId, 'module', 4]);
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate([this.basePath, this.assessmentId, 'module', 2]);
  }

  cancel() {
    this.router.navigate([this.basePath]);
  }
}
