export interface LevelQuestionConfig {
  id: string;
  label: string;
}

export const INDEPENDENCE_SCALE = [
  'Selbständig',
  'Überwiegend selbständig',
  'Überwiegend unselbständig',
  'Unselbständig',
];

export const COGNITIVE_SCALE = [
  'Fähigkeit vorhanden / unbeeinträchtigt',
  'Fähigkeit größtenteils vorhanden',
  'Fähigkeit in geringem Maße vorhanden',
  'Fähigkeit nicht vorhanden',
];

export const FREQUENCY_SCALE = [
  'Nie oder selten',
  'Selten (ein- bis dreimal innerhalb von zwei Wochen)',
  'Häufig (zweimal bis mehrmals wöchentlich, aber nicht täglich)',
  'Täglich',
];

export const MODULE1_QUESTIONS: LevelQuestionConfig[] = [
  { id: '4.1.1', label: 'Positionswechsel im Bett' },
  { id: '4.1.2', label: 'Halten einer stabilen Sitzposition' },
  { id: '4.1.3', label: 'Umsetzen' },
  { id: '4.1.4', label: 'Fortbewegen innerhalb des Wohnbereichs' },
  { id: '4.1.5', label: 'Treppensteigen' },
];

export const MODULE2_QUESTIONS: LevelQuestionConfig[] = [
  { id: '4.2.1', label: 'Erkennen von Personen aus dem näheren Umfeld' },
  { id: '4.2.2', label: 'Örtliche Orientierung' },
  { id: '4.2.3', label: 'Zeitliche Orientierung' },
  { id: '4.2.4', label: 'Erinnern an wesentliche Ereignisse oder Beobachtungen' },
  { id: '4.2.5', label: 'Steuern von mehrschrittigen Alltagshandlungen' },
  { id: '4.2.6', label: 'Treffen von Entscheidungen im Alltag' },
  { id: '4.2.7', label: 'Verstehen von Sachverhalten und Informationen' },
  { id: '4.2.8', label: 'Erkennen von Risiken und Gefahren' },
  { id: '4.2.9', label: 'Mitteilen von elementaren Bedürfnissen' },
  { id: '4.2.10', label: 'Verstehen von Aufforderungen' },
  { id: '4.2.11', label: 'Beteiligen an einem Gespräch' },
];

export const MODULE3_QUESTIONS: LevelQuestionConfig[] = [
  { id: '4.3.1', label: 'Motorisch geprägte Verhaltensauffälligkeiten' },
  { id: '4.3.2', label: 'Nächtliche Unruhe' },
  { id: '4.3.3', label: 'Selbstschädigendes und autoaggressives Verhalten' },
  { id: '4.3.4', label: 'Beschädigen von Gegenständen' },
  { id: '4.3.5', label: 'Physisch aggressives Verhalten gegenüber anderen Personen' },
  { id: '4.3.6', label: 'Verbale Aggression' },
  { id: '4.3.7', label: 'Andere pflegerelevante vokale Auffälligkeiten' },
  { id: '4.3.8', label: 'Abwehr pflegerischer und anderer unterstützender Maßnahmen' },
  { id: '4.3.9', label: 'Wahnvorstellungen' },
  { id: '4.3.10', label: 'Ängste' },
  { id: '4.3.11', label: 'Antriebslosigkeit bei depressiver Stimmungslage' },
  { id: '4.3.12', label: 'Sozial inadäquate Verhaltensweisen' },
  { id: '4.3.13', label: 'Sonstige pflegerelevante inadäquate Handlungen' },
];

export const MODULE4_BASE_QUESTIONS: LevelQuestionConfig[] = [
  { id: '4.4.1', label: 'Waschen des vorderen Oberkörpers' },
  { id: '4.4.2', label: 'Körperpflege im Bereich des Kopfes (Kämmen, Zahnpflege, Rasieren)' },
  { id: '4.4.3', label: 'Waschen des Intimbereichs' },
  { id: '4.4.4', label: 'Duschen und Baden einschließlich Waschen der Haare' },
  { id: '4.4.5', label: 'An- und Auskleiden des Oberkörpers' },
  { id: '4.4.6', label: 'An- und Auskleiden des Unterkörpers' },
  { id: '4.4.7', label: 'Mundgerechtes Zubereiten der Nahrung und Eingießen von Getränken' },
];

export const MODULE4_WEIGHTED_QUESTIONS: LevelQuestionConfig[] = [
  { id: '4.4.8', label: 'Essen (dreifach gewichtet)' },
  { id: '4.4.9', label: 'Trinken (doppelt gewichtet)' },
  { id: '4.4.10', label: 'Benutzen einer Toilette oder eines Toilettenstuhls (doppelt gewichtet)' },
];

export const MODULE6_QUESTIONS: LevelQuestionConfig[] = [
  { id: '4.6.1', label: 'Gestaltung des Tagesablaufs und Anpassung an Veränderungen' },
  { id: '4.6.2', label: 'Ruhen und Schlafen' },
  { id: '4.6.3', label: 'Sichbeschäftigen' },
  { id: '4.6.4', label: 'Vornehmen von in die Zukunft gerichteten Planungen' },
  { id: '4.6.5', label: 'Interaktion mit Personen im direkten Kontakt' },
  { id: '4.6.6', label: 'Kontaktpflege zu Personen außerhalb des direkten Umfelds' },
];

export interface FrequencyQuestionConfig {
  id: string;
  label: string;
}

export const MODULE5_GROUP1_QUESTIONS: FrequencyQuestionConfig[] = [
  { id: '4.5.1', label: 'Medikation' },
  { id: '4.5.2', label: 'Injektionen (subcutan oder intramuskulär)' },
  { id: '4.5.3', label: 'Versorgung intravenöser Zugänge (z. B. Port)' },
  { id: '4.5.4', label: 'Absaugen und Sauerstoffgabe' },
  { id: '4.5.5', label: 'Einreibungen oder Kälte- und Wärmeanwendungen' },
  { id: '4.5.6', label: 'Messung und Deutung von Körperzuständen' },
  { id: '4.5.7', label: 'Körpernahe Hilfsmittel' },
];

export const MODULE5_GROUP2_QUESTIONS: FrequencyQuestionConfig[] = [
  { id: '4.5.8', label: 'Verbandswechsel und Wundversorgung' },
  { id: '4.5.9', label: 'Versorgung mit Stoma' },
  { id: '4.5.10', label: 'Regelmäßige Einmalkatheterisierung und Nutzung von Abführmethoden' },
  { id: '4.5.11', label: 'Therapiemaßnahmen in häuslicher Umgebung' },
];

export const MODULE5_GROUP3_QUESTIONS: FrequencyQuestionConfig[] = [
  { id: '4.5.12', label: 'Zeit- und technikintensive Maßnahmen in häuslicher Umgebung (z. B. invasive Beatmung)' },
  { id: '4.5.13', label: 'Arztbesuche' },
  { id: '4.5.14', label: 'Besuche anderer medizinischer oder therapeutischer Einrichtungen (bis zu 3 Stunden)' },
  { id: '4.5.15', label: 'Zeitlich ausgedehnte Besuche anderer medizinischer oder therapeutischer Einrichtungen (länger als 3 Stunden)' },
];
