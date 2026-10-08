-- Aktives Scoring-Ruleset, verifiziert gegen die offizielle Excel-Vorlage
-- (2016_11_Begutachtungsmodul_Pflegegrade.xltx) und die BRi-Richtlinie
-- (2026_10_01_BRi_Pflege.pdf, S. 96-111). Jeder Eintrag in step_tables ist
-- eine aufsteigend sortierte Liste von { max, value }: der erste Eintrag,
-- dessen "max" >= Rohsumme ist, bestimmt den gewichteten Punktwert.

insert into public.scoring_rulesets (
  version_label, valid_from, is_active, step_tables, pflegegrad_thresholds
) values (
  'BRi-2026',
  '2026-10-01',
  true,
  '{
    "m1": [{"max": 1, "value": 0}, {"max": 3, "value": 2.5}, {"max": 5, "value": 5}, {"max": 9, "value": 7.5}, {"max": 15, "value": 10}],
    "m2": [{"max": 1, "value": 0}, {"max": 5, "value": 3.75}, {"max": 10, "value": 7.5}, {"max": 16, "value": 11.25}, {"max": 33, "value": 15}],
    "m3": [{"max": 0, "value": 0}, {"max": 2, "value": 3.75}, {"max": 4, "value": 7.5}, {"max": 6, "value": 11.25}, {"max": 65, "value": 15}],
    "m4": [{"max": 2, "value": 0}, {"max": 7, "value": 10}, {"max": 18, "value": 20}, {"max": 36, "value": 30}, {"max": 54, "value": 40}],
    "m5": [{"max": 0, "value": 0}, {"max": 1, "value": 5}, {"max": 3, "value": 10}, {"max": 5, "value": 15}, {"max": 15, "value": 20}],
    "m6": [{"max": 0, "value": 0}, {"max": 3, "value": 3.75}, {"max": 6, "value": 7.5}, {"max": 11, "value": 11.25}, {"max": 18, "value": 15}]
  }'::jsonb,
  '[
    {"min": 0, "max": 12.5, "pflegegrad": 0},
    {"min": 12.5, "max": 27, "pflegegrad": 1},
    {"min": 27, "max": 47.5, "pflegegrad": 2},
    {"min": 47.5, "max": 70, "pflegegrad": 3},
    {"min": 70, "max": 90, "pflegegrad": 4},
    {"min": 90, "max": 100.01, "pflegegrad": 5}
  ]'::jsonb
);

-- ---------------------------------------------------------------------------
-- Leitfaden-Textbausteine (guide_templates). Allgemeine Bloecke pro
-- Pflegegrad + modulspezifische Hinweise fuer die drei auffaelligen
-- Schweregrade (erhebliche/schwere/schwerste). Ueber den Admin-Bereich
-- (Phase 5) redaktionell pflegbar, ohne Redeploy der Edge Function.
-- ---------------------------------------------------------------------------

insert into public.guide_templates (pflegegrad, title, body_markdown) values
(0, 'Kein Pflegegrad',
 'Nach deiner Selbsteinschätzung ergibt sich aktuell kein Pflegegrad (Gesamtpunktwert unter 12,5). ' ||
 'Das bedeutet nicht, dass keine Unterstützung sinnvoll sein kann: Bei beginnenden Einschränkungen ' ||
 'lohnt sich oft schon eine kostenlose Pflegeberatung, um frühzeitig Hilfsmittel, Wohnraumanpassungen ' ||
 'oder Präventionsangebote zu klären.'),
(1, 'Pflegegrad 1 – geringe Beeinträchtigungen',
 'Deine Angaben entsprechen geringen Beeinträchtigungen der Selbständigkeit oder der Fähigkeiten. ' ||
 'Pflegegrad 1 eröffnet u. a. Anspruch auf den Entlastungsbetrag, Wohnraumanpassungen und ' ||
 'Beratungsleistungen. Die genauen Leistungsbeträge ändern sich gelegentlich – lass sie dir im ' ||
 'Beratungsgespräch aktuell bestätigen.'),
