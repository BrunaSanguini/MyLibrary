-- A book can have more than one publisher (a co-edition). publisher_order keeps the order printed on the book.
-- The publisher of each book moves from book.publisher_id to the new table, as the first one.

CREATE TABLE book_publisher (
    book_id         BIGINT NOT NULL,
    publisher_id    BIGINT NOT NULL,
    publisher_order INT    NOT NULL,
    CONSTRAINT pk_book_publisher PRIMARY KEY (book_id, publisher_id),
    CONSTRAINT fk_book_publisher_book FOREIGN KEY (book_id) REFERENCES book (id) ON DELETE CASCADE,
    -- Without cascade: deleting a publisher takes it out of the books first (PublisherService), so the order of
    -- the others has no gap.
    CONSTRAINT fk_book_publisher_publisher FOREIGN KEY (publisher_id) REFERENCES publisher (id),
    CONSTRAINT ck_book_publisher_order CHECK (publisher_order >= 0)
);

CREATE INDEX ix_book_publisher_publisher ON book_publisher (publisher_id);

INSERT INTO book_publisher (book_id, publisher_id, publisher_order)
SELECT id, publisher_id, 0 FROM book WHERE publisher_id IS NOT NULL;

ALTER TABLE book DROP CONSTRAINT fk_book_publisher;
ALTER TABLE book DROP COLUMN publisher_id;
