-- pg_cron/pg_net fuer den geplanten Lauf von purge-expired-accounts.
-- Der eigentliche cron.schedule(...)-Aufruf braucht die projektspezifische
-- Functions-URL und ein Secret und wird daher NICHT hier, sondern einmalig
-- manuell im SQL-Editor des Supabase-Dashboards eingerichtet (siehe
-- README.md, Abschnitt "DSGVO-Self-Service").

create extension if not exists pg_cron;
create extension if not exists pg_net;
