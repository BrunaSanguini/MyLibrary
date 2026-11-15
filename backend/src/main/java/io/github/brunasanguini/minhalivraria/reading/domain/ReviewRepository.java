package io.github.brunasanguini.minhalivraria.reading.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Optional<Review> findByBookId(long bookId);
}
