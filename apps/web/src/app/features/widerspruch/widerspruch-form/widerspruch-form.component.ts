import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { autosaveOnChange } from '../../assessment/autosave';
import { Widerspruchsart, WiderspruchService } from '../data-access/widerspruch.service';

const WIDERSPRUCHSART_LABELS: Record<Widerspruchsart, string> = {
  pflegegrad: 'Pflegegrad',
  hilfsmittel: 'Hilfsmittel',
};

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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly letterId = this.route.snapshot.paramMap.get('letterId')!;
  readonly widerspruchsart = signal<Widerspruchsart>('pflegegrad');
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
    bescheiddatum: [''],
    aktenzeichen: [''],
    begruendung: ['', Validators.required],
  });

  private readonly subscriptions = new Subscription();

  async ngOnInit() {
    const existing = await this.widerspruchService.getLetter(this.letterId);
    if (!existing) {
      this.router.navigate(['/widersprueche']);
      return;
    }
    this.widerspruchsart.set(existing.widerspruchsart);
    this.pdfStoragePath.set(existing.pdf_storage_path);
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
    });
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
        }),
      ),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  label(): string {
    return WIDERSPRUCHSART_LABELS[this.widerspruchsart()];
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
}
