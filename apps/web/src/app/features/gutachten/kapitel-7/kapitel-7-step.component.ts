import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AssessmentService } from '../../assessment/data-access/assessment.service';

export const REHA_AUSSCHLUSSGRUENDE = [
  'hochgradige körperliche Schwäche, z. B. fortgeschrittene Kachexie bei onkologischer Erkrankung',
  'stark verminderte kardiale oder pulmonale Belastbarkeit, z. B. Luftnot bereits in Ruhe',
  'große Wunden/Dekubitalgeschwüre',
  'schwere Orientierungsstörungen, z. B. mit Wanderungstendenz',
  'ausgeprägte psychische Störungen, beispielsweise akute Wahnsymptomatik',
  'Antriebsstörungen, z. B. bei schwerer Depression',
  'nicht beeinflussbare Fremd- oder Selbstgefährdung',
  'fehlende Kooperations- und Einsichtsfähigkeit aufgrund psychischer oder fortgeschrittener dementieller Störungen',
  'die Therapie beeinträchtigende Abhängigkeitserkrankungen',
  'geplante Operationen oder Krankenhausaufnahme',
];

export const EMPFEHLUNGEN_7_2_1 = [
  { key: 'A', text: 'Die aktuellen Leistungen der vertragsärztlichen Versorgung oder pflegerischen Maßnahmen erscheinen ausreichend, um Pflegebedürftigkeit zu vermeiden, zu vermindern oder eine Verschlimmerung zu verhüten.' },
  { key: 'B', text: 'Es wird empfohlen, mit der behandelnden Ärztin oder dem behandelnden Arzt abzuklären, ob weitere therapeutische Maßnahmen eingeleitet werden können.' },
  { key: 'C', text: 'Es wird empfohlen, die unter 7.1 genannten Empfehlungen einzuleiten.' },
  { key: 'D', text: 'Es wird die Einleitung bzw. Optimierung aktivierender pflegerischer Maßnahmen empfohlen.' },
  { key: 'E', text: 'Es ergeben sich Hinweise für eine Leistung zur medizinischen Rehabilitation, aktuell liegt jedoch keine ausreichende Rehabilitationsfähigkeit vor.' },
  { key: 'F', text: 'Die Wirkung/der Erfolg einer abgeschlossenen oder derzeit stattfindenden Rehabilitationsmaßnahme soll abgewartet werden.' },
  { key: 'G', text: 'Es wird keine realistische Möglichkeit gesehen, die Pflegebedürftigkeit zu vermindern oder eine Verschlimmerung zu verhüten.' },
  { key: 'H', text: 'Eine Rehabilitationsleistung wurde bereits bewilligt (Bewilligungsbescheid liegt vor).' },
  { key: 'I', text: 'Weitere Abklärung empfohlen, weil …' },
  { key: 'J', text: 'Sonstiges' },
];

export const STATIONAER_BEGRUENDUNG = [
  'keine ausreichende Mobilität',
  'keine ausreichende physische und psychische Belastbarkeit für ambulante Rehabilitation',
  'ständige ärztliche und pflegerische Betreuung (auch nachts) erforderlich',
  'häusliche Versorgung nicht sichergestellt',
  'zeitweilige Distanzierung vom häuslichen Umfeld erforderlich',
  'ambulante Rehabilitation zum Erreichen der Rehabilitationsziele nicht ausreichend',
];

function createDomainGroup(fb: FormBuilder) {
  return fb.group({
    keine: [false],
    therapeutisch: [''],
    umgebungHilfsmittel: [''],
    praeventiv: [''],
    sonstiges: [''],
  });
}

@Component({
  selector: 'app-kapitel-7-step',
  standalone: true,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './kapitel-7-step.component.html',
})
export class Kapitel7StepComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  readonly saving = signal(false);

  readonly rehaAusschlussgruende = REHA_AUSSCHLUSSGRUENDE;
  readonly empfehlungenOptionen = EMPFEHLUNGEN_7_2_1;
  readonly stationaerBegruendungOptionen = STATIONAER_BEGRUENDUNG;

  readonly form = this.fb.group({
    domain1: createDomainGroup(this.fb),
    domain2: createDomainGroup(this.fb),
    domain3: createDomainGroup(this.fb),
    leistungenAusreichend: [false],
    empfehlungen: this.fb.control<string[]>([]),
    empfehlungIWeil: [''],
    empfehlungJSonstiges: [''],
    rehaBeduerftigkeit: [false],
    rehaFaehigkeit: [true],
    rehaAusschlussgruendeAusgewaehlt: this.fb.control<string[]>([]),
    rehaSonstigeGruende: [''],
    rehaZiele: [''],
    zuweisungGeriatrisch: [false],
    zuweisungIndikationsspezifisch: [''],
    durchfuehrung: [''],
    stationaerBegruendungAusgewaehlt: this.fb.control<string[]>([]),
    hinweiseEinrichtung: [''],
    beratungErforderlich: [false],
  });

  // Zoneless Change Detection: Formwerte fuer bedingt angezeigte Abschnitte
  // werden gespiegelt, siehe level-question-group.component.ts.
  readonly values = signal(this.form.getRawValue());
  private subscription?: Subscription;

  ngOnInit() {
    this.subscription = this.form.valueChanges.subscribe(() => this.values.set(this.form.getRawValue()));
    this.loadExisting();
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  private async loadExisting() {
    const existing = (await this.assessmentService.getChapterAnswers(this.assessmentId, 'kap7')) as
      | Record<string, any>
      | null;
    if (!existing) return;
    this.form.patchValue(existing);
    this.values.set(this.form.getRawValue());
  }

  toggleListValue(controlName: 'empfehlungen' | 'rehaAusschlussgruendeAusgewaehlt' | 'stationaerBegruendungAusgewaehlt', value: string, checked: boolean) {
    const control = this.form.controls[controlName];
    const current = control.value ?? [];
    control.setValue(checked ? [...current, value] : current.filter((v: string) => v !== value));
  }

  isListChecked(controlName: 'empfehlungen' | 'rehaAusschlussgruendeAusgewaehlt' | 'stationaerBegruendungAusgewaehlt', value: string): boolean {
    return (this.values()[controlName] ?? []).includes(value);
  }

  async submit() {
    this.saving.set(true);
    try {
      await this.assessmentService.saveChapterAnswers(this.assessmentId, 'kap7', this.form.getRawValue());
      await this.assessmentService.setCurrentStep(this.assessmentId, 'kap8');
      this.router.navigate(['/gutachten', this.assessmentId, 'kap8']);
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/gutachten', this.assessmentId, 'kap6']);
  }
}
