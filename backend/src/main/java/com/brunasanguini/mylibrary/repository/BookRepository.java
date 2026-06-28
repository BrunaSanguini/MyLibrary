package com.brunasanguini.mylibrary.repository;

import com.brunasanguini.mylibrary.entity.Book;
import com.brunasanguini.mylibrary.entity.ReadingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookRepository extends JpaRepository<Book, UUID> {

    Optional<Book> findByIsbn(String isbn);
    boolean existsByIsbn(String isbn);
    List<Book> findByReadingStatus(ReadingStatus status);

    @Query("SELECT b FROM Book b JOIN b.tags t WHERE t = :tag")
    List<Book> findByTag(String tag);

    Long countByReadingStatus(ReadingStatus status);

    boolean existsByGenresId(UUID genreId);
    boolean existsByPublisherId(UUID publisherId);
    boolean existsBySeriesId(UUID seriesId);
}