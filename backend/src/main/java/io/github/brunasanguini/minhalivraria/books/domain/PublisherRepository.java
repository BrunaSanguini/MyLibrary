package io.github.brunasanguini.minhalivraria.books.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PublisherRepository extends JpaRepository<Publisher, Long> {

    Page<Publisher> findByNormalizedNameContaining(String normalizedTerm, Pageable pageable);

    boolean existsByNormalizedName(String normalizedName);

    boolean existsByNormalizedNameAndIdNot(String normalizedName, long id);
}
