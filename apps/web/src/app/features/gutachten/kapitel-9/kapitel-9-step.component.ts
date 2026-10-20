import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { autosaveOnChange } from '../../assessment/autosave';
import { AssessmentService } from '../../assessment/data-access/assessment.service';

@Component({
  selector: 'app-kapitel-9-step',
  standalone: true,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './kapitel-9-step.component.html',
})
export class Kapitel9StepComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  readonly saving = signal(false);

  readonly form = this.fb.group({
    prognose: [''],
    wiederholungstermin: [''],
    gutachterName1: [''],
    gutachterName2: [''],
    gutachterName3: [''],
  });

  private readonly subscriptions = new Subscription();

  async ngOnInit() {
    const existing = await this.assessmentService.getChapterAnswers(this.assessmentId, 'kap9');
    if (existing) this.form.patchValue(existing as any);
    this.subscriptions.add(
      autosaveOnChange(this.form.valueChanges, (v) =>
        this.assessmentService.saveChapterAnswers(this.assessmentId, 'kap9', v),
      ),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async submit() {
    this.saving.set(true);
    try {
      await this.assessmentService.saveChapterAnswers(this.assessmentId, 'kap9', this.form.getRawValue());
      await this.assessmentService.setCurrentStep(this.assessmentId, 'fertig');
      this.router.navigate(['/results', this.assessmentId]);
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/gutachten', this.assessmentId, 'kap8']);
  }
}
