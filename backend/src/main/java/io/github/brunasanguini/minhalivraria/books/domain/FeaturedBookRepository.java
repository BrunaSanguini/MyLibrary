package io.github.brunasanguini.minhalivraria.books.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeaturedBookRepository extends JpaRepository<FeaturedBook, Long> {

    List<FeaturedBook> findAllByOrderBySlotAsc();

    Optional<FeaturedBook> findBySlot(short slot);

    List<FeaturedBook> findByBookId(long bookId);
}
