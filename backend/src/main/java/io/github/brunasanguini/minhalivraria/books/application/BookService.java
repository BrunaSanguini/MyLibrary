package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.application.BookDetailResponse.BookAuthorResponse;
import io.github.brunasanguini.minhalivraria.books.application.BookDetailResponse.BookGenreResponse;
import io.github.brunasanguini.minhalivraria.books.application.BookDetailResponse.BookPublisherResponse;
import io.github.brunasanguini.minhalivraria.books.application.BookDetailResponse.BookSeriesResponse;
import io.github.brunasanguini.minhalivraria.books.application.BookDetailResponse.OpenLibraryResponse;
import io.github.brunasanguini.minhalivraria.books.domain.Author;
import io.github.brunasanguini.minhalivraria.books.domain.AuthorRepository;
import io.github.brunasanguini.minhalivraria.books.domain.Book;
import io.github.brunasanguini.minhalivraria.books.domain.BookFields;
import io.github.brunasanguini.minhalivraria.books.domain.BookRepository;
import io.github.brunasanguini.minhalivraria.books.domain.DuplicatedBookException;
import io.github.brunasanguini.minhalivraria.books.domain.Genre;
import io.github.brunasanguini.minhalivraria.books.domain.GenreRepository;
import io.github.brunasanguini.minhalivraria.books.domain.Ownership;
import io.github.brunasanguini.minhalivraria.books.domain.Publisher;
import io.github.brunasanguini.minhalivraria.books.domain.PublisherRepository;
import io.github.brunasanguini.minhalivraria.books.domain.Series;
import io.github.brunasanguini.minhalivraria.books.domain.SeriesRepository;
import io.github.brunasanguini.minhalivraria.images.ImageKind;
import io.github.brunasanguini.minhalivraria.images.ImageStore;
import io.github.brunasanguini.minhalivraria.images.ImageUrls;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Registering, editing and deleting books by hand. The Open Library import arrives in Marco 2. */
@Service
@Transactional(readOnly = true)
public class BookService {

    private static final String OPEN_LIBRARY_BOOK = "https://openlibrary.org/books/";

    private final BookRepository books;
    private final AuthorRepository authors;
    private final PublisherRepository publishers;
    private final SeriesRepository series;
    private final GenreRepository genres;
    private final ImageStore images;

    BookService(
            BookRepository books,
            AuthorRepository authors,
            PublisherRepository publishers,
            SeriesRepository series,
            GenreRepository genres,
            ImageStore images) {
        this.books = books;
        this.authors = authors;
        this.publishers = publishers;
        this.series = series;
        this.genres = genres;
        this.images = images;
    }

    public BookDetailResponse get(long id) {
        return toResponse(find(id));
    }

    @Transactional
    public BookDetailResponse create(BookRequest request) {
        Book book = new Book(fieldsOf(request));
        checkIsbnIsFree(book.isbn13(), 0);
        applyCatalog(book, request);
        return toResponse(books.save(book));
    }

    @Transactional
    public BookDetailResponse update(long id, BookRequest request) {
        Book book = find(id);
        book.update(fieldsOf(request));
        checkIsbnIsFree(book.isbn13(), id);
        applyCatalog(book, request);
        return toResponse(book);
    }

    /** Deleting a book sends its cover and banner to the trash; book_author and book_genre go with it (FK). */
    @Transactional
    public void delete(long id) {
        Book book = find(id);
        discard(book.replaceCover(null));
        discard(book.replaceBanner(null));
        books.delete(book);
    }

    @Transactional
    public void markFavorite(long id, boolean favorite) {
        find(id).markFavorite(favorite);
    }

    @Transactional
    public void changeOwnership(long id, Ownership ownership) {
        find(id).changeOwnership(ownership);
    }

    /** Replaces the cover; the previous image goes to the trash only after the transaction commits. */
    @Transactional
    public CoverResponse replaceCover(long id, byte[] content) {
        Book book = find(id);
        long imageId = images.store(ImageKind.COVER, content);
        discard(book.replaceCover(imageId));
        return new CoverResponse(ImageUrls.of(imageId));
    }

    @Transactional
    public BannerResponse replaceBanner(long id, byte[] content) {
        Book book = find(id);
        long imageId = images.store(ImageKind.BANNER, content);
        discard(book.replaceBanner(imageId));
        return new BannerResponse(ImageUrls.of(imageId));
    }

