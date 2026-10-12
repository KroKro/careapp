import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AdminService,
  GuideTemplateRow,
  SeverityBand,
} from '../data-access/admin.service';

type EntryKind = 'general' | 'module';

@Component({
  selector: 'app-guide-templates-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './guide-templates-page.component.html',
})
export class GuideTemplatesPageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);

  readonly templates = signal<GuideTemplateRow[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);

  readonly severityBands: SeverityBand[] = ['keine', 'geringe', 'erhebliche', 'schwere', 'schwerste'];
  readonly pflegegrade = [0, 1, 2, 3, 4, 5];
  readonly moduleNumbers = [1, 2, 3, 4, 5, 6];

  readonly form = this.fb.group({
    kind: this.fb.control<EntryKind>('general'),
    pflegegrad: this.fb.control<number>(0),
    moduleNumber: this.fb.control<number>(1),
    scoreBand: this.fb.control<SeverityBand>('erhebliche'),
    title: this.fb.control(''),
    bodyMarkdown: this.fb.control(''),
    isActive: this.fb.control(true),
  });

  // Siehe level-question-group.component.ts: Zoneless Change Detection
  // reagiert nicht auf blosse FormGroup-Wertaenderungen.
  readonly kind = signal<EntryKind>('general');
  private readonly subscription = new Subscription();

  async ngOnInit() {
    this.subscription.add(
      this.form.controls.kind.valueChanges.subscribe((v) => this.kind.set(v ?? 'general')),
    );
    await this.reload();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private async reload() {
    this.loading.set(true);
    try {
      this.templates.set(await this.adminService.listGuideTemplates());
    } finally {
      this.loading.set(false);
    }
  }

  startNew() {
    this.editingId.set(null);
    this.form.reset({
      kind: 'general',
      pflegegrad: 0,
      moduleNumber: 1,
      scoreBand: 'erhebliche',
      title: '',
      bodyMarkdown: '',
      isActive: true,
    });
  }

  edit(template: GuideTemplateRow) {
    this.editingId.set(template.id);
    this.form.setValue({
      kind: template.module_number ? 'module' : 'general',
      pflegegrad: template.pflegegrad ?? 0,
      moduleNumber: template.module_number ?? 1,
      scoreBand: template.score_band ?? 'erhebliche',
      title: template.title,
      bodyMarkdown: template.body_markdown,
      isActive: template.is_active,
    });
  }

  async save() {
    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      const v = this.form.getRawValue();
      const isGeneral = v.kind === 'general';
      await this.adminService.upsertGuideTemplate({
        id: this.editingId() ?? undefined,
        pflegegrad: isGeneral ? v.pflegegrad! : null,
        module_number: isGeneral ? null : v.moduleNumber!,
        score_band: isGeneral ? null : v.scoreBand!,
        title: v.title!,
        body_markdown: v.bodyMarkdown!,
        is_active: v.isActive!,
      });
      this.startNew();
      await this.reload();
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(id: string) {
    const title = this.templates().find((t) => t.id === id)?.title ?? 'diesen Baustein';
    if (!confirm(`"${title}" wirklich unwiderruflich löschen?`)) return;
    await this.adminService.deleteGuideTemplate(id);
    await this.reload();
  }
}
