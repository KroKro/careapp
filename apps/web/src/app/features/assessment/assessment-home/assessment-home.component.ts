import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AssessmentService } from '../data-access/assessment.service';

@Component({
  selector: 'app-assessment-home',
  standalone: true,
  imports: [],
  templateUrl: './assessment-home.component.html',
})
export class AssessmentHomeComponent implements OnInit {
  private readonly assessmentService = inject(AssessmentService);
  private readonly router = inject(Router);

  readonly starting = signal(false);
  readonly checkingActive = signal(true);
  readonly activeCurrentStep = signal<string | null | undefined>(undefined);

  async ngOnInit() {
    const active = await this.assessmentService.getActiveAssessment();
    this.activeCurrentStep.set(active?.currentStep ?? null);
    this.checkingActive.set(false);
  }

  get hasActiveAssessment(): boolean {
    return this.activeCurrentStep() !== null && this.activeCurrentStep() !== undefined;
  }

  get progressHint(): string | null {
    const step = this.activeCurrentStep();
    if (!step) return null;
    if (step === 'summary') return 'Du hast alle 6 Module ausgefüllt – weiter zur Zusammenfassung.';
    return `Du hast bereits bis Modul ${step} von 6 ausgefüllt.`;
  }

  async startOrResume() {
    this.starting.set(true);
    try {
      const { id, currentStep } = await this.assessmentService.startOrResumeAssessment();
      if (currentStep === 'summary') {
        this.router.navigate(['/assessment', id, 'summary']);
      } else {
        this.router.navigate(['/assessment', id, 'module', currentStep ?? '1']);
      }
    } finally {
      this.starting.set(false);
    }
  }
}
