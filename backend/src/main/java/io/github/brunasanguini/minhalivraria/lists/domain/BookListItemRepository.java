package io.github.brunasanguini.minhalivraria.lists.domain;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookListItemRepository extends JpaRepository<BookListItem, BookListItemId> {

    /** The books of a list in the order the user gave them. */
    List<BookListItem> findByIdBookListIdOrderByItemOrderAsc(long bookListId);

    /** The books of several lists at once, each list in its order, for a page of cards. */
    List<BookListItem> findByIdBookListIdInOrderByIdBookListIdAscItemOrderAsc(Collection<Long> bookListIds);
}