(2, 'Pflegegrad 2 – erhebliche Beeinträchtigungen',
 'Deine Angaben entsprechen erheblichen Beeinträchtigungen der Selbständigkeit oder der Fähigkeiten. ' ||
 'Ab Pflegegrad 2 kommen u. a. Pflegegeld, Pflegesachleistungen und Verhinderungspflege in Betracht. ' ||
 'Die konkreten Beträge erfährst du aktuell bei deiner Pflegekasse oder einer Pflegeberatungsstelle.'),
(3, 'Pflegegrad 3 – schwere Beeinträchtigungen',
 'Deine Angaben entsprechen schweren Beeinträchtigungen der Selbständigkeit oder der Fähigkeiten. ' ||
 'Neben den Leistungen aus Pflegegrad 2 steigen ab hier insbesondere Pflegegeld und Pflegesachleistungen ' ||
 'deutlich an. Prüfe mit einer Beratungsstelle auch Entlastungsangebote für pflegende Angehörige.'),
(4, 'Pflegegrad 4 – schwerste Beeinträchtigungen',
 'Deine Angaben entsprechen schwersten Beeinträchtigungen der Selbständigkeit oder der Fähigkeiten. ' ||
 'In diesem Bereich wird häufig eine Kombination aus professioneller Pflege und Unterstützung durch ' ||
 'Angehörige notwendig. Lass dich zu teilstationären Angeboten (Tages-/Nachtpflege) beraten.'),
(5, 'Pflegegrad 5 – schwerste Beeinträchtigungen mit besonderen Anforderungen',
 'Deine Angaben entsprechen schwersten Beeinträchtigungen der Selbständigkeit mit besonderen ' ||
 'Anforderungen an die pflegerische Versorgung – unabhängig vom genauen Punktwert kann dies auch bei ' ||
 'einer besonderen Bedarfskonstellation (z. B. vollständigem Verlust der Fähigkeit, Arme und Beine ' ||
 'einzusetzen) zutreffen. Besprich frühzeitig mit einer Pflegeberatungsstelle, welche Versorgungsform ' ||
 '(häuslich, teil- oder vollstationär) zu eurer Situation passt.');

insert into public.guide_templates (module_number, score_band, title, body_markdown) values
(1, 'erhebliche', 'Mobilität – worauf du dich vorbereiten kannst',
 'Notiere, bei welchen Bewegungen (Aufstehen, Positionswechsel im Bett, Gehen innerhalb der Wohnung, ' ||
 'Treppensteigen) regelmäßig Hilfe nötig ist und wie oft das vorkommt.'),
(1, 'schwere', 'Mobilität – worauf du dich vorbereiten kannst',
 'Beschreibe konkret, welche Hilfsmittel (Rollator, Rollstuhl) bereits genutzt werden und bei welchen ' ||
 'Bewegungen eine zweite Person zur Unterstützung nötig ist.'),
(1, 'schwerste', 'Mobilität – worauf du dich vorbereiten kannst',
 'Halte fest, ob ein vollständiger Verlust der Eigenbewegung vorliegt und ob dafür bereits technische ' ||
 'Hilfsmittel (z. B. Lifter) oder dauerhafte Unterstützung durch zwei Personen notwendig sind.'),
(2, 'erhebliche', 'Kognitive/kommunikative Fähigkeiten – worauf du dich vorbereiten kannst',
 'Sammle Beispiele, in welchen Alltagssituationen Orientierung oder Verständigung schwerfallen, etwa ' ||
 'bei zeitlicher Orientierung oder dem Verstehen von Aufforderungen.'),
(2, 'schwere', 'Kognitive/kommunikative Fähigkeiten – worauf du dich vorbereiten kannst',
 'Dokumentiere, wie oft Erinnerungs- oder Verständigungsprobleme zu konkreten Problemen im Alltag ' ||
 'führen (z. B. Verlaufen, Nichterkennen nahestehender Personen).'),
