CREATE TABLE book (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  subtitle VARCHAR(500),
  isbn13 CHAR(13) UNIQUE,
  isbn10 CHAR(10),
  page_count INT CHECK (page_count > 0),
  published_year SMALLINT,
  language_code VARCHAR(3),
  synopsis VARCHAR(10000),
  ownership VARCHAR(10) DEFAULT 'NONE',
  favorite BOOLEAN DEFAULT FALSE,
  publisher_id BIGINT REFERENCES publisher(id) ON DELETE SET NULL,
  series_id BIGINT,
  series_position DECIMAL(4,1),
  cover_image_id BIGINT REFERENCES image(id) ON DELETE SET NULL,
  banner_image_id BIGINT REFERENCES image(id) ON DELETE SET NULL,
  ol_work_key VARCHAR(32),
  ol_edition_key VARCHAR(32) UNIQUE,
  search_text VARCHAR(1001) GENERATED ALWAYS AS (LOWER(CONCAT(COALESCE(title, ''), ' ', COALESCE(subtitle, '')))) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_book_series_position CHECK (
    (series_id IS NULL AND series_position IS NULL) OR 
    (series_id IS NOT NULL AND series_position IS NOT NULL)  
  )
);

CREATE INDEX ix_book_search_text ON book USING gin(to_tsvector('english', search_text));

CREATE TABLE book_author (
  book_id BIGINT REFERENCES book(id) ON DELETE CASCADE,
  author_id BIGINT REFERENCES author(id) ON DELETE CASCADE,
  author_order SMALLINT, 
  PRIMARY KEY (book_id, author_id)
);

CREATE TABLE book_genre (
  book_id BIGINT REFERENCES book(id) ON DELETE CASCADE,
  genre_id BIGINT REFERENCES genre(id) ON DELETE CASCADE, 
  PRIMARY KEY (book_id, genre_id)  
);
