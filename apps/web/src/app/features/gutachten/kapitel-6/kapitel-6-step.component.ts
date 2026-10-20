import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { autosaveOnChange } from '../../assessment/autosave';
import { INDEPENDENCE_SCALE, LevelQuestionConfig } from '../../assessment/module-configs';
import { AssessmentService } from '../../assessment/data-access/assessment.service';
import { LevelQuestionGroupComponent } from '../../assessment/shared/level-question-group/level-question-group.component';

export const VERLASSEN_OPTIONEN = [
  'selbständig (ohne Begleitung)',
  'überwiegend selbständig (mit Unterstützung, aber auch mit Eigenaktivität der Person)',
  'überwiegend/völlig unselbständig, Hilfe durch eine Person reicht jedoch aus',
  'überwiegend/völlig unselbständig, Hilfe durch zwei Personen erforderlich',
];

export const FORTBEWEGUNG_OPTIONEN = [
  'selbständig (ohne Begleitung)',
  'nur auf gewohnten Wegen selbständig',
  'auf allen Wegen nur mit personeller Hilfe möglich',
  'auch mit personeller Hilfe nicht möglich',
];

export const OEPNV_OPTIONEN = [
  'selbständig (ohne Begleitung)',
  'nur auf gewohnten Strecken selbständig',
  'auf allen Strecken nur mit personeller Hilfe möglich',
  'auch mit personeller Hilfe nicht möglich',
];

export const KFZ_OPTIONEN = [
  'selbständig',
  'benötigt nur Hilfe beim Ein-/Aussteigen (Hilfsperson während der Fahrt ist nicht erforderlich)',
  'benötigt Hilfe (auch) während der Fahrt mit dem PKW/Taxi (zusätzlich zum Fahrer)',
  'nicht möglich, Liegendtransport oder Transport im Rollstuhl (Spezialfahrzeuge) notwendig',
];

export const TEILNAHME_OPTIONEN = [
  'Teilnahme ist selbständig möglich',
  'nicht selbständig, Teilnahme ist nur mit unterstützender Begleitung möglich',
  'Teilnahme ist auch mit unterstützender Begleitung nicht möglich',
];

export const BESUCH_ARBEITSPLATZ_OPTIONEN = [
  'Schule',
  'Kindergarten, Kindertagesstätte, Kinderhort',
  'Werkstatt für behinderte Menschen',
  'Tages- oder Nachtpflegeeinrichtung',
  'Tagesbetreuung',
  'niedrigschwellige Angebote',
  'keine',
];

export const HAUSHALT_QUESTIONS: LevelQuestionConfig[] = [
  { id: 'einkaufen', label: 'Einkaufen für den täglichen Bedarf' },
  { id: 'einfacheMahlzeiten', label: 'Zubereitung einfacher Mahlzeiten' },
  { id: 'einfacheReinigung', label: 'Einfache Aufräum- und Reinigungsarbeiten' },
  { id: 'aufwendigeReinigung', label: 'Aufwendige Aufräum- und Reinigungsarbeiten, einschließlich Wäschepflege' },
  { id: 'dienstleistungen', label: 'Nutzung von Dienstleistungen' },
  { id: 'finanzen', label: 'Umgang mit finanziellen Angelegenheiten' },
  { id: 'behoerden', label: 'Umgang mit Behördenangelegenheiten' },
];

@Component({
  selector: 'app-kapitel-6-step',
  standalone: true,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, RouterLink, LevelQuestionGroupComponent],
  templateUrl: './kapitel-6-step.component.html',
})
export class Kapitel6StepComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  readonly saving = signal(false);

  readonly verlassenOptionen = VERLASSEN_OPTIONEN;
  readonly fortbewegungOptionen = FORTBEWEGUNG_OPTIONEN;
  readonly oepnvOptionen = OEPNV_OPTIONEN;
  readonly kfzOptionen = KFZ_OPTIONEN;
  readonly teilnahmeOptionen = TEILNAHME_OPTIONEN;
  readonly besuchArbeitsplatzOptionen = BESUCH_ARBEITSPLATZ_OPTIONEN;
  readonly haushaltQuestions = HAUSHALT_QUESTIONS;
  readonly scaleLabels = INDEPENDENCE_SCALE;

  readonly form = this.fb.group({
    verlassenWohnung: [''],
    fortbewegungAusserhalb: [''],
    nutzungOepnv: [''],
    mitfahrenKfz: [''],
    erlaeuterungMobilitaet: [''],
    teilnahmeVeranstaltungen: [''],
    erlaeuterungVeranstaltungen: [''],
    besuchArbeitsplatz: this.fb.control<string[]>([]),
    teilnahmeSonstigeAktivitaeten: [''],
    erlaeuterungSonstigeAktivitaeten: [''],
    erlaeuterungHaushalt: [''],
  });

  readonly haushaltForm = this.fb.group(
    Object.fromEntries(this.haushaltQuestions.map((q) => [q.id, this.fb.control(0)])),
  );

  toggleArbeitsplatzOption(option: string, checked: boolean) {
    const current = this.form.controls.besuchArbeitsplatz.value ?? [];
    this.form.controls.besuchArbeitsplatz.setValue(
      checked ? [...current, option] : current.filter((o) => o !== option),
    );
  }

  isArbeitsplatzChecked(option: string): boolean {
    return (this.form.controls.besuchArbeitsplatz.value ?? []).includes(option);
  }

  async ngOnInit() {
    const existing = (await this.assessmentService.getChapterAnswers(this.assessmentId, 'kap6')) as
      | Record<string, any>
      | null;
    if (existing) {
      this.form.patchValue({
        verlassenWohnung: existing['verlassenWohnung'] ?? '',
        fortbewegungAusserhalb: existing['fortbewegungAusserhalb'] ?? '',
        nutzungOepnv: existing['nutzungOepnv'] ?? '',
        mitfahrenKfz: existing['mitfahrenKfz'] ?? '',
        erlaeuterungMobilitaet: existing['erlaeuterungMobilitaet'] ?? '',
        teilnahmeVeranstaltungen: existing['teilnahmeVeranstaltungen'] ?? '',
        erlaeuterungVeranstaltungen: existing['erlaeuterungVeranstaltungen'] ?? '',
        besuchArbeitsplatz: existing['besuchArbeitsplatz'] ?? [],
        teilnahmeSonstigeAktivitaeten: existing['teilnahmeSonstigeAktivitaeten'] ?? '',
        erlaeuterungSonstigeAktivitaeten: existing['erlaeuterungSonstigeAktivitaeten'] ?? '',
        erlaeuterungHaushalt: existing['erlaeuterungHaushalt'] ?? '',
      });
      if (existing['haushalt']) this.haushaltForm.patchValue(existing['haushalt']);
    }

    this.subscriptions.add(autosaveOnChange(this.form.valueChanges, () => this.saveAnswers()));
    this.subscriptions.add(autosaveOnChange(this.haushaltForm.valueChanges, () => this.saveAnswers()));
  }

  private readonly subscriptions = new Subscription();

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private saveAnswers(): Promise<void> {
    const answers = {
      ...this.form.getRawValue(),
      haushalt: this.haushaltForm.getRawValue(),
    };
    return this.assessmentService.saveChapterAnswers(this.assessmentId, 'kap6', answers);
  }

  async submit() {
    this.saving.set(true);
    try {
      await this.saveAnswers();
      await this.assessmentService.setCurrentStep(this.assessmentId, 'kap7');
      this.router.navigate(['/gutachten', this.assessmentId, 'kap7']);
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/gutachten', this.assessmentId, 'summary']);
  }
}
