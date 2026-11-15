package io.github.brunasanguini.minhalivraria.reading.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReadingSessionRepository extends JpaRepository<ReadingSession, Long> {

    List<ReadingSession> findByReadingIdOrderByDateAscIdAsc(long readingId);

    /** A session is always addressed through its reading, so the pair has to match. */
    Optional<ReadingSession> findByIdAndReadingId(long id, long readingId);
}
