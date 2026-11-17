package io.github.brunasanguini.minhalivraria.lists.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BookListRepository extends JpaRepository<BookList, Long> {

    boolean existsByNormalizedName(String normalizedName);

    /** Renaming a list to the name it already has is not a duplicate. */
    boolean existsByNormalizedNameAndIdNot(String normalizedName, long id);
}
