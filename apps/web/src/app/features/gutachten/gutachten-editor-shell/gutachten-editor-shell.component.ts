import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AssessmentService } from '../../assessment/data-access/assessment.service';

interface SectionTab {
  label: string;
  path: string;
  completionKey: string;
}

interface SectionGroup {
  label: string;
  tabs: SectionTab[];
}

// Der Kunde wünscht sich frei wechselbare Reiter wie in der Excel-Vorlage
// (Kap./Modul-Sheets), statt eines strikt linearen Wizards -- Gutachter:innen
// springen beim Ausfüllen erfahrungsgemäß zwischen Abschnitten hin und her.
// 15 Reiter in einer flachen, umbrechenden Pill-Reihe wirkten laut Kunden-
// Feedback "durcheinander" -- jetzt zweistufig: oben 4 Phasen (spiegeln die
// Sheet-Struktur der Excel-Vorlage), darunter nur die Reiter der gerade
// gewaehlten Phase.
const SECTION_GROUPS: SectionGroup[] = [
  { label: 'Stammdaten', tabs: [{ label: 'Stammdaten', path: 'stammdaten', completionKey: 'stammdaten' }] },
  {
    label: 'Vorgeschichte',
    tabs: [
      { label: 'Kap. 1', path: 'kap1', completionKey: 'kap1' },
      { label: 'Kap. 2', path: 'kap2', completionKey: 'kap2' },
      { label: 'Kap. 3', path: 'kap3', completionKey: 'kap3' },
    ],
  },
  {
    label: 'Module & Ergebnis',
    tabs: [
      { label: 'Modul 1', path: 'module/1', completionKey: 'module1' },
      { label: 'Modul 2', path: 'module/2', completionKey: 'module2' },
      { label: 'Modul 3', path: 'module/3', completionKey: 'module3' },
      { label: 'Modul 4', path: 'module/4', completionKey: 'module4' },
      { label: 'Modul 5', path: 'module/5', completionKey: 'module5' },
      { label: 'Modul 6', path: 'module/6', completionKey: 'module6' },
      { label: 'Zusammenfassung', path: 'summary', completionKey: 'summary' },
    ],
  },
  {
    label: 'Empfehlungen',
    tabs: [
      { label: 'Kap. 6', path: 'kap6', completionKey: 'kap6' },
      { label: 'Kap. 7', path: 'kap7', completionKey: 'kap7' },
      { label: 'Kap. 8', path: 'kap8', completionKey: 'kap8' },
      { label: 'Kap. 9', path: 'kap9', completionKey: 'kap9' },
    ],
  },
];

@Component({
  selector: 'app-gutachten-editor-shell',
  standalone: true,
  host: { class: 'block' },
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './gutachten-editor-shell.component.html',
})
export class GutachtenEditorShellComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assessmentService = inject(AssessmentService);

  readonly assessmentId = this.route.snapshot.paramMap.get('assessmentId')!;
  readonly sectionGroups = SECTION_GROUPS;
  readonly subjectName = signal<string | null>(null);
  readonly completion = signal<Record<string, boolean>>({});
  readonly selectedGroupIndex = signal(0);

  private navSubscription?: Subscription;

  async ngOnInit() {
    this.subjectName.set(await this.assessmentService.getSubjectName(this.assessmentId));
    await this.refreshCompletion();
    this.selectedGroupIndex.set(this.computeActiveGroupIndex());

    // Beim Modus mit freier Navigation kann sich die Shell-Instanz ueber
    // mehrere Abschnitte hinweg nicht neu erstellen (gleiche Eltern-Route) --
    // ohne das hier wuerden die Fortschrittspunkte nach dem Speichern eines
    // Abschnitts stehen bleiben, obwohl schon im naechsten Abschnitt. Die
    // aktive Phase (oberer Tab) folgt dabei automatisch der Navigation,
    // auch wenn sie ueber einen "Weiter"-Button statt einen Klick auf
    // einen Phasen-Tab erfolgte.
    this.navSubscription = this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.refreshCompletion();
      this.selectedGroupIndex.set(this.computeActiveGroupIndex());
    });
  }

  ngOnDestroy() {
    this.navSubscription?.unsubscribe();
  }

  private async refreshCompletion() {
    this.completion.set(await this.assessmentService.getCompletionMap(this.assessmentId));
  }

  private computeActiveGroupIndex(): number {
    const url = this.router.url;
    const index = SECTION_GROUPS.findIndex((group) => group.tabs.some((tab) => url.endsWith('/' + tab.path)));
    return index === -1 ? 0 : index;
  }

  isDone(key: string): boolean {
    return Boolean(this.completion()[key]);
  }

  groupProgress(group: SectionGroup): string {
    const done = group.tabs.filter((tab) => this.isDone(tab.completionKey)).length;
    return `${done}/${group.tabs.length}`;
  }
}
