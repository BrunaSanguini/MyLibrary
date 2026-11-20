-- A goal can be turned off in Configurações without losing its target (docs/modelo-de-dados.md).
-- A goal that is off still exists, but the Home does not show it.
ALTER TABLE goal ADD COLUMN enabled BOOLEAN DEFAULT TRUE NOT NULL;
