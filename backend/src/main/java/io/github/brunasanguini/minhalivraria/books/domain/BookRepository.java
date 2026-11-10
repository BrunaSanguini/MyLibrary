package io.github.brunasanguini.minhalivraria.books.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookRepository extends JpaRepository<Book, Long> {

    /** The duplicated-ISBN conflict answers with the id of the book that already has it. */
    Optional<Book> findByIsbn13(String isbn13);

    /** Same for a re-imported Open Library edition. */
    Optional<Book> findByOlEditionKey(String olEditionKey);

    /** An author with books cannot be deleted (author.has-books). */
    boolean existsByAuthorsId(long authorId);

    /** Books of a series being deleted, to clear series and position together. */
    List<Book> findBySeriesId(long seriesId);
}
