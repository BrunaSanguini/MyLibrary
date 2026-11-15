package io.github.brunasanguini.minhalivraria.books.domain;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorRepository extends JpaRepository<Author, Long> {

    Page<Author> findByNormalizedNameContaining(String normalizedTerm, Pageable pageable);

    /** An import reuses the author it already knows by the Open Library key. */
    Optional<Author> findByOlAuthorKey(String olAuthorKey);

    /** Names are not unique, so an import that only has the name reuses the oldest author with it. */
    Optional<Author> findFirstByNormalizedNameOrderById(String normalizedName);
}
