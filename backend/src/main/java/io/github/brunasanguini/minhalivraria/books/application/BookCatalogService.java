package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.BookCatalog;
import io.github.brunasanguini.minhalivraria.books.BookSummary;
import io.github.brunasanguini.minhalivraria.books.domain.Book;
import io.github.brunasanguini.minhalivraria.books.domain.BookRepository;
import io.github.brunasanguini.minhalivraria.images.ImageUrls;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.util.Collection;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
class BookCatalogService implements BookCatalog {

    private final BookRepository books;

    BookCatalogService(BookRepository books) {
        this.books = books;
    }

    @Override
    public BookSummary require(long bookId) {
        return books.findById(bookId)
                .map(BookCatalogService::toSummary)
                .orElseThrow(() -> new NotFoundException("book.not-found"));
    }

    @Override
    public Map<Long, BookSummary> findAll(Collection<Long> bookIds) {
        return books.findAllById(bookIds).stream()
                .map(BookCatalogService::toSummary)
                .collect(Collectors.toMap(BookSummary::id, Function.identity()));
    }

    private static BookSummary toSummary(Book book) {
        Long cover = book.coverImageId();
        return new BookSummary(book.id(), book.title(), book.pageCount(), cover == null ? null : ImageUrls.of(cover));
    }
}
