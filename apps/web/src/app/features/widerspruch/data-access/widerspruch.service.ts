import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/supabase.service';

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

export type Widerspruchsart = 'pflegegrad' | 'hilfsmittel';

// Spiegelt den Verlauf aus der Prozessbeschreibung des Auftraggebers
// (documents/attachments/2026_10_21/2026_10_20_Prozessbeschreibung_Widerspruch.docx):
// entwurf -> versendet -> (bescheid_angefordert ->) bescheid_erhalten ->
// abgeschlossen_erfolgreich | eskaliert_klageverfahren. "Klageverfahren"
// selbst ist dort ein eigener, nicht detaillierter Folgeprozess -- wird
// hier bewusst nur als Endzustand markiert.
export type WiderspruchStatus =
  | 'entwurf'
  | 'versendet'
  | 'bescheid_angefordert'
  | 'bescheid_erhalten'
  | 'abgeschlossen_erfolgreich'
  | 'eskaliert_klageverfahren';

export interface ObjectionLetter {
  id: string;
  widerspruchsart: Widerspruchsart;
  vorname: string;
  nachname: string;
  geburtsdatum: string | null;
  adresse: string;
  email: string;
  pflegekasse: string;
  bescheiddatum: string | null;
  aktenzeichen: string;
  begruendung: string;
  protokoll_termin: string;
  assessment_id: string | null;
  status: WiderspruchStatus;
  versendet_am: string | null;
  bescheid_angefordert_am: string | null;
  bescheid_erhalten_am: string | null;
  pdf_storage_path: string | null;
  created_at: string;
  updated_at: string;
}

export type ObjectionLetterInput = Pick<
  ObjectionLetter,
  | 'widerspruchsart'
  | 'vorname'
  | 'nachname'
  | 'geburtsdatum'
  | 'adresse'
  | 'email'
  | 'pflegekasse'
  | 'bescheiddatum'
  | 'aktenzeichen'
  | 'begruendung'
  | 'protokoll_termin'
  | 'assessment_id'
>;

const SELECT_FIELDS =
  'id, widerspruchsart, vorname, nachname, geburtsdatum, adresse, email, pflegekasse, bescheiddatum, aktenzeichen, begruendung, protokoll_termin, assessment_id, status, versendet_am, bescheid_angefordert_am, bescheid_erhalten_am, pdf_storage_path, created_at, updated_at';

@Injectable({ providedIn: 'root' })
export class WiderspruchService {
  private readonly supabase = inject(SupabaseService);

  async listLetters(): Promise<ObjectionLetter[]> {
    const { data, error } = await this.supabase.client
      .from('objection_letters')
      .select(SELECT_FIELDS)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ObjectionLetter[];
  }

  async getLetter(id: string): Promise<ObjectionLetter | null> {
    const { data, error } = await this.supabase.client
      .from('objection_letters')
      .select(SELECT_FIELDS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as ObjectionLetter) ?? null;
  }

  async createLetter(widerspruchsart: Widerspruchsart): Promise<string> {
    const { data: userData } = await this.supabase.client.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Nicht angemeldet.');

    const { data, error } = await this.supabase.client
      .from('objection_letters')
      .insert({ user_id: userId, widerspruchsart, email: userData.user?.email ?? '' })
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async saveLetter(id: string, input: ObjectionLetterInput): Promise<void> {
    const { error } = await this.supabase.client.from('objection_letters').update(input).eq('id', id);
    if (error) throw error;
  }

  async markVersendet(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('objection_letters')
      .update({ status: 'versendet', versendet_am: new Date().toISOString().slice(0, 10) })
      .eq('id', id);
    if (error) throw error;
  }

  async markBescheidAngefordert(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('objection_letters')
      .update({ status: 'bescheid_angefordert', bescheid_angefordert_am: new Date().toISOString().slice(0, 10) })
      .eq('id', id);
    if (error) throw error;
  }

  async markBescheidErhalten(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('objection_letters')
      .update({ status: 'bescheid_erhalten', bescheid_erhalten_am: new Date().toISOString().slice(0, 10) })
      .eq('id', id);
    if (error) throw error;
  }

  async markAbgeschlossen(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('objection_letters')
      .update({ status: 'abgeschlossen_erfolgreich' })
      .eq('id', id);
    if (error) throw error;
  }

  async markEskaliert(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('objection_letters')
      .update({ status: 'eskaliert_klageverfahren' })
      .eq('id', id);
    if (error) throw error;
  }

  async generatePdf(letterId: string): Promise<void> {
    const { error } = await this.supabase.client.functions.invoke('generate-widerspruch-pdf', {
      body: { letterId },
    });
    if (error) throw await toFriendlyError(error);
  }

  async getPdfUrl(path: string): Promise<string> {
    const { data, error } = await this.supabase.client.storage.from('guides').createSignedUrl(path, 60);
    if (error || !data) throw error ?? new Error('Signed URL konnte nicht erstellt werden.');
    return data.signedUrl;
  }
}
