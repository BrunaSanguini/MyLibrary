package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.BookCatalog;
import io.github.brunasanguini.minhalivraria.books.BookSummary;
import io.github.brunasanguini.minhalivraria.books.GenreSummary;
import io.github.brunasanguini.minhalivraria.books.domain.Author;
import io.github.brunasanguini.minhalivraria.books.domain.Book;
import io.github.brunasanguini.minhalivraria.books.domain.BookRepository;
import io.github.brunasanguini.minhalivraria.books.domain.GenreRepository;
import io.github.brunasanguini.minhalivraria.images.ImageUrls;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
class BookCatalogService implements BookCatalog {

    private final BookRepository books;
    private final GenreRepository genres;

    BookCatalogService(BookRepository books, GenreRepository genres) {
        this.books = books;
        this.genres = genres;
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

    @Override
    public GenreSummary requireGenre(long genreId) {
        return genres.findById(genreId)
                .map(genre -> new GenreSummary(genre.id(), genre.name()))
                .orElseThrow(() -> new NotFoundException("genre.not-found"));
    }

    @Override
    public Set<Long> booksOfGenre(long genreId) {
        return books.findIdsByGenreOrSubgenre(genreId);
    }

    private static BookSummary toSummary(Book book) {
        Long cover = book.coverImageId();
        return new BookSummary(
                book.id(),
                book.title(),
                book.pageCount(),
                cover == null ? null : ImageUrls.of(cover),
                book.authors().stream().map(Author::name).toList(),
                book.ownership());
    }
}
