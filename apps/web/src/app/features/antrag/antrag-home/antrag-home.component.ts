import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AntragService, Antragsart, CareLevelApplication } from '../data-access/antrag.service';

const ANTRAGSART_LABELS: Record<Antragsart, string> = {
  einstufung: 'Einstufung',
  hoeherstufung: 'Höherstufung',
  hilfsmittel: 'Hilfsmittel',
};

@Component({
  selector: 'app-antrag-home',
  standalone: true,
  host: { class: 'block' },
  imports: [RouterLink],
  templateUrl: './antrag-home.component.html',
})
export class AntragHomeComponent implements OnInit {
  private readonly antragService = inject(AntragService);
  private readonly router = inject(Router);

  readonly applications = signal<CareLevelApplication[]>([]);
  readonly loading = signal(true);
  readonly creating = signal<Antragsart | null>(null);
  readonly errorMessage = signal<string | null>(null);

  async ngOnInit() {
    await this.reload();
  }

  private async reload() {
    this.loading.set(true);
    try {
      this.applications.set(await this.antragService.listApplications());
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Anträge konnten nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  async create(antragsart: Antragsart) {
    this.creating.set(antragsart);
    this.errorMessage.set(null);
    try {
      const id = await this.antragService.createApplication(antragsart);
      this.router.navigate(['/antraege', id]);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Antrag konnte nicht angelegt werden.');
    } finally {
      this.creating.set(null);
    }
  }

  label(a: CareLevelApplication): string {
    return ANTRAGSART_LABELS[a.antragsart];
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
}
