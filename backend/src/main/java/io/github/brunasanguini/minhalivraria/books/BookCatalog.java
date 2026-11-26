package io.github.brunasanguini.minhalivraria.books;

import java.util.Collection;
import java.util.Map;
import java.util.Set;

/**
 * Public API of the module: how reading, lists and goals look at a book, and goals at a genre, without touching their
 * entities.
 */
public interface BookCatalog {

    /**
     * @throws io.github.brunasanguini.minhalivraria.shared.error.NotFoundException {@code book.not-found}
     */
    BookSummary require(long bookId);

    /** The books that exist among the ids, by id. Unknown ids are simply absent. */
    Map<Long, BookSummary> findAll(Collection<Long> bookIds);

    /**
     * @throws io.github.brunasanguini.minhalivraria.shared.error.NotFoundException {@code genre.not-found}
     */
    GenreSummary requireGenre(long genreId);

    /** The books classified in the genre or in one of its subgenres. */
    Set<Long> booksOfGenre(long genreId);
}
