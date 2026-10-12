import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../data-access/assessment.service';
import { INDEPENDENCE_SCALE, MODULE1_QUESTIONS } from '../module-configs';
import { BESONDERE_BEDARFSKONSTELLATION_EXPLANATION, QUESTION_EXPLANATIONS } from '../question-explanations';
import { LevelQuestionGroupComponent } from '../shared/level-question-group/level-question-group.component';
import { WizardProgressComponent } from '../shared/wizard-progress/wizard-progress.component';

@Component({
  selector: 'app-module-1-step',
  standalone: true,
  imports: [ReactiveFormsModule, LevelQuestionGroupComponent, WizardProgressComponent],
  templateUrl: './module-1-step.component.html',
})
export class Module1StepComponent implements OnInit {
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

  readonly form = this.fb.group({
    '4.1.1': [0],
    '4.1.2': [0],
    '4.1.3': [0],
    '4.1.4': [0],
    '4.1.5': [0],
    besondereBedarfskonstellation: [false],
  });

  async ngOnInit() {
    const existing = await this.assessmentService.getModuleAnswers(this.assessmentId, 1);
    if (existing) this.form.patchValue(existing as any);
  }

  async submit() {
    this.saving.set(true);
    try {
      await this.assessmentService.saveModuleAnswers(this.assessmentId, 1, this.form.getRawValue(), '2');
      this.router.navigate(['/assessment', this.assessmentId, 'module', 2]);
    } finally {
      this.saving.set(false);
    }
  }

  cancel() {
    this.router.navigate(['/assessment']);
  }
}
