package io.github.brunasanguini.minhalivraria.lists.domain;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface BookListRepository extends JpaRepository<BookList, Long> {

    boolean existsByNormalizedName(String normalizedName);

    /** Renaming a list to the name it already has is not a duplicate. */
    boolean existsByNormalizedNameAndIdNot(String normalizedName, long id);

    /** The lists whose name has the term, in the given order. The service filters the rest and pages. */
    List<BookList> findByNormalizedNameContaining(String normalizedTerm, Sort sort);

    /**
     * Stamps the list as changed when its books are added, removed or reordered. The books are not part of the entity,
     * so nothing makes it dirty and the audit does not run: this is a bulk update.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update BookList l set l.updatedAt = :now where l.id = :id")
    void touch(long id, Instant now);

    /**
     * Pinning is not a change of the list, so it does not move {@code updated_at}: a bulk update, which the audit does
     * not see.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update BookList l set l.pinned = :pinned where l.id = :id")
    void setPinned(long id, boolean pinned);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update BookList l set l.pinned = false where l.pinned = true")
    void unpinAll();
}
