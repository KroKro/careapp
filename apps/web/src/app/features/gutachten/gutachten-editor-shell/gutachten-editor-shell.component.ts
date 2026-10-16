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

// Der Kunde wünscht sich frei wechselbare Reiter wie in der Excel-Vorlage
// (Kap./Modul-Sheets), statt eines strikt linearen Wizards -- Gutachter:innen
// springen beim Ausfüllen erfahrungsgemäß zwischen Abschnitten hin und her.
// Die Gruppierung unten spiegelt exakt die Sheet-Struktur der Excel-Vorlage
// ("Kap. 1,2,3" / "Modul 1".."Modul 6" + "Kap. 5 Pflegegrad" / "Kap. 6,7,8,9"),
// damit die 15 Abschnitte nicht als ununterscheidbare Pill-Reihe wirken.
const SECTION_GROUPS: SectionTab[][] = [
  [{ label: 'Stammdaten', path: 'stammdaten', completionKey: 'stammdaten' }],
  [
    { label: 'Kap. 1', path: 'kap1', completionKey: 'kap1' },
    { label: 'Kap. 2', path: 'kap2', completionKey: 'kap2' },
    { label: 'Kap. 3', path: 'kap3', completionKey: 'kap3' },
  ],
  [
    { label: 'Modul 1', path: 'module/1', completionKey: 'module1' },
    { label: 'Modul 2', path: 'module/2', completionKey: 'module2' },
    { label: 'Modul 3', path: 'module/3', completionKey: 'module3' },
    { label: 'Modul 4', path: 'module/4', completionKey: 'module4' },
    { label: 'Modul 5', path: 'module/5', completionKey: 'module5' },
    { label: 'Modul 6', path: 'module/6', completionKey: 'module6' },
    { label: 'Zusammenfassung', path: 'summary', completionKey: 'summary' },
  ],
  [
    { label: 'Kap. 6', path: 'kap6', completionKey: 'kap6' },
    { label: 'Kap. 7', path: 'kap7', completionKey: 'kap7' },
    { label: 'Kap. 8', path: 'kap8', completionKey: 'kap8' },
    { label: 'Kap. 9', path: 'kap9', completionKey: 'kap9' },
  ],
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

  private navSubscription?: Subscription;

  async ngOnInit() {
    this.subjectName.set(await this.assessmentService.getSubjectName(this.assessmentId));
    await this.refreshCompletion();

    // Beim Modus mit freier Navigation kann sich die Shell-Instanz ueber
    // mehrere Abschnitte hinweg nicht neu erstellen (gleiche Eltern-Route) --
    // ohne das hier wuerden die Fortschrittspunkte nach dem Speichern eines
    // Abschnitts stehen bleiben, obwohl schon im naechsten Abschnitt.
    this.navSubscription = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.refreshCompletion());
  }

  ngOnDestroy() {
    this.navSubscription?.unsubscribe();
  }

  private async refreshCompletion() {
    this.completion.set(await this.assessmentService.getCompletionMap(this.assessmentId));
  }

  isDone(key: string): boolean {
    return Boolean(this.completion()[key]);
  }
}
