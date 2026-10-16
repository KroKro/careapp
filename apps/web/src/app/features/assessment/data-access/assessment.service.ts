import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/supabase.service';

/**
 * supabase-js liefert bei einem nicht-2xx-Edge-Function-Aufruf nur eine
 * generische FunctionsHttpError-Message ("Edge Function returned a non-2xx
 * status code") -- die eigentliche, nutzbare Fehlermeldung steht im JSON-
 * Body der Response (`{ error: "..." }`), der hier ausgelesen wird, damit
 * z. B. "Modul 3 wurde noch nicht ausgefüllt." auch wirklich ankommt.
 */
async function toFriendlyError(error: unknown): Promise<Error> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json();
      if (body?.error) return new Error(body.error);
    } catch {
      // Body nicht als JSON lesbar -- auf die urspruengliche Fehlermeldung zurueckfallen.
    }
  }
  return error instanceof Error ? error : new Error('Unbekannter Fehler.');
}

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
  subject_name: string | null;
}

export interface AssessmentAdminData {
  antragsart: string | null;
  erledigungsart: string | null;
  erledigungsort: string | null;
  antragsdatum: string | null;
  bisheriger_pflegegrad: number | null;
  data: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Alle Einschätzungen der Nutzerin/des Nutzers (Entwürfe + abgeschlossene).
   * Ein Account kann mehrere parallele Einschätzungen haben -- z. B. weil
   * jemand sie für mehrere pflegebedürftige Angehörige ausfüllt.
   */
  async listAssessments(kind: 'self' | 'gutachten' = 'self'): Promise<AssessmentListItem[]> {
    const { data: userData } = await this.supabase.client.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    const { data, error } = await this.supabase.client
      .from('assessments')
      .select('id, status, current_step, created_at, updated_at, subject_name, assessment_results(pflegegrad)')
      .eq('user_id', userId)
      .eq('kind', kind)
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
        subject_name: (row['subject_name'] as string | null) ?? null,
      };
    });
  }

  /** Legt immer eine neue, leere Einschätzung/ein neues Gutachten an (auch wenn bereits andere existieren). */
  async createNewAssessment(options?: {
    kind?: 'self' | 'gutachten';
    subjectName?: string;
    subjectBirthdate?: string;
  }): Promise<string> {
    const { data: userData } = await this.supabase.client.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Nicht angemeldet.');

    const { data: created, error } = await this.supabase.client
      .from('assessments')
      .insert({
        user_id: userId,
        current_step: options?.kind === 'gutachten' ? 'stammdaten' : '1',
        kind: options?.kind ?? 'self',
        subject_name: options?.subjectName ?? null,
        subject_birthdate: options?.subjectBirthdate ?? null,
      })
      .select('id')
      .single();

    if (error) throw error;
    return created.id as string;
  }

  async getAdminData(assessmentId: string): Promise<AssessmentAdminData | null> {
    const { data } = await this.supabase.client
      .from('assessment_admin_data')
      .select('antragsart, erledigungsart, erledigungsort, antragsdatum, bisheriger_pflegegrad, data')
      .eq('assessment_id', assessmentId)
      .maybeSingle();
    return (data as AssessmentAdminData) ?? null;
  }

  async saveAdminData(assessmentId: string, adminData: AssessmentAdminData): Promise<void> {
    const { error } = await this.supabase.client
      .from('assessment_admin_data')
      .upsert({ assessment_id: assessmentId, ...adminData }, { onConflict: 'assessment_id' });
    if (error) throw error;
  }

  async getChapterAnswers(
    assessmentId: string,
    chapterKey: string,
  ): Promise<Record<string, unknown> | null> {
    const { data } = await this.supabase.client
      .from('assessment_chapters')
      .select('answers')
      .eq('assessment_id', assessmentId)
      .eq('chapter_key', chapterKey)
      .maybeSingle();
    return (data?.['answers'] as Record<string, unknown>) ?? null;
  }

  async saveChapterAnswers(
    assessmentId: string,
    chapterKey: string,
    answers: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.supabase.client
      .from('assessment_chapters')
      .upsert(
        { assessment_id: assessmentId, chapter_key: chapterKey, answers },
        { onConflict: 'assessment_id,chapter_key' },
      );
    if (error) throw error;
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

  async setCurrentStep(assessmentId: string, step: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('assessments')
      .update({ current_step: step })
      .eq('id', assessmentId);
    if (error) throw error;
  }

  async calculate(assessmentId: string): Promise<void> {
    const { error } = await this.supabase.client.functions.invoke('calculate-pflegegrad', {
      body: { assessmentId },
    });
    if (error) throw await toFriendlyError(error);
  }

  /** Bestimmt, ob ein Assessment eine Selbsteinschätzung oder ein Gutachten ist -- steuert z. B. "Zurück"-Links. */
  async getAssessmentKind(assessmentId: string): Promise<'self' | 'gutachten'> {
    const { data } = await this.supabase.client
      .from('assessments')
      .select('kind')
      .eq('id', assessmentId)
      .single();
    return (data?.['kind'] as 'self' | 'gutachten') ?? 'self';
  }

  /**
   * Welche Abschnitte eines Gutachtens bereits Daten haben -- treibt die
   * Fortschrittspunkte in der Reiterleiste. current_step reicht dafuer nicht
   * mehr, seit frei zwischen Abschnitten gesprungen werden kann (der Kunde
   * wollte das explizit, siehe gutachten-editor-shell).
   */
  async getCompletionMap(assessmentId: string): Promise<Record<string, boolean>> {
    const [{ data: adminData }, { data: chapters }, { data: modules }, { data: result }] = await Promise.all([
      this.supabase.client
        .from('assessment_admin_data')
        .select('assessment_id')
        .eq('assessment_id', assessmentId)
        .maybeSingle(),
      this.supabase.client.from('assessment_chapters').select('chapter_key').eq('assessment_id', assessmentId),
      this.supabase.client.from('assessment_modules').select('module_number').eq('assessment_id', assessmentId),
      this.supabase.client
        .from('assessment_results')
        .select('assessment_id')
        .eq('assessment_id', assessmentId)
        .maybeSingle(),
    ]);

    const map: Record<string, boolean> = { stammdaten: Boolean(adminData), summary: Boolean(result) };
    for (const c of chapters ?? []) map[c['chapter_key'] as string] = true;
    for (const m of modules ?? []) map[`module${m['module_number']}`] = true;
    return map;
  }

  async getSubjectName(assessmentId: string): Promise<string | null> {
    const { data } = await this.supabase.client
      .from('assessments')
      .select('subject_name')
      .eq('id', assessmentId)
      .maybeSingle();
    return (data?.['subject_name'] as string | null) ?? null;
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
    if (error) throw await toFriendlyError(error);
  }

  async generateGutachtenPdf(assessmentId: string): Promise<void> {
    const { error } = await this.supabase.client.functions.invoke('generate-gutachten-pdf', {
      body: { assessmentId },
    });
    if (error) throw await toFriendlyError(error);
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
