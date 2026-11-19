-- A list has a cover color, chosen among the six of the design system, and at most one list is pinned on the
-- Lists page. The service keeps the "at most one" (H2 has no partial unique index); the lists that already exist get
-- the default color and are not pinned.

ALTER TABLE book_list ADD COLUMN color VARCHAR(16) NOT NULL DEFAULT 'PLUM';
ALTER TABLE book_list ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE book_list ADD CONSTRAINT ck_book_list_color CHECK (color IN ('FOREST', 'PLUM', 'NIGHT', 'RUST', 'SEAL', 'MOSS'));
