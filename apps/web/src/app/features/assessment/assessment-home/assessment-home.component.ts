import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AssessmentListItem, AssessmentService } from '../data-access/assessment.service';

@Component({
  selector: 'app-assessment-home',
  standalone: true,
  host: { class: 'block' },
  imports: [RouterLink],
  templateUrl: './assessment-home.component.html',
})
export class AssessmentHomeComponent implements OnInit {
  private readonly assessmentService = inject(AssessmentService);
  private readonly router = inject(Router);

  readonly assessments = signal<AssessmentListItem[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly errorMessage = signal<string | null>(null);

  async ngOnInit() {
    await this.reload();
  }

  private async reload() {
    this.loading.set(true);
    try {
      this.assessments.set(await this.assessmentService.listAssessments());
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Einschätzungen konnten nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  async createNew() {
    this.creating.set(true);
    try {
      const id = await this.assessmentService.createNewAssessment();
      this.router.navigate(['/assessment', id, 'module', '1']);
    } finally {
      this.creating.set(false);
    }
  }

  linkFor(a: AssessmentListItem): (string | number)[] {
    if (a.status === 'completed') return ['/results', a.id];
    if (a.current_step === 'summary') return ['/assessment', a.id, 'summary'];
    return ['/assessment', a.id, 'module', a.current_step ?? '1'];
  }

  statusLabel(a: AssessmentListItem): string {
    if (a.status === 'completed') {
      return a.pflegegrad ? `Abgeschlossen – Pflegegrad ${a.pflegegrad}` : 'Abgeschlossen – kein Pflegegrad';
    }
    if (a.current_step === 'summary') return 'In Bearbeitung – bereit zur Berechnung';
    return `In Bearbeitung – Modul ${a.current_step ?? '1'} von 6`;
  }

  actionLabel(a: AssessmentListItem): string {
    return a.status === 'completed' ? 'Ergebnis ansehen' : 'Fortsetzen';
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
}
