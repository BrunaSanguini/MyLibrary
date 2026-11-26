package io.github.brunasanguini.minhalivraria.books.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BookRepository extends JpaRepository<Book, Long> {

    /** The duplicated-ISBN conflict answers with the id of the book that already has it. */
    Optional<Book> findByIsbn13(String isbn13);

    /** Same for a re-imported Open Library edition. */
    Optional<Book> findByOlEditionKey(String olEditionKey);

    /** Which of the search results are already in the collection. */
    List<Book> findByOlEditionKeyIn(Collection<String> olEditionKeys);

    /** An author with books cannot be deleted (author.has-books). */
    boolean existsByAuthorsId(long authorId);

    /** Books of a publisher being deleted, which lose it and keep the other publishers. */
    List<Book> findByPublishersId(long publisherId);

    /** Books of a series being deleted, to clear series and position together. */
    List<Book> findBySeriesId(long seriesId);

    /** The books of a genre, the ones of its subgenres included. */
    @Query("""
            select distinct b.id from Book b join b.genres g left join g.parent p
            where g.id = :genreId or p.id = :genreId
            """)
    Set<Long> findIdsByGenreOrSubgenre(long genreId);
}
