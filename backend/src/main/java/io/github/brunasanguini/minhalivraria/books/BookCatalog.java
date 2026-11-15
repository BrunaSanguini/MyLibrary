package io.github.brunasanguini.minhalivraria.books;

import java.util.Collection;
import java.util.Map;

/** Public API of the module: how reading, lists and goals look at a book without touching its entity. */
public interface BookCatalog {

    /**
     * @throws io.github.brunasanguini.minhalivraria.shared.error.NotFoundException {@code book.not-found}
     */
    BookSummary require(long bookId);

    /** The books that exist among the ids, by id. Unknown ids are simply absent. */
    Map<Long, BookSummary> findAll(Collection<Long> bookIds);
}
