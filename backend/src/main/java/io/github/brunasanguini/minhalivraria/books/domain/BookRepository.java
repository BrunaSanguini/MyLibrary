package io.github.brunasanguini.minhalivraria.books.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookRepository extends JpaRepository<Book, Long> {
  
  Optional<Book> findByIsbn13(String isbn13);
  
  Optional<Book> findByIsbn10(String isbn10);

  Optional<Book> findByOlEditionKey(String olEditionKey);
  
  boolean existsByIsbn13AndIdNot(String isbn13, Long id);
  
  boolean existsByIsbn10AndIdNot(String isbn10, Long id);

  boolean existsByOlEditionKeyAndIdNot(String olEditionKey, Long id);

}
