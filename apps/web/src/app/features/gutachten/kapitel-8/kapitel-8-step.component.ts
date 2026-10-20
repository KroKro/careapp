import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { autosaveOnChange } from '../../assessment/autosave';
import { AssessmentService } from '../../assessment/data-access/assessment.service';

@Component({
  selector: 'app-kapitel-8-step',
  standalone: true,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './kapitel-8-step.component.html',
})
export class Kapitel8StepComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  readonly saving = signal(false);

  readonly form = this.fb.group({
    hilfsmittel: this.fb.array<ReturnType<typeof this.createHilfsmittelGroup>>([]),
    hilfsmittelWeitereEmpfehlungen: [''],
    heilmittelKeine: [false],
    physikalischeTherapie: [''],
    ergotherapie: [''],
    sprachtherapie: [''],
    podologie: [''],
    andereTherapeutischeMassnahmen: [''],
    wohnumfeldMassnahmen: [''],
    edukativeMassnahmen: [''],
    praeventiveMassnahmen: [''],
    primaerpraevention: [''],
    pflegeberatung: [''],
    entlastungPflegeperson: [''],
    beratungRehaErforderlich: [false],
    widerspruchUebersendung: [false],
    sonstigeHinweise: [''],
  });

  private createHilfsmittelGroup(initial?: {
    produktart?: string;
    produktnummer?: string;
    erlaeuterung?: string;
    zustimmungLiegtVor?: boolean;
  }) {
    return this.fb.group({
      produktart: [initial?.produktart ?? ''],
      produktnummer: [initial?.produktnummer ?? ''],
      erlaeuterung: [initial?.erlaeuterung ?? ''],
      zustimmungLiegtVor: [initial?.zustimmungLiegtVor ?? false],
    });
  }

  get hilfsmittel(): FormArray {
    return this.form.controls.hilfsmittel;
  }

  addHilfsmittel() {
    this.hilfsmittel.push(this.createHilfsmittelGroup());
  }

  removeHilfsmittel(index: number) {
    this.hilfsmittel.removeAt(index);
  }

  async ngOnInit() {
    const existing = (await this.assessmentService.getChapterAnswers(this.assessmentId, 'kap8')) as
      | Record<string, any>
      | null;
    if (existing) {
      this.form.patchValue(existing);
      const items = (existing['hilfsmittel'] as Array<any>) ?? [];
      for (const item of items) {
        this.hilfsmittel.push(this.createHilfsmittelGroup(item));
      }
    }
    this.subscriptions.add(
      autosaveOnChange(this.form.valueChanges, (v) =>
        this.assessmentService.saveChapterAnswers(this.assessmentId, 'kap8', v),
      ),
    );
  }

  private readonly subscriptions = new Subscription();

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async submit() {
    this.saving.set(true);
    try {
      await this.assessmentService.saveChapterAnswers(this.assessmentId, 'kap8', this.form.getRawValue());
      await this.assessmentService.setCurrentStep(this.assessmentId, 'kap9');
      this.router.navigate(['/gutachten', this.assessmentId, 'kap9']);
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/gutachten', this.assessmentId, 'kap7']);
  }
}
