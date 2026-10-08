import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/supabase.service';

export type SeverityBand = 'keine' | 'geringe' | 'erhebliche' | 'schwere' | 'schwerste';

export interface GuideTemplateRow {
  id: string;
  pflegegrad: number | null;
  module_number: number | null;
  score_band: SeverityBand | null;
  title: string;
  body_markdown: string;
  is_active: boolean;
  updated_at: string;
}

export interface GuideTemplateInput {
  id?: string;
  pflegegrad: number | null;
  module_number: number | null;
  score_band: SeverityBand | null;
  title: string;
  body_markdown: string;
  is_active: boolean;
}

export interface ScoringRulesetRow {
  id: string;
  version_label: string;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
  step_tables: Record<string, unknown>;
  pflegegrad_thresholds: unknown[];
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly supabase = inject(SupabaseService);

  async listGuideTemplates(): Promise<GuideTemplateRow[]> {
    const { data, error } = await this.supabase.client
      .from('guide_templates')
      .select('*')
      .order('pflegegrad', { ascending: true })
      .order('module_number', { ascending: true });
    if (error) throw error;
    return (data ?? []) as GuideTemplateRow[];
  }

  async upsertGuideTemplate(input: GuideTemplateInput): Promise<void> {
    const { data: userData } = await this.supabase.client.auth.getUser();
    const payload = {
      ...input,
      updated_by: userData.user?.id,
      updated_at: new Date().toISOString(),
    };
    const { error } = input.id
      ? await this.supabase.client.from('guide_templates').update(payload).eq('id', input.id)
      : await this.supabase.client.from('guide_templates').insert(payload);
    if (error) throw error;
  }

  async deleteGuideTemplate(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('guide_templates').delete().eq('id', id);
    if (error) throw error;
  }

  async listScoringRulesets(): Promise<ScoringRulesetRow[]> {
    const { data, error } = await this.supabase.client
      .from('scoring_rulesets')
      .select('*')
      .order('valid_from', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ScoringRulesetRow[];
  }

  async activateRuleset(id: string): Promise<void> {
    const { error: deactivateError } = await this.supabase.client
      .from('scoring_rulesets')
      .update({ is_active: false })
      .neq('id', id);
    if (deactivateError) throw deactivateError;

    const { error: activateError } = await this.supabase.client
      .from('scoring_rulesets')
      .update({ is_active: true })
      .eq('id', id);
    if (activateError) throw activateError;
  }

  async createRuleset(input: {
    versionLabel: string;
    validFrom: string;
    stepTablesJson: string;
    pflegegradThresholdsJson: string;
  }): Promise<void> {
    let stepTables: unknown;
    let thresholds: unknown;
    try {
      stepTables = JSON.parse(input.stepTablesJson);
      thresholds = JSON.parse(input.pflegegradThresholdsJson);
    } catch {
      throw new Error('Stufentabellen/Schwellen müssen gültiges JSON sein.');
    }

    const { error } = await this.supabase.client.from('scoring_rulesets').insert({
      version_label: input.versionLabel,
      valid_from: input.validFrom,
      step_tables: stepTables,
      pflegegrad_thresholds: thresholds,
      is_active: false,
    });
    if (error) throw error;
  }
}
