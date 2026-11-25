-- A book can be in a series without a position (spec: the position is "Opcional" once the
-- series is chosen). A position still needs a series and stays above zero.
ALTER TABLE book DROP CONSTRAINT ck_book_series_position;

ALTER TABLE book ADD CONSTRAINT ck_book_series_position CHECK (
    (series_id IS NOT NULL OR series_position IS NULL)
        AND (series_position IS NULL OR series_position > 0)
);
