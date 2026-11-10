package io.github.brunasanguini.minhalivraria.books.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorRepository extends JpaRepository<Author, Long> {

    Page<Author> findByNormalizedNameContaining(String normalizedTerm, Pageable pageable);
}
