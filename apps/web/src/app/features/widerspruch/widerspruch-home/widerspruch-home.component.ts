import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ObjectionLetter, WiderspruchStatus, Widerspruchsart, WiderspruchService } from '../data-access/widerspruch.service';

const WIDERSPRUCHSART_LABELS: Record<Widerspruchsart, string> = {
  pflegegrad: 'Pflegegrad',
  hilfsmittel: 'Hilfsmittel',
};

const STATUS_LABELS: Record<WiderspruchStatus, string> = {
  entwurf: 'Entwurf',
  versendet: 'Versendet',
  bescheid_angefordert: 'Bescheid angefordert',
  bescheid_erhalten: 'Bescheid erhalten',
  abgeschlossen_erfolgreich: 'Abgeschlossen',
  eskaliert_klageverfahren: 'Klageverfahren',
};

const STATUS_BADGE_CLASS: Record<WiderspruchStatus, string> = {
  entwurf: 'badge-neutral',
  versendet: 'badge-warning',
  bescheid_angefordert: 'badge-warning',
  bescheid_erhalten: 'badge-warning',
  abgeschlossen_erfolgreich: 'badge-success',
  eskaliert_klageverfahren: 'badge-error',
};

@Component({
  selector: 'app-widerspruch-home',
  standalone: true,
  host: { class: 'block' },
  imports: [RouterLink],
  templateUrl: './widerspruch-home.component.html',
})
export class WiderspruchHomeComponent implements OnInit {
  private readonly widerspruchService = inject(WiderspruchService);
  private readonly router = inject(Router);

  readonly letters = signal<ObjectionLetter[]>([]);
  readonly loading = signal(true);
  readonly creating = signal<Widerspruchsart | null>(null);
  readonly errorMessage = signal<string | null>(null);

  async ngOnInit() {
    await this.reload();
  }

  private async reload() {
    this.loading.set(true);
    try {
      this.letters.set(await this.widerspruchService.listLetters());
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Widersprüche konnten nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  async create(widerspruchsart: Widerspruchsart) {
    this.creating.set(widerspruchsart);
    this.errorMessage.set(null);
    try {
      const id = await this.widerspruchService.createLetter(widerspruchsart);
      this.router.navigate(['/widersprueche', id]);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Widerspruch konnte nicht angelegt werden.');
    } finally {
      this.creating.set(null);
    }
  }

  label(l: ObjectionLetter): string {
    return WIDERSPRUCHSART_LABELS[l.widerspruchsart];
  }

  statusLabel(l: ObjectionLetter): string {
    return STATUS_LABELS[l.status];
  }

  statusBadgeClass(l: ObjectionLetter): string {
    return STATUS_BADGE_CLASS[l.status];
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
}
