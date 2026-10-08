import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AssessmentResultRow,
  AssessmentService,
  GuideReportRow,
} from '../../assessment/data-access/assessment.service';

interface ModuleScoreDisplay {
  key: string;
  label: string;
  value: number;
  max: number;
}

const MODULE_LABELS: Record<string, string> = {
  m1: 'Mobilität',
  m2: 'Kognitive/kommunikative Fähigkeiten',
  m3: 'Verhalten/psychische Problemlagen',
  m4: 'Selbstversorgung',
  m5: 'Krankheits-/therapiebedingte Anforderungen',
  m6: 'Alltagsleben/soziale Kontakte',
};

const MODULE_MAX: Record<string, number> = { m1: 10, m2: 15, m3: 15, m4: 40, m5: 20, m6: 15 };

@Component({
  selector: 'app-result-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './result-page.component.html',
})
export class ResultPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly assessmentService = inject(AssessmentService);

  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  readonly result = signal<AssessmentResultRow | null>(null);
  readonly guide = signal<GuideReportRow | null>(null);
  readonly loading = signal(true);
  readonly generatingGuide = signal(false);
  readonly errorMessage = signal<string | null>(null);

  moduleScores(): ModuleScoreDisplay[] {
    const scores = this.result()?.module_scores ?? {};
    return Object.entries(MODULE_LABELS).map(([key, label]) => ({
      key,
      label,
      value: Number(scores[key] ?? 0),
      max: MODULE_MAX[key],
    }));
  }

  async ngOnInit() {
    this.result.set(await this.assessmentService.getResult(this.assessmentId));
    this.guide.set(await this.assessmentService.getGuideReport(this.assessmentId));
    this.loading.set(false);
  }

  async generateGuide() {
    this.generatingGuide.set(true);
    this.errorMessage.set(null);
    try {
      await this.assessmentService.generateGuide(this.assessmentId);
      this.guide.set(await this.assessmentService.getGuideReport(this.assessmentId));
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Leitfaden konnte nicht erstellt werden.');
    } finally {
      this.generatingGuide.set(false);
    }
  }

  async downloadPdf() {
    const path = this.guide()?.pdf_storage_path;
    if (!path) return;
    const url = await this.assessmentService.getGuidePdfUrl(path);
    window.open(url, '_blank', 'noopener');
  }
}
