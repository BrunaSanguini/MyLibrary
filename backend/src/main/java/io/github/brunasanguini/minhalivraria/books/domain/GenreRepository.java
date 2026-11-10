package io.github.brunasanguini.minhalivraria.books.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface GenreRepository extends JpaRepository<Genre, Long> {

    boolean existsByNormalizedName(String normalizedName);

    boolean existsByNormalizedNameAndIdNot(String normalizedName, long id);

    boolean existsByParentId(long parentId);

    /** Every genre and subgenre with its parent, in name order. */
    @Query("SELECT g FROM Genre g LEFT JOIN FETCH g.parent ORDER BY g.normalizedName")
    List<Genre> findAllWithParent();
}
