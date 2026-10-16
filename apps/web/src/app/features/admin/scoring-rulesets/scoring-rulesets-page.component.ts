import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, ScoringRulesetRow } from '../data-access/admin.service';

@Component({
  selector: 'app-scoring-rulesets-page',
  standalone: true,
  host: { class: 'block' },
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './scoring-rulesets-page.component.html',
})
export class ScoringRulesetsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);

  readonly rulesets = signal<ScoringRulesetRow[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showCreateForm = signal(false);

  readonly form = this.fb.group({
    versionLabel: [''],
    validFrom: [''],
    stepTablesJson: [''],
    pflegegradThresholdsJson: [''],
  });

  async ngOnInit() {
    await this.reload();
  }

  private async reload() {
    this.loading.set(true);
    try {
      this.rulesets.set(await this.adminService.listScoringRulesets());
    } finally {
      this.loading.set(false);
    }
  }

  prefillFromActive() {
    const active = this.rulesets().find((r) => r.is_active);
    if (!active) return;
    this.form.patchValue({
      stepTablesJson: JSON.stringify(active.step_tables, null, 2),
      pflegegradThresholdsJson: JSON.stringify(active.pflegegrad_thresholds, null, 2),
    });
  }

  async activate(id: string) {
    this.errorMessage.set(null);
    try {
      await this.adminService.activateRuleset(id);
      await this.reload();
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Aktivieren fehlgeschlagen.');
    }
  }

  async create() {
    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      const v = this.form.getRawValue();
      await this.adminService.createRuleset({
        versionLabel: v.versionLabel!,
        validFrom: v.validFrom!,
        stepTablesJson: v.stepTablesJson!,
        pflegegradThresholdsJson: v.pflegegradThresholdsJson!,
      });
      this.form.reset();
      this.showCreateForm.set(false);
      await this.reload();
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Anlegen fehlgeschlagen.');
    } finally {
      this.saving.set(false);
    }
  }
}
