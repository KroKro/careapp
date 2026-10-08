import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssessmentService } from '../data-access/assessment.service';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './summary.component.html',
})
export class SummaryComponent {
  private readonly assessmentService = inject(AssessmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly calculating = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;

  async calculate() {
    this.calculating.set(true);
    this.errorMessage.set(null);
    try {
      await this.assessmentService.calculate(this.assessmentId);
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
