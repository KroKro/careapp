import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AssessmentListItem, AssessmentService } from '../../assessment/data-access/assessment.service';

@Component({
  selector: 'app-gutachten-home',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './gutachten-home.component.html',
})
export class GutachtenHomeComponent implements OnInit {
  private readonly assessmentService = inject(AssessmentService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly gutachten = signal<AssessmentListItem[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly showCreateForm = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    subjectName: ['', Validators.required],
    subjectBirthdate: [''],
  });

  async ngOnInit() {
    await this.reload();
  }

  private async reload() {
    this.loading.set(true);
    try {
      this.gutachten.set(await this.assessmentService.listAssessments('gutachten'));
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Gutachten konnten nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  async create() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.creating.set(true);
    try {
      const { subjectName, subjectBirthdate } = this.form.getRawValue();
      const id = await this.assessmentService.createNewAssessment({
        kind: 'gutachten',
        subjectName: subjectName!,
        subjectBirthdate: subjectBirthdate || undefined,
      });
      this.router.navigate(['/gutachten', id, 'stammdaten']);
    } finally {
      this.creating.set(false);
    }
  }

  // current_step treibt die Navigation (nicht status): status='completed'
  // markiert nur, dass Modul 1-6/die Pflegegrad-Berechnung fertig ist --
  // bei einem Gutachten folgen danach noch Kapitel 6-9. Erst current_step
  // === 'fertig' (wird in Kapitel 9 gesetzt) heisst wirklich abgeschlossen.
  linkFor(g: AssessmentListItem): (string | number)[] {
    if (g.current_step === 'fertig') return ['/results', g.id];
    if (g.current_step === 'summary') return ['/gutachten', g.id, 'summary'];
    if (g.current_step && /^\d+$/.test(g.current_step)) return ['/gutachten', g.id, 'module', g.current_step];
    if (g.current_step && g.current_step.startsWith('kap')) return ['/gutachten', g.id, g.current_step];
    return ['/gutachten', g.id, 'stammdaten'];
  }

  statusLabel(g: AssessmentListItem): string {
    if (g.current_step === 'fertig') {
      return g.pflegegrad ? `Abgeschlossen – Pflegegrad ${g.pflegegrad}` : 'Abgeschlossen – kein Pflegegrad';
    }
    return 'In Bearbeitung';
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
}
