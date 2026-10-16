import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssessmentService } from '../data-access/assessment.service';
import { WizardProgressComponent } from '../shared/wizard-progress/wizard-progress.component';

@Component({
  selector: 'app-summary',
  standalone: true,
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
      if (this.basePath === '/gutachten') {
        // Bei einem Gutachten ist nach der Pflegegrad-Berechnung (Kap. 5)
        // noch nicht Schluss -- es folgen noch die Kapitel 6-9.
        await this.assessmentService.setCurrentStep(this.assessmentId, 'kap6');
        this.router.navigate(['/gutachten', this.assessmentId, 'kap6']);
      } else {
        this.router.navigate(['/results', this.assessmentId]);
      }
    } catch (err) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Berechnung fehlgeschlagen. Bitte prüfe, ob alle Module ausgefüllt sind.',
      );
    } finally {
      this.calculating.set(false);
    }
  }
}
