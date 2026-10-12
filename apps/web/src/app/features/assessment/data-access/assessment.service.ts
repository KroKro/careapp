import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/supabase.service';

export interface AssessmentResultRow {
  assessment_id: string;
  total_score: number;
  pflegegrad: number;
  besondere_bedarfskonstellation: boolean;
  module_scores: Record<string, unknown>;
}

export interface GuideReportRow {
  content_markdown: string;
  pdf_storage_path: string | null;
}

export interface AssessmentListItem {
  id: string;
  status: string;
  current_step: string | null;
  created_at: string;
  updated_at: string;
  pflegegrad: number | null;
}

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Alle Einschätzungen der Nutzerin/des Nutzers (Entwürfe + abgeschlossene).
   * Ein Account kann mehrere parallele Einschätzungen haben -- z. B. weil
   * jemand sie für mehrere pflegebedürftige Angehörige ausfüllt.
   */
  async listAssessments(): Promise<AssessmentListItem[]> {
    const { data: userData } = await this.supabase.client.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    const { data, error } = await this.supabase.client
      .from('assessments')
      .select('id, status, current_step, created_at, updated_at, assessment_results(pflegegrad)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map((row) => {
      const resultRelation = row['assessment_results'] as { pflegegrad: number } | { pflegegrad: number }[] | null;
      const pflegegrad = Array.isArray(resultRelation) ? (resultRelation[0]?.pflegegrad ?? null) : (resultRelation?.pflegegrad ?? null);
      return {
        id: row['id'] as string,
        status: row['status'] as string,
        current_step: row['current_step'] as string | null,
        created_at: row['created_at'] as string,
        updated_at: row['updated_at'] as string,
        pflegegrad,
      };
    });
  }

  /** Legt immer eine neue, leere Einschätzung an (auch wenn bereits andere existieren). */
  async createNewAssessment(): Promise<string> {
    const { data: userData } = await this.supabase.client.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Nicht angemeldet.');

    const { data: created, error } = await this.supabase.client
      .from('assessments')
      .insert({ user_id: userId, current_step: '1' })
      .select('id')
      .single();

    if (error) throw error;
    return created.id as string;
  }

  async getModuleAnswers(
    assessmentId: string,
    moduleNumber: number,
  ): Promise<Record<string, unknown> | null> {
    const { data } = await this.supabase.client
      .from('assessment_modules')
      .select('answers')
      .eq('assessment_id', assessmentId)
      .eq('module_number', moduleNumber)
      .maybeSingle();
    return (data?.['answers'] as Record<string, unknown>) ?? null;
  }

  async saveModuleAnswers(
    assessmentId: string,
    moduleNumber: number,
    answers: Record<string, unknown>,
    nextStep: string,
  ): Promise<void> {
    const { error: upsertError } = await this.supabase.client.from('assessment_modules').upsert(
      { assessment_id: assessmentId, module_number: moduleNumber, answers },
      { onConflict: 'assessment_id,module_number' },
    );
    if (upsertError) throw upsertError;

    const { error: updateError } = await this.supabase.client
      .from('assessments')
      .update({ current_step: nextStep })
      .eq('id', assessmentId);
    if (updateError) throw updateError;
  }

  async calculate(assessmentId: string): Promise<void> {
    const { error } = await this.supabase.client.functions.invoke('calculate-pflegegrad', {
      body: { assessmentId },
    });
    if (error) throw error;
  }

  async getResult(assessmentId: string): Promise<AssessmentResultRow | null> {
    const { data } = await this.supabase.client
      .from('assessment_results')
      .select('*')
      .eq('assessment_id', assessmentId)
      .maybeSingle();
    return (data as AssessmentResultRow) ?? null;
  }

  async generateGuide(assessmentId: string): Promise<void> {
    const { error } = await this.supabase.client.functions.invoke('generate-guide', {
      body: { assessmentId },
    });
    if (error) throw error;
  }

  async getGuideReport(assessmentId: string): Promise<GuideReportRow | null> {
    const { data } = await this.supabase.client
      .from('guide_reports')
      .select('content_markdown, pdf_storage_path')
      .eq('assessment_id', assessmentId)
      .maybeSingle();
    return (data as GuideReportRow) ?? null;
  }

  async getGuidePdfUrl(path: string): Promise<string> {
    const { data, error } = await this.supabase.client.storage.from('guides').createSignedUrl(path, 60);
    if (error || !data) throw error ?? new Error('Signed URL konnte nicht erstellt werden.');
    return data.signedUrl;
  }
}
