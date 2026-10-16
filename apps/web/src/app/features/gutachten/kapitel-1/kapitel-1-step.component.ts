import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssessmentService } from '../../assessment/data-access/assessment.service';

export const WOHNSITUATIONEN = [
  'vollstationäre Pflegeeinrichtung',
  'stationäre Einrichtung nach § 43a SGB XI',
  'ambulante Wohnsituation alleine',
  'ambulante Wohnsituation mit anderen Personen',
  'ambulant betreute Wohngruppe',
];

export const PRAESENZ_TAG = [
  'nein',
  'mehrmals täglich',
  'überwiegend',
  'durchgehend',
];

export const UNTERSTUETZUNG_NACHT = [
  'nie oder max. einmal wöchentlich',
  'mehrmals wöchentlich',
  'einmal pro Nacht',
  'mehrmals nachts',
];

@Component({
  selector: 'app-kapitel-1-step',
  standalone: true,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './kapitel-1-step.component.html',
})
export class Kapitel1StepComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  readonly saving = signal(false);

  readonly wohnsituationen = WOHNSITUATIONEN;
  readonly praesenzTagOptionen = PRAESENZ_TAG;
  readonly unterstuetzungNachtOptionen = UNTERSTUETZUNG_NACHT;

  readonly form = this.fb.group({
    fremdbefunde: [''],
    anamnese: [''],
    rehaAntragGestellt: [false],
    hilfsmittel: [''],
    wohnsituation: [''],
    wohnsituationLeistungserbringer: [''],
    pflegeDurchEinrichtung: [false],
    pflegeeinrichtungLeistungserbringer: [''],
    versorgungssituationBeschreibung: [''],
    praesenzTag: [''],
    unterstuetzungNacht: [''],
    pflegepersonen: this.fb.array<ReturnType<typeof this.createPflegepersonGroup>>([]),
    wohnsituationBeschreibung: [''],
  });

  private createPflegepersonGroup(initial?: { name?: string; geburtsdatum?: string; telefon?: string }) {
    return this.fb.group({
      name: [initial?.name ?? ''],
      geburtsdatum: [initial?.geburtsdatum ?? ''],
      telefon: [initial?.telefon ?? ''],
    });
  }

  get pflegepersonen(): FormArray {
    return this.form.controls.pflegepersonen;
  }

  addPflegeperson() {
    this.pflegepersonen.push(this.createPflegepersonGroup());
  }

  removePflegeperson(index: number) {
    this.pflegepersonen.removeAt(index);
  }

  async ngOnInit() {
    const existing = (await this.assessmentService.getChapterAnswers(this.assessmentId, 'kap1')) as
      | Record<string, any>
      | null;
    if (!existing) return;
    this.form.patchValue({
      fremdbefunde: existing['fremdbefunde'] ?? '',
      anamnese: existing['anamnese'] ?? '',
      rehaAntragGestellt: existing['rehaAntragGestellt'] ?? false,
      hilfsmittel: existing['hilfsmittel'] ?? '',
      wohnsituation: existing['wohnsituation'] ?? '',
      wohnsituationLeistungserbringer: existing['wohnsituationLeistungserbringer'] ?? '',
      pflegeDurchEinrichtung: existing['pflegeDurchEinrichtung'] ?? false,
      pflegeeinrichtungLeistungserbringer: existing['pflegeeinrichtungLeistungserbringer'] ?? '',
      versorgungssituationBeschreibung: existing['versorgungssituationBeschreibung'] ?? '',
      praesenzTag: existing['praesenzTag'] ?? '',
      unterstuetzungNacht: existing['unterstuetzungNacht'] ?? '',
      wohnsituationBeschreibung: existing['wohnsituationBeschreibung'] ?? '',
    });
    const personen = (existing['pflegepersonen'] as Array<{ name?: string; geburtsdatum?: string; telefon?: string }>) ?? [];
    for (const p of personen) {
      this.pflegepersonen.push(this.createPflegepersonGroup(p));
    }
  }

  async submit() {
    this.saving.set(true);
    try {
      await this.assessmentService.saveChapterAnswers(this.assessmentId, 'kap1', this.form.getRawValue());
      await this.assessmentService.setCurrentStep(this.assessmentId, 'kap2');
      this.router.navigate(['/gutachten', this.assessmentId, 'kap2']);
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/gutachten', this.assessmentId, 'stammdaten']);
  }
}
