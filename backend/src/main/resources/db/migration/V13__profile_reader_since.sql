-- The year the reader says she started reading, shown in roman numerals on Perfil
-- (docs/modelo-de-dados.md). Empty: the year of the first reading registered.
ALTER TABLE profile ADD COLUMN reader_since INTEGER;
