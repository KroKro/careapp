import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssessmentService } from '../../assessment/data-access/assessment.service';

@Component({
  selector: 'app-kapitel-2-step',
  standalone: true,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './kapitel-2-step.component.html',
})
export class Kapitel2StepComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  readonly saving = signal(false);

  readonly form = this.fb.group({
    befund: [''],
  });

  async ngOnInit() {
    const existing = await this.assessmentService.getChapterAnswers(this.assessmentId, 'kap2');
    if (existing) this.form.patchValue(existing as any);
  }

  async submit() {
    this.saving.set(true);
    try {
      await this.assessmentService.saveChapterAnswers(this.assessmentId, 'kap2', this.form.getRawValue());
      await this.assessmentService.setCurrentStep(this.assessmentId, 'kap3');
      this.router.navigate(['/gutachten', this.assessmentId, 'kap3']);
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/gutachten', this.assessmentId, 'kap1']);
  }
}
