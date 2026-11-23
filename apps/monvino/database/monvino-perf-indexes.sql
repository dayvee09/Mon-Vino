-- Phase 2 performance indexes for Mon Vino (safe to re-run).
-- Apply on existing DBs: mysql … < database/monvino-perf-indexes.sql

SET NAMES utf8mb4;

-- Prefix search on SAQ product codes (equality / LIKE '123%').
ALTER TABLE `vino__bouteille`
  ADD INDEX `idx_vino__bouteille_code_saq` (`code_saq`);

-- FULLTEXT for catalogue autocomplete (MATCH … AGAINST).
-- Ignore error if index already exists when re-applying manually.
ALTER TABLE `vino__bouteille`
  ADD FULLTEXT INDEX `ft_vino__bouteille_nom` (`nom`);

-- Filter personnalise + join cellier #1 catalogue scans.
ALTER TABLE `vino__bouteille`
  ADD INDEX `idx_vino__bouteille_personnalise` (`personnalise`);