(2, 'schwerste', 'Kognitive/kommunikative Fähigkeiten – worauf du dich vorbereiten kannst',
 'Beschreibe, ob eine Verständigung über elementare Bedürfnisse hinaus kaum noch möglich ist und wie ' ||
 'durchgängig Betreuung erforderlich ist.'),
(3, 'erhebliche', 'Verhalten/psychische Problemlagen – worauf du dich vorbereiten kannst',
 'Führe auf, welche Verhaltensweisen (z. B. nächtliche Unruhe, Ängste) wie oft in den letzten Wochen ' ||
 'aufgetreten sind – ein kurzes Pflegetagebuch hilft hier besonders.'),
(3, 'schwere', 'Verhalten/psychische Problemlagen – worauf du dich vorbereiten kannst',
 'Notiere konkrete Vorfälle (Datum, Auslöser, Dauer) zu aggressivem oder abwehrendem Verhalten gegenüber ' ||
 'Unterstützung – das erleichtert dem Gutachter die Einschätzung der Häufigkeit erheblich.'),
(3, 'schwerste', 'Verhalten/psychische Problemlagen – worauf du dich vorbereiten kannst',
 'Beschreibe, ob die Verhaltensweisen täglich auftreten und welche Unterstützung dafür ständig bereitstehen muss.'),
(4, 'erhebliche', 'Selbstversorgung – worauf du dich vorbereiten kannst',
 'Halte fest, bei welchen Tätigkeiten (Waschen, Anziehen, Essen) teilweise Hilfe nötig ist und wie oft ' ||
 'pro Tag das vorkommt.'),
(4, 'schwere', 'Selbstversorgung – worauf du dich vorbereiten kannst',
 'Dokumentiere insbesondere Inkontinenz-bezogene Unterstützung (Häufigkeit, Hilfsmittel) sowie Hilfe ' ||
 'beim Essen und Trinken – diese Kriterien sind besonders hoch gewichtet.'),
(4, 'schwerste', 'Selbstversorgung – worauf du dich vorbereiten kannst',
 'Beschreibe, ob nahezu alle Selbstversorgungs-Tätigkeiten vollständig durch andere übernommen werden ' ||
 'müssen, inklusive Ernährung (z. B. über Sonde) und Ausscheidung.'),
(5, 'erhebliche', 'Krankheits-/therapiebedingte Anforderungen – worauf du dich vorbereiten kannst',
 'Liste alle regelmäßigen Behandlungen (Medikamente, Verbandswechsel, Arztbesuche) mit Häufigkeit ' ||
 '(täglich/wöchentlich/monatlich) auf – am besten als kurze Tabelle.'),
(5, 'schwere', 'Krankheits-/therapiebedingte Anforderungen – worauf du dich vorbereiten kannst',
 'Ergänze, welche Behandlungen mehrfach täglich nötig sind (z. B. Injektionen, Absaugen) und wie lange ' ||
 'diese jeweils dauern.'),
(5, 'schwerste', 'Krankheits-/therapiebedingte Anforderungen – worauf du dich vorbereiten kannst',
 'Beschreibe zeit- und technikintensive Maßnahmen (z. B. invasive Beatmung) im Detail – diese wiegen in ' ||
 'der Berechnung besonders schwer.'),
(6, 'erhebliche', 'Alltagsleben/soziale Kontakte – worauf du dich vorbereiten kannst',
 'Notiere, wie selbständig der Tagesablauf gestaltet wird und wie es um die Pflege sozialer Kontakte steht.'),
(6, 'schwere', 'Alltagsleben/soziale Kontakte – worauf du dich vorbereiten kannst',
 'Beschreibe, wie oft Unterstützung bei der Tagesstrukturierung oder beim Aufrechterhalten von Kontakten ' ||
 'nötig ist und wer diese aktuell leistet.'),
(6, 'schwerste', 'Alltagsleben/soziale Kontakte – worauf du dich vorbereiten kannst',
 'Halte fest, ob eine eigenständige Tagesgestaltung praktisch nicht mehr möglich ist und durchgängige ' ||
 'Begleitung erforderlich ist.');
