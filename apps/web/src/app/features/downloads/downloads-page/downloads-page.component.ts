import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { AssessmentService } from '../../assessment/data-access/assessment.service';

export interface OwnDocumentItem {
  assessmentId: string;
  title: string;
  subtitle: string;
  pdfStoragePath: string;
}

@Component({
  selector: 'app-downloads-page',
  standalone: true,
  host: { class: 'block' },
  imports: [RouterLink],
  templateUrl: './downloads-page.component.html',
})
export class DownloadsPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly assessmentService = inject(AssessmentService);

  readonly loading = signal(true);
  readonly ownDocuments = signal<OwnDocumentItem[]>([]);

  async ngOnInit() {
    const role = await this.auth.ensureRole();
    const isGutachter = role === 'gutachter' || role === 'admin';

    const [selfAssessments, gutachten] = await Promise.all([
      this.assessmentService.listAssessments('self').catch(() => []),
      isGutachter ? this.assessmentService.listAssessments('gutachten').catch(() => []) : Promise.resolve([]),
    ]);

    const all = [
      ...selfAssessments.map((a) => ({ ...a, kind: 'self' as const })),
      ...gutachten.map((a) => ({ ...a, kind: 'gutachten' as const })),
    ];

    const items = (
      await Promise.all(
        all.map(async (a) => {
          const report = await this.assessmentService.getGuideReport(a.id).catch(() => null);
          if (!report?.pdf_storage_path) return null;
          const title =
            a.kind === 'gutachten'
              ? `Formulargutachten${a.subject_name ? ' – ' + a.subject_name : ''}`
              : `Leitfaden${a.pflegegrad !== null ? ' – Pflegegrad ' + a.pflegegrad : ''}`;
          return {
            assessmentId: a.id,
            title,
            subtitle: `erstellt am ${new Date(a.updated_at).toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' })}`,
            pdfStoragePath: report.pdf_storage_path,
          } satisfies OwnDocumentItem;
        }),
      )
    ).filter((x): x is OwnDocumentItem => x !== null);

    this.ownDocuments.set(items);
    this.loading.set(false);
  }

  async download(path: string) {
    const url = await this.assessmentService.getGuidePdfUrl(path);
    window.open(url, '_blank', 'noopener');
  }
}