    @Transactional
    public void removeCover(long id) {
        discard(find(id).replaceCover(null));
    }

    @Transactional
    public void removeBanner(long id) {
        discard(find(id).replaceBanner(null));
    }

    private void applyCatalog(Book book, BookRequest request) {
        book.assignAuthors(authorsOf(request.authorIdsOrEmpty()));
        book.assignPublisher(publisherOf(request.publisherId()));
        book.assignGenres(genresOf(request.genreIdsOrEmpty()));
        book.assignSeries(seriesOf(request.seriesId()), request.seriesPosition());
    }

    private static BookFields fieldsOf(BookRequest request) {
        return new BookFields(
                request.title(),
                request.subtitle(),
                request.isbn13(),
                request.isbn10(),
                request.pageCount(),
                request.publishedYear(),
                request.languageCode(),
                request.synopsis(),
                request.ownershipOrDefault(),
                request.favoriteOrDefault());
    }

    /** @param currentId the book being edited, or 0 when creating */
    private void checkIsbnIsFree(@Nullable String isbn13, long currentId) {
        if (isbn13 == null) {
            return;
        }
        books.findByIsbn13(isbn13)
                .filter(other -> other.id() != currentId)
                .ifPresent(other -> {
                    throw new DuplicatedBookException("book.isbn-duplicated", other.id());
                });
    }

    private List<Author> authorsOf(List<Long> ids) {
        return ids.stream().distinct().map(this::findAuthor).toList();
    }

    private Author findAuthor(long id) {
        return authors.findById(id).orElseThrow(() -> new NotFoundException("author.not-found"));
    }

    private List<Genre> genresOf(List<Long> ids) {
        return ids.stream().distinct().map(this::findGenre).toList();
    }

    private Genre findGenre(long id) {
        return genres.findById(id).orElseThrow(() -> new NotFoundException("genre.not-found"));
    }

    private @Nullable Publisher publisherOf(@Nullable Long id) {
        return id == null
                ? null
                : publishers.findById(id).orElseThrow(() -> new NotFoundException("publisher.not-found"));
    }

    private @Nullable Series seriesOf(@Nullable Long id) {
        return id == null ? null : series.findById(id).orElseThrow(() -> new NotFoundException("series.not-found"));
    }

    private void discard(@Nullable Long imageId) {
        if (imageId != null) {
            images.discard(imageId);
        }
    }

    private Book find(long id) {
        return books.findById(id).orElseThrow(() -> new NotFoundException("book.not-found"));
    }

    static BookDetailResponse toResponse(Book book) {
        return new BookDetailResponse(
                book.id(),
                book.title(),
                book.subtitle(),
                book.authors().stream()
                        .map(author -> new BookAuthorResponse(author.id(), author.name()))
                        .toList(),
                publisherResponse(book.publisher()),
                seriesResponse(book.series(), book.seriesPosition()),
                book.genres().stream()
                        .map(genre -> new BookGenreResponse(genre.id(), genre.name(), genre.parentId()))
                        .sorted(Comparator.comparing(BookGenreResponse::name))
                        .toList(),
                book.isbn13(),
                book.isbn10(),
                book.pageCount(),
                book.publishedYear(),
                book.languageCode(),
                book.synopsis(),
                book.ownership(),
                book.favorite(),
                url(book.coverImageId()),
                url(book.bannerImageId()),
                openLibraryResponse(book.olWorkKey(), book.olEditionKey()),
                book.createdAt(),
                book.updatedAt());
    }

    private static @Nullable BookPublisherResponse publisherResponse(@Nullable Publisher publisher) {
        return publisher == null ? null : new BookPublisherResponse(publisher.id(), publisher.name());
    }

    private static @Nullable BookSeriesResponse seriesResponse(
            @Nullable Series found, @Nullable BigDecimal position) {
        if (found == null || position == null) {
            return null;
        }
        return new BookSeriesResponse(found.id(), found.name(), position, found.totalVolumes());
    }

    private static @Nullable OpenLibraryResponse openLibraryResponse(
            @Nullable String workKey, @Nullable String editionKey) {
        if (workKey == null && editionKey == null) {
            return null;
        }
        String url = editionKey == null ? null : OPEN_LIBRARY_BOOK + editionKey;
        return new OpenLibraryResponse(workKey, editionKey, url);
    }

    private static @Nullable String url(@Nullable Long imageId) {
        return imageId == null ? null : ImageUrls.of(imageId);
    }
}
