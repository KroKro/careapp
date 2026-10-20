import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssessmentService } from '../data-access/assessment.service';
import { WizardProgressComponent } from '../shared/wizard-progress/wizard-progress.component';

@Component({
  selector: 'app-summary',
  standalone: true,
  host: { class: 'block' },
  imports: [RouterLink, WizardProgressComponent],
  templateUrl: './summary.component.html',
})
export class SummaryComponent {
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly calculating = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  readonly basePath = (this.route.snapshot.data['basePath'] as string) ?? '/assessment';

  async calculate() {
    this.calculating.set(true);
    this.errorMessage.set(null);
    try {
      await this.assessmentService.calculate(this.assessmentId);
      // Ergebnis immer zuerst zeigen (auch bei Gutachten) -- die Result-Page
      // bietet von dort aus "Module bearbeiten" und "Weiter zu Kapitel 6".
      this.router.navigate(['/results', this.assessmentId]);
    } catch (err) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Berechnung fehlgeschlagen. Bitte prüfe, ob alle Module ausgefüllt sind.',
      );
    } finally {
      this.calculating.set(false);
    }
  }
}
