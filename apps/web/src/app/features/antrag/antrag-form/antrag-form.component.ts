import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { autosaveOnChange } from '../../assessment/autosave';
import { Antragsart, AntragService } from '../data-access/antrag.service';

const ANTRAGSART_LABELS: Record<Antragsart, string> = {
  einstufung: 'Einstufung',
  hoeherstufung: 'Höherstufung',
  hilfsmittel: 'Hilfsmittel',
};

@Component({
  selector: 'app-antrag-form',
  standalone: true,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './antrag-form.component.html',
})
export class AntragFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly antragService = inject(AntragService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly applicationId = this.route.snapshot.paramMap.get('applicationId')!;
  readonly antragsart = signal<Antragsart>('einstufung');
  readonly pdfStoragePath = signal<string | null>(null);
  readonly loading = signal(true);
  readonly generating = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    vorname: ['', Validators.required],
    nachname: ['', Validators.required],
    geburtsdatum: [''],
    adresse: [''],
    email: ['', Validators.email],
    pflegekasse: [''],
    hilfsmittelBezeichnung: [''],
  });

  private readonly subscriptions = new Subscription();

  async ngOnInit() {
    const existing = await this.antragService.getApplication(this.applicationId);
    if (!existing) {
      this.router.navigate(['/antraege']);
      return;
    }
    this.antragsart.set(existing.antragsart);
    this.pdfStoragePath.set(existing.pdf_storage_path);
    this.form.patchValue({
      vorname: existing.vorname,
      nachname: existing.nachname,
      geburtsdatum: existing.geburtsdatum ?? '',
      adresse: existing.adresse,
      email: existing.email,
      pflegekasse: existing.pflegekasse,
      hilfsmittelBezeichnung: existing.hilfsmittel_bezeichnung,
    });
    if (this.antragsart() === 'hilfsmittel') {
      this.form.controls.hilfsmittelBezeichnung.addValidators(Validators.required);
      this.form.controls.hilfsmittelBezeichnung.updateValueAndValidity();
    }
    this.loading.set(false);

    this.subscriptions.add(
      autosaveOnChange(this.form.valueChanges, (v) =>
        this.antragService.saveApplication(this.applicationId, {
          antragsart: this.antragsart(),
          vorname: v.vorname ?? '',
          nachname: v.nachname ?? '',
          geburtsdatum: v.geburtsdatum || null,
          adresse: v.adresse ?? '',
          email: v.email ?? '',
          pflegekasse: v.pflegekasse ?? '',
          hilfsmittel_bezeichnung: v.hilfsmittelBezeichnung ?? '',
        }),
      ),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  label(): string {
    return ANTRAGSART_LABELS[this.antragsart()];
  }

  isHilfsmittel(): boolean {
    return this.antragsart() === 'hilfsmittel';
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
      await this.antragService.saveApplication(this.applicationId, {
        antragsart: this.antragsart(),
        vorname: v.vorname ?? '',
        nachname: v.nachname ?? '',
        geburtsdatum: v.geburtsdatum || null,
        adresse: v.adresse ?? '',
        email: v.email ?? '',
        pflegekasse: v.pflegekasse ?? '',
        hilfsmittel_bezeichnung: v.hilfsmittelBezeichnung ?? '',
      });
      await this.antragService.generatePdf(this.applicationId);
      const updated = await this.antragService.getApplication(this.applicationId);
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
    const url = await this.antragService.getPdfUrl(path);
    window.open(url, '_blank', 'noopener');
  }
}
