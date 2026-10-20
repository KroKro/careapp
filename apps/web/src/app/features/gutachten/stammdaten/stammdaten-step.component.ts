import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AssessmentService } from '../../assessment/data-access/assessment.service';
import { autosaveOnChange } from '../../assessment/autosave';

export const ANTRAGSARTEN = [
  'Pflegegeld (§ 37 SGB XI)',
  'Ambulante Pflegesachleistungen (§ 36 SGB XI)',
  'Kombinationsleistung (§ 38 SGB XI)',
  'Kurzzeitpflege (§ 42 SGB XI)',
  'Teilstationäre Pflege (§ 41 SGB XI)',
  'Vollstationäre Pflege (§ 43 SGB XI)',
  'Pflege in vollstationären Einrichtungen der Hilfe für behinderte Menschen (§ 43a SGB XI)',
  'Entlastungsbetrag (§ 45b SGB XI)',
];

export const GUTACHTENARTEN = [
  'Erstantrag',
  'Erstantrag nach Eilbegutachtung',
  'Rückstufungsantrag',
  'Höherstufungsantrag',
  'Wiederholungsbegutachtung',
  'Widerspruch',
];

export const ERLEDIGUNGSARTEN = [
  'Persönliche Befunderhebung',
  'Aktenlage, da antragstellende Person verstorben',
  'Aktenlage, da persönliche Befunderhebung nicht zumutbar',
  'Aktenlage aus sonstigen Gründen',
];

export const ERLEDIGUNGSORTE = [
  'Häusliches Wohnumfeld der oder des Versicherten',
  'Vollstationäre Pflegeeinrichtung',
  'Kurzzeitpflegeeinrichtung',
  'Teilstationäre Pflegeeinrichtung',
  'Vollstationäre Einrichtungen der Hilfe für behinderte Menschen',
  'Hospiz',
  'Rehabilitationseinrichtung',
  'Krankenhaus',
  'Sonstiges',
];

@Component({
  selector: 'app-stammdaten-step',
  standalone: true,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './stammdaten-step.component.html',
})
export class StammdatenStepComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  readonly saving = signal(false);

  readonly antragsarten = ANTRAGSARTEN;
  readonly gutachtenarten = GUTACHTENARTEN;
  readonly erledigungsarten = ERLEDIGUNGSARTEN;
  readonly erledigungsorte = ERLEDIGUNGSORTE;
  readonly pflegegrade = [0, 1, 2, 3, 4, 5];

  readonly form = this.fb.group({
    antragsart: [''],
    gutachtenart: [''],
    antragsdatum: [''],
    bisherigerPflegegrad: [0],
    erledigungsart: [''],
    erledigungsort: [''],
    pflegekasseName: [''],
    gutachterName: [''],
    gutachterBeruf: [''],
  });

  private readonly subscriptions = new Subscription();

  async ngOnInit() {
    const existing = await this.assessmentService.getAdminData(this.assessmentId);
    if (existing) {
      const data = (existing.data ?? {}) as Record<string, string>;
      this.form.patchValue({
        antragsart: existing.antragsart ?? '',
        antragsdatum: existing.antragsdatum ?? '',
        bisherigerPflegegrad: existing.bisheriger_pflegegrad ?? 0,
        erledigungsart: existing.erledigungsart ?? '',
        erledigungsort: existing.erledigungsort ?? '',
        gutachtenart: data['gutachtenart'] ?? '',
        pflegekasseName: data['pflegekasseName'] ?? '',
        gutachterName: data['gutachterName'] ?? '',
        gutachterBeruf: data['gutachterBeruf'] ?? '',
      });
    }
    this.subscriptions.add(
      autosaveOnChange(this.form.valueChanges, () =>
        this.assessmentService.saveAdminData(this.assessmentId, this.buildAdminData()),
      ),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private buildAdminData() {
    const v = this.form.getRawValue();
    return {
      antragsart: v.antragsart || null,
      erledigungsart: v.erledigungsart || null,
      erledigungsort: v.erledigungsort || null,
      antragsdatum: v.antragsdatum || null,
      bisheriger_pflegegrad: v.bisherigerPflegegrad ?? null,
      data: {
        gutachtenart: v.gutachtenart,
        pflegekasseName: v.pflegekasseName,
        gutachterName: v.gutachterName,
        gutachterBeruf: v.gutachterBeruf,
      },
    };
  }

  async submit() {
    this.saving.set(true);
    try {
      await this.assessmentService.saveAdminData(this.assessmentId, this.buildAdminData());
      await this.assessmentService.setCurrentStep(this.assessmentId, 'kap1');
      this.router.navigate(['/gutachten', this.assessmentId, 'kap1']);
    } finally {
      this.saving.set(false);
    }
  }
}
