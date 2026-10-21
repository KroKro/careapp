import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { autosaveOnChange } from '../../assessment/autosave';
import { AssessmentService } from '../../assessment/data-access/assessment.service';
import { ObjectionLetter, WiderspruchStatus, Widerspruchsart, WiderspruchService } from '../data-access/widerspruch.service';

const WIDERSPRUCHSART_LABELS: Record<Widerspruchsart, string> = {
  pflegegrad: 'Pflegegrad',
  hilfsmittel: 'Hilfsmittel',
};

const STATUS_LABELS: Record<WiderspruchStatus, string> = {
  entwurf: 'Entwurf',
  versendet: 'Versendet, wartet auf Bescheid',
  bescheid_angefordert: 'Bescheid angefordert',
  bescheid_erhalten: 'Bescheid erhalten, Ergebnis wird geprüft',
  abgeschlossen_erfolgreich: 'Abgeschlossen',
  eskaliert_klageverfahren: 'Eskaliert zum Klageverfahren',
};

export interface LinkableAssessment {
  id: string;
  label: string;
}

@Component({
  selector: 'app-widerspruch-form',
  standalone: true,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './widerspruch-form.component.html',
})
export class WiderspruchFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly widerspruchService = inject(WiderspruchService);
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly letterId = this.route.snapshot.paramMap.get('letterId')!;
  readonly widerspruchsart = signal<Widerspruchsart>('pflegegrad');
  readonly pdfStoragePath = signal<string | null>(null);
  readonly status = signal<WiderspruchStatus>('entwurf');
  readonly versendetAm = signal<string | null>(null);
  readonly bescheidAngefordertAm = signal<string | null>(null);
  readonly bescheidErhaltenAm = signal<string | null>(null);
  readonly loading = signal(true);
  readonly generating = signal(false);
  readonly statusBusy = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly linkableAssessments = signal<LinkableAssessment[]>([]);

  readonly form = this.fb.group({
    vorname: ['', Validators.required],
    nachname: ['', Validators.required],
    geburtsdatum: [''],
    adresse: [''],
    email: ['', Validators.email],
    pflegekasse: [''],
    bescheiddatum: [''],
    aktenzeichen: [''],
    begruendung: ['', Validators.required],
    protokollTermin: [''],
    assessmentId: [''],
  });

  private readonly subscriptions = new Subscription();

  async ngOnInit() {
    const [existing, selfAssessments, gutachten] = await Promise.all([
      this.widerspruchService.getLetter(this.letterId),
      this.assessmentService.listAssessments('self').catch(() => []),
      this.assessmentService.listAssessments('gutachten').catch(() => []),
    ]);
    if (!existing) {
      this.router.navigate(['/widersprueche']);
      return;
    }
    this.linkableAssessments.set([
      ...selfAssessments.map((a) => ({
        id: a.id,
        label: `Einschätzung vom ${this.formatDate(a.created_at)}${a.pflegegrad !== null ? ' – Pflegegrad ' + a.pflegegrad : ''}`,
      })),
      ...gutachten.map((a) => ({
        id: a.id,
        label: `Gutachten${a.subject_name ? ' – ' + a.subject_name : ''} (${this.formatDate(a.created_at)})`,
      })),
    ]);

    this.applyExisting(existing);
    this.loading.set(false);

    this.subscriptions.add(
      autosaveOnChange(this.form.valueChanges, (v) =>
        this.widerspruchService.saveLetter(this.letterId, {
          widerspruchsart: this.widerspruchsart(),
          vorname: v.vorname ?? '',
          nachname: v.nachname ?? '',
          geburtsdatum: v.geburtsdatum || null,
          adresse: v.adresse ?? '',
          email: v.email ?? '',
          pflegekasse: v.pflegekasse ?? '',
          bescheiddatum: v.bescheiddatum || null,
          aktenzeichen: v.aktenzeichen ?? '',
          begruendung: v.begruendung ?? '',
          protokoll_termin: v.protokollTermin ?? '',
          assessment_id: v.assessmentId || null,
        }),
      ),
    );
  }

  private applyExisting(existing: ObjectionLetter) {
    this.widerspruchsart.set(existing.widerspruchsart);
    this.pdfStoragePath.set(existing.pdf_storage_path);
    this.status.set(existing.status);
    this.versendetAm.set(existing.versendet_am);
    this.bescheidAngefordertAm.set(existing.bescheid_angefordert_am);
    this.bescheidErhaltenAm.set(existing.bescheid_erhalten_am);
    this.form.patchValue({
      vorname: existing.vorname,
      nachname: existing.nachname,
      geburtsdatum: existing.geburtsdatum ?? '',
      adresse: existing.adresse,
      email: existing.email,
      pflegekasse: existing.pflegekasse,
      bescheiddatum: existing.bescheiddatum ?? '',
      aktenzeichen: existing.aktenzeichen,
      begruendung: existing.begruendung,
      protokollTermin: existing.protokoll_termin,
      assessmentId: existing.assessment_id ?? '',
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  label(): string {
    return WIDERSPRUCHSART_LABELS[this.widerspruchsart()];
  }

  statusLabel(): string {
    return STATUS_LABELS[this.status()];
  }

  async generatePdf() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.generating.set(true);
    this.errorMessage.set(null);
    try {
      const v = this.form.getRawValue();
      await this.widerspruchService.saveLetter(this.letterId, {
        widerspruchsart: this.widerspruchsart(),
        vorname: v.vorname ?? '',
        nachname: v.nachname ?? '',
        geburtsdatum: v.geburtsdatum || null,
        adresse: v.adresse ?? '',
        email: v.email ?? '',
        pflegekasse: v.pflegekasse ?? '',
        bescheiddatum: v.bescheiddatum || null,
        aktenzeichen: v.aktenzeichen ?? '',
        begruendung: v.begruendung ?? '',
        protokoll_termin: v.protokollTermin ?? '',
        assessment_id: v.assessmentId || null,
      });
      await this.widerspruchService.generatePdf(this.letterId);
      const updated = await this.widerspruchService.getLetter(this.letterId);
      this.pdfStoragePath.set(updated?.pdf_storage_path ?? null);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'PDF konnte nicht erstellt werden.');
    } finally {
      this.generating.set(false);
    }
  }

  async downloadPdf() {
    const path = this.pdfStoragePath();
    if (!path) return;
    const url = await this.widerspruchService.getPdfUrl(path);
    window.open(url, '_blank', 'noopener');
  }

  private async runStatusAction(action: (id: string) => Promise<void>) {
    this.statusBusy.set(true);
    this.errorMessage.set(null);
    try {
      await action(this.letterId);
      const updated = await this.widerspruchService.getLetter(this.letterId);
      if (updated) {
        this.status.set(updated.status);
        this.versendetAm.set(updated.versendet_am);
        this.bescheidAngefordertAm.set(updated.bescheid_angefordert_am);
        this.bescheidErhaltenAm.set(updated.bescheid_erhalten_am);
      }
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Status konnte nicht aktualisiert werden.');
    } finally {
      this.statusBusy.set(false);
    }
  }

  markVersendet() {
    return this.runStatusAction((id) => this.widerspruchService.markVersendet(id));
  }

  markBescheidAngefordert() {
    return this.runStatusAction((id) => this.widerspruchService.markBescheidAngefordert(id));
  }

  markBescheidErhalten() {
    return this.runStatusAction((id) => this.widerspruchService.markBescheidErhalten(id));
  }

  markAbgeschlossen() {
    return this.runStatusAction((id) => this.widerspruchService.markAbgeschlossen(id));
  }

  markEskaliert() {
    return this.runStatusAction((id) => this.widerspruchService.markEskaliert(id));
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
}
