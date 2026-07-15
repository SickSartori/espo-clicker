-- ============================================================
-- FIX SICUREZZA — da eseguire sul progetto PROD (dcauqlpxbrqywfcpzvbh)
-- Dashboard Supabase → SQL Editor → incolla ed esegui. Idempotente.
-- (Su DEV già applicato il 2026-07-05 via migrazione harden_save_progress_rpc.)
--
-- Problema: save_progress è SECURITY DEFINER e, per il default Postgres,
-- EXECUTE era concesso a PUBLIC → con la anon key (pubblica nel JS) chiunque
-- poteva sovrascrivere il salvataggio di QUALSIASI utente via
-- POST /rest/v1/rpc/save_progress, bypassando l'auth save_token delle EF.
-- ============================================================

-- 1) save_progress: solo service_role (usato dalle Edge Functions)
REVOKE EXECUTE ON FUNCTION public.save_progress(uuid,text,integer,integer,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_progress(uuid,text,integer,integer,text,jsonb) TO service_role;
-- SECURITY DEFINER senza search_path fisso = rischio hijack via schema shadowing
ALTER FUNCTION public.save_progress(uuid,text,integer,integer,text,jsonb) SET search_path = public, pg_temp;

-- 2) rls_auto_enable (esiste SOLO su prod, residuo di setup): stessa chiusura
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- 3) Verifica: le prime due colonne devono risultare FALSE, la terza TRUE
SELECT has_function_privilege('anon', 'public.save_progress(uuid,text,integer,integer,text,jsonb)', 'EXECUTE') AS anon_exec,
       has_function_privilege('authenticated', 'public.save_progress(uuid,text,integer,integer,text,jsonb)', 'EXECUTE') AS auth_exec,
       has_function_privilege('service_role', 'public.save_progress(uuid,text,integer,integer,text,jsonb)', 'EXECUTE') AS service_exec;
