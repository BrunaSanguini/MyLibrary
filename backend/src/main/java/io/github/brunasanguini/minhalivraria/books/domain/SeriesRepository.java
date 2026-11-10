package io.github.brunasanguini.minhalivraria.books.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SeriesRepository extends JpaRepository<Series, Long> {

    Page<Series> findByNormalizedNameContaining(String normalizedTerm, Pageable pageable);

    boolean existsByNormalizedName(String normalizedName);

    boolean existsByNormalizedNameAndIdNot(String normalizedName, long id);
}
