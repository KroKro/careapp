import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { PlainLanguageService } from '../../../core/plain-language.service';
import { AssessmentService } from '../../assessment/data-access/assessment.service';
import { DocumentsService } from '../../documents/data-access/documents.service';
import { AntragService } from '../../antrag/data-access/antrag.service';
import { WiderspruchService } from '../../widerspruch/data-access/widerspruch.service';

export interface DashboardCard {
  key: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  cta: string;
  status: string;
  accent: 'brand' | 'success' | 'warning';
}

const ROLE_LABELS: Record<string, string> = {
  user: 'Bürger:in',
  gutachter: 'Gutachter:in',
  admin: 'Admin',
};

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  host: { class: 'block' },
  imports: [RouterLink],
  templateUrl: './dashboard-page.component.html',
})
export class DashboardPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly plainLanguage = inject(PlainLanguageService);
  private readonly assessmentService = inject(AssessmentService);
  private readonly documentsService = inject(DocumentsService);
  private readonly antragService = inject(AntragService);
  private readonly widerspruchService = inject(WiderspruchService);

  readonly loading = signal(true);
  readonly cards = signal<DashboardCard[]>([]);

  roleLabel(): string {
    return ROLE_LABELS[this.auth.role() ?? 'user'] ?? 'Bürger:in';
  }

  async ngOnInit() {
    const role = await this.auth.ensureRole();
    const isGutachter = role === 'gutachter' || role === 'admin';
    const isAdmin = role === 'admin';

    const [selfAssessments, documents, applications, widersprueche, gutachten] = await Promise.all([
      this.assessmentService.listAssessments('self').catch(() => []),
      this.documentsService.listDocuments().catch(() => []),
      this.antragService.listApplications().catch(() => []),
      this.widerspruchService.listLetters().catch(() => []),
      isGutachter ? this.assessmentService.listAssessments('gutachten').catch(() => []) : Promise.resolve([]),
    ]);

    const cards: DashboardCard[] = [
      {
        key: 'assessment',
        title: 'Pflegegrad-Selbsteinschätzung',
        description:
          'Finde in 15–20 Minuten heraus, welcher Pflegegrad realistisch ist — für dich selbst oder einen Angehörigen. Du kannst jederzeit unterbrechen und später fortsetzen.',
        icon: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
        path: '/assessment',
        cta: selfAssessments.length ? 'Weiter bearbeiten' : 'Jetzt starten',
        status: selfAssessments.length
          ? pluralize(selfAssessments.length, 'Einschätzung angelegt', 'Einschätzungen angelegt')
          : 'Noch keine Einschätzung',
        accent: 'brand',
      },
      {
        key: 'documents',
        title: 'Dokumente',
        description:
          'Lade Arztberichte, Atteste oder bestehende Gutachten hoch. Jede Datei wird automatisch auf Schadsoftware geprüft und ist nur für dich sichtbar.',
        icon: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375h-1.5m0 12.75h7.5m-7.5 3h7.5m-9-6h.008v.008H6.75v-.008ZM6 20.25h12a2.25 2.25 0 0 0 2.25-2.25V6.621a1.125 1.125 0 0 0-.329-.796L16.12 1.92A1.125 1.125 0 0 0 15.321 1.5H6a2.25 2.25 0 0 0-2.25 2.25v14.25A2.25 2.25 0 0 0 6 20.25Z',
        path: '/documents',
        cta: 'Dokumente verwalten',
        status: documents.length
          ? pluralize(documents.length, 'Dokument hochgeladen', 'Dokumente hochgeladen')
          : 'Noch keine Dokumente',
        accent: 'brand',
      },
      {
        key: 'antraege',
        title: 'Anträge bei der Pflegekasse',
        description:
          'Bereite einen Antrag auf Einstufung oder Höherstufung vor und lade ihn als unterschriftsfertiges PDF herunter.',
        icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
        path: '/antraege',
        cta: applications.length ? 'Anträge ansehen' : 'Antrag anlegen',
        status: applications.length
          ? pluralize(applications.length, 'Antrag angelegt', 'Anträge angelegt')
          : 'Noch kein Antrag',
        accent: 'brand',
      },
      {
        key: 'widersprueche',
        title: 'Widersprüche',
        description:
          'Widerspruch gegen einen Pflegegrad- oder Hilfsmittel-Bescheid deiner Pflegekasse vorbereiten und als PDF herunterladen.',
        icon: 'M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52-2.62 10.726c-.122.499.106 1.028.589 1.202a5.988 5.988 0 0 0 2.031.352 5.988 5.988 0 0 0 2.031-.352c.483-.174.711-.703.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z',
        path: '/widersprueche',
        cta: widersprueche.length ? 'Widersprüche ansehen' : 'Widerspruch anlegen',
        status: widersprueche.length
          ? pluralize(widersprueche.length, 'Widerspruch angelegt', 'Widersprüche angelegt')
          : 'Noch kein Widerspruch',
        accent: 'brand',
      },
      {
        key: 'informationen',
        title: 'Informationen',
        description:
          'Hintergrundwissen zu Begutachtung und Hilfsmitteln — unabhängig von einer konkreten Einschätzung.',
        icon: 'M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z',
        path: '/informationen',
        cta: 'Mehr erfahren',
        status: 'Immer verfügbar',
        accent: 'brand',
      },
      {
        key: 'downloads',
        title: 'Downloads',
        description:
          'Offizielle Begutachtungsrichtlinien und Gesetzestexte, plus deine eigenen erstellten Dokumente an einem Ort.',
        icon: 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3',
        path: '/downloads',
        cta: 'Downloads öffnen',
        status: 'Immer verfügbar',
        accent: 'brand',
      },
      {
        key: 'account',
        title: 'Konto & Datenschutz',
        description:
          'Verwalte deine Angaben, exportiere deine Daten nach DSGVO oder beantrage die Löschung deines Kontos.',
        icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
        path: '/account',
        cta: 'Zum Konto',
        status: 'Immer verfügbar',
        accent: 'brand',
      },
    ];

    if (isGutachter) {
      cards.push({
        key: 'gutachten',
        title: 'Formulargutachten (Profi-Modus)',
        description:
          'Vollständiges Formulargutachten zur Feststellung der Pflegebedürftigkeit für eine von dir begutachtete Person erstellen — inkl. Stammdaten, Kapitel 1–9 und PDF-Export.',
        icon: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z',
        path: '/gutachten',
        cta: gutachten.length ? 'Weiter bearbeiten' : 'Neues Gutachten anlegen',
        status: gutachten.length
          ? pluralize(gutachten.length, 'Gutachten angelegt', 'Gutachten angelegt')
          : 'Noch kein Gutachten',
        accent: 'success',
      });
    }

    if (isAdmin) {
      cards.push({
        key: 'admin',
        title: 'Admin-Bereich',
        description:
          'Leitfaden-Textbausteine und Berechnungsregeln pflegen, Nutzerübersicht einsehen. Bewusst ohne Einblick in Gesundheitsdaten anderer Nutzer:innen.',
        icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
        path: '/admin',
        cta: 'Admin öffnen',
        status: 'Nur für Admins',
        accent: 'warning',
      });
    }

    this.cards.set(cards);
    this.loading.set(false);
  }
}
