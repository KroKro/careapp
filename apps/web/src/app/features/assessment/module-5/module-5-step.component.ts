import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../data-access/assessment.service';
import {
  INDEPENDENCE_SCALE,
  MODULE5_GROUP1_QUESTIONS,
  MODULE5_GROUP2_QUESTIONS,
  MODULE5_GROUP3_QUESTIONS,
} from '../module-configs';
import { QUESTION_EXPLANATIONS } from '../question-explanations';
import { FrequencyQuestionGroupComponent } from '../shared/frequency-question-group/frequency-question-group.component';
import { LevelQuestionGroupComponent } from '../shared/level-question-group/level-question-group.component';
import { WizardProgressComponent } from '../shared/wizard-progress/wizard-progress.component';

function buildFrequencyGroup(fb: FormBuilder, ids: string[]) {
  return fb.group(
    Object.fromEntries(
      ids.map((id) => [
        id,
        fb.group({ perDay: [0], perWeek: [0], perMonth: [0] }),
      ]),
    ),
  );
}

@Component({
  selector: 'app-module-5-step',
  standalone: true,
  imports: [ReactiveFormsModule, FrequencyQuestionGroupComponent, LevelQuestionGroupComponent, WizardProgressComponent],
  templateUrl: './module-5-step.component.html',
})
export class Module5StepComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly group1Questions = MODULE5_GROUP1_QUESTIONS;
  readonly group2Questions = MODULE5_GROUP2_QUESTIONS;
  readonly group3Questions = MODULE5_GROUP3_QUESTIONS;
  readonly diaetQuestions = [
    { id: 'diaet', label: 'Einhalten einer Diät und anderer krankheits- oder therapiebedingter Verhaltensvorschriften' },
  ];
  readonly scaleLabels = INDEPENDENCE_SCALE;
  readonly explanations = QUESTION_EXPLANATIONS;
  readonly saving = signal(false);
  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  private readonly basePath = (this.route.snapshot.data['basePath'] as string) ?? '/assessment';

  readonly group1Form = buildFrequencyGroup(this.fb, this.group1Questions.map((q) => q.id));
  readonly group2Form = buildFrequencyGroup(this.fb, this.group2Questions.map((q) => q.id));
  readonly group3Form = buildFrequencyGroup(this.fb, this.group3Questions.map((q) => q.id));
  readonly diaetForm = this.fb.group({ diaet: [0] });

  async ngOnInit() {
    const existing = await this.assessmentService.getModuleAnswers(this.assessmentId, 5);
    if (!existing) return;
    const group1 = (existing['group1'] as Record<string, unknown>) ?? {};
    const group2 = (existing['group2'] as Record<string, unknown>) ?? {};
    const group3 = (existing['group3'] as Record<string, unknown>) ?? {};
    this.group1Form.patchValue(group1 as any);
    this.group2Form.patchValue(group2 as any);
    this.group3Form.patchValue(group3 as any);
    this.diaetForm.patchValue({ diaet: (existing['diaet'] as number) ?? 0 });
  }

  async submit() {
    this.saving.set(true);
    try {
      const answers = {
        group1: this.group1Form.getRawValue(),
        group2: this.group2Form.getRawValue(),
        group3: this.group3Form.getRawValue(),
        diaet: this.diaetForm.getRawValue().diaet,
      };
      await this.assessmentService.saveModuleAnswers(this.assessmentId, 5, answers, '6');
      this.router.navigate([this.basePath, this.assessmentId, 'module', 6]);
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate([this.basePath, this.assessmentId, 'module', 4]);
  }

  cancel() {
    this.router.navigate([this.basePath]);
  }
}
