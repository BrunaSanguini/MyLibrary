-- The rating of each reading (docs/modelo-de-dados.md): the book page shows "Nota nesta leitura"
-- and how the rating changed from the first reading to the latest. Saving the rating of the book
-- writes it on its latest reading too; here, the latest reading of each rated book gets it.
ALTER TABLE reading ADD COLUMN rating DECIMAL(2, 1);

ALTER TABLE reading ADD CONSTRAINT ck_reading_rating CHECK (
    rating IS NULL OR (rating BETWEEN 1 AND 5 AND rating * 2 = FLOOR(rating * 2))
);

UPDATE reading r
SET rating = (SELECT rv.rating FROM review rv WHERE rv.book_id = r.book_id)
WHERE r.id = (
    SELECT latest.id FROM reading latest
    WHERE latest.book_id = r.book_id
    ORDER BY CASE WHEN latest.status = 'IN_PROGRESS' THEN 0 ELSE 1 END,
        latest.end_date DESC NULLS LAST,
        latest.id DESC
    FETCH FIRST 1 ROW ONLY
);
