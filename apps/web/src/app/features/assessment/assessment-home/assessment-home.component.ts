import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AssessmentService } from '../data-access/assessment.service';

@Component({
  selector: 'app-assessment-home',
  standalone: true,
  imports: [],
  templateUrl: './assessment-home.component.html',
})
export class AssessmentHomeComponent {
  private readonly assessmentService = inject(AssessmentService);
  private readonly router = inject(Router);

  readonly starting = signal(false);

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
