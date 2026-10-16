import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssessmentService } from '../../assessment/data-access/assessment.service';

@Component({
  selector: 'app-kapitel-3-step',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './kapitel-3-step.component.html',
})
export class Kapitel3StepComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  readonly saving = signal(false);

  readonly form = this.fb.group({
    diagnosen: this.fb.array<ReturnType<typeof this.createDiagnoseGroup>>([]),
    weitereDiagnosen: [''],
  });

  private createDiagnoseGroup(initial?: { bezeichnung?: string; icdCode?: string }) {
    return this.fb.group({
      bezeichnung: [initial?.bezeichnung ?? ''],
      icdCode: [initial?.icdCode ?? ''],
    });
  }

  get diagnosen(): FormArray {
    return this.form.controls.diagnosen;
  }

  addDiagnose() {
    this.diagnosen.push(this.createDiagnoseGroup());
  }

  removeDiagnose(index: number) {
    this.diagnosen.removeAt(index);
  }

  async ngOnInit() {
    const existing = (await this.assessmentService.getChapterAnswers(this.assessmentId, 'kap3')) as
      | Record<string, any>
      | null;
    this.form.patchValue({ weitereDiagnosen: existing?.['weitereDiagnosen'] ?? '' });
    const diagnosen = (existing?.['diagnosen'] as Array<{ bezeichnung?: string; icdCode?: string }>) ?? [];
    for (const d of diagnosen) {
      this.diagnosen.push(this.createDiagnoseGroup(d));
    }
    if (this.diagnosen.length === 0) this.addDiagnose();
  }

  async submit() {
    this.saving.set(true);
    try {
      await this.assessmentService.saveChapterAnswers(this.assessmentId, 'kap3', this.form.getRawValue());
      await this.assessmentService.setCurrentStep(this.assessmentId, '1');
      this.router.navigate(['/gutachten', this.assessmentId, 'module', 1]);
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/gutachten', this.assessmentId, 'kap2']);
  }
}
