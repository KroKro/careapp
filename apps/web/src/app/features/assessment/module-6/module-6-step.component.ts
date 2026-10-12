import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AssessmentService } from '../data-access/assessment.service';
import { INDEPENDENCE_SCALE, MODULE6_QUESTIONS } from '../module-configs';
import { QUESTION_EXPLANATIONS } from '../question-explanations';
import { LevelQuestionGroupComponent } from '../shared/level-question-group/level-question-group.component';
import { WizardProgressComponent } from '../shared/wizard-progress/wizard-progress.component';

@Component({
  selector: 'app-module-6-step',
  standalone: true,
  imports: [ReactiveFormsModule, LevelQuestionGroupComponent, WizardProgressComponent],
  templateUrl: './module-6-step.component.html',
})
export class Module6StepComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly questions = MODULE6_QUESTIONS;
  readonly scaleLabels = INDEPENDENCE_SCALE;
  readonly explanations = QUESTION_EXPLANATIONS;
  readonly saving = signal(false);
  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;

  readonly form = this.fb.group(
    Object.fromEntries(this.questions.map((q) => [q.id, this.fb.control(0)])),
  );

  async ngOnInit() {
    const existing = await this.assessmentService.getModuleAnswers(this.assessmentId, 6);
    if (existing) this.form.patchValue(existing as any);
  }

  async submit() {
    this.saving.set(true);
    try {
      await this.assessmentService.saveModuleAnswers(this.assessmentId, 6, this.form.getRawValue(), 'summary');
      this.router.navigate(['/assessment', this.assessmentId, 'summary']);
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/assessment', this.assessmentId, 'module', 5]);
  }

  cancel() {
    this.router.navigate(['/assessment']);
  }
}
