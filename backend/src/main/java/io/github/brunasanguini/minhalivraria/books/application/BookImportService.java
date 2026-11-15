package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.domain.Author;
import io.github.brunasanguini.minhalivraria.books.domain.AuthorRepository;
import io.github.brunasanguini.minhalivraria.books.domain.Book;
import io.github.brunasanguini.minhalivraria.books.domain.BookFields;
import io.github.brunasanguini.minhalivraria.books.domain.BookRepository;
import io.github.brunasanguini.minhalivraria.books.domain.DuplicatedBookException;
import io.github.brunasanguini.minhalivraria.books.domain.Genre;
import io.github.brunasanguini.minhalivraria.books.domain.GenreRepository;
import io.github.brunasanguini.minhalivraria.books.domain.Publisher;
import io.github.brunasanguini.minhalivraria.books.domain.PublisherRepository;
import io.github.brunasanguini.minhalivraria.books.domain.Series;
import io.github.brunasanguini.minhalivraria.books.domain.SeriesRepository;
import io.github.brunasanguini.minhalivraria.images.ImageKind;
import io.github.brunasanguini.minhalivraria.images.ImageStore;
import io.github.brunasanguini.minhalivraria.openlibrary.OpenLibraryAuthor;
import io.github.brunasanguini.minhalivraria.openlibrary.OpenLibraryBook;
import io.github.brunasanguini.minhalivraria.openlibrary.OpenLibraryCandidate;
import io.github.brunasanguini.minhalivraria.openlibrary.OpenLibraryClient;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.text.TextNormalizer;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Imports books from the Open Library in two steps: a preview that saves nothing and a confirmation (ADR-0004).
 *
 * <p>The service is not transactional on purpose. Talking to the Open Library and downloading the cover can take
 * seconds, so they happen before the transaction that saves the book, its authors and its publisher.
 */
@Service
public class BookImportService {

    private static final int MAX_TITLE = 500;
    private static final int MAX_SYNOPSIS = 10_000;
    private static final int MAX_NAME = 200;

    private final OpenLibraryClient openLibrary;
    private final BookRepository books;
    private final AuthorRepository authors;
    private final PublisherRepository publishers;
    private final SeriesRepository series;
    private final GenreRepository genres;
    private final ImageStore images;
    private final TransactionTemplate transaction;

    BookImportService(
            OpenLibraryClient openLibrary,
            BookRepository books,
            AuthorRepository authors,
            PublisherRepository publishers,
            SeriesRepository series,
            GenreRepository genres,
            ImageStore images,
            TransactionTemplate transaction) {
        this.openLibrary = openLibrary;
        this.books = books;
        this.authors = authors;
        this.publishers = publishers;
        this.series = series;
        this.genres = genres;
        this.images = images;
        this.transaction = transaction;
    }

    /** Searches by title or author. Each result says whether its edition is already in the collection. */
    public List<ImportCandidateResponse> search(String query) {
        List<OpenLibraryCandidate> found = openLibrary.search(query);
        Map<String, Long> inCollection =
                books
                        .findByOlEditionKeyIn(found.stream()
                                .map(OpenLibraryCandidate::editionKey)
                                .toList())
                        .stream()
                        .filter(book -> book.olEditionKey() != null)
                        .collect(Collectors.toMap(Book::olEditionKey, Book::id, (first, second) -> first));
        return found.stream()
                .map(candidate -> new ImportCandidateResponse(
                        candidate.editionKey(),
                        candidate.workKey(),
                        candidate.title(),
                        candidate.authors(),
                        candidate.publishedYear(),
                        coverUrl(candidate.coverId()),
                        inCollection.get(candidate.editionKey())))
                .toList();
    }

    public ImportPreviewResponse previewByIsbn(String isbn) {
        return toPreview(openLibrary.findByIsbn(isbn));
    }

    public ImportPreviewResponse previewByEdition(String editionKey) {
        return toPreview(openLibrary.findEdition(editionKey));
    }

    /**
     * Saves the edition as a book of the collection, with its cover.
     *
     * @throws DuplicatedBookException {@code book.edition-duplicated} or {@code book.isbn-duplicated}, with the id
     *     of the book that is already in the collection
     */
    public BookDetailResponse importEdition(ImportRequest request) {
        OpenLibraryBook source = openLibrary.findEdition(request.editionKey());
        // Checked before the download, so a repeated import does not fetch the cover for nothing.
        checkIsNotInCollection(source);
        Optional<byte[]> cover =
                source.coverId() == null ? Optional.empty() : openLibrary.downloadCover(source.coverId());
        return Objects.requireNonNull(transaction.execute(status -> save(source, request, cover)));
    }

    /**
     * Runs in one transaction. The cover is stored first: if anything after it fails, the rollback takes the file
     * away with the row, and no cover is left behind without a book.
     */
    private BookDetailResponse save(OpenLibraryBook source, ImportRequest request, Optional<byte[]> cover) {
        checkIsNotInCollection(source);
        Book book = new Book(new BookFields(
                Objects.requireNonNull(truncate(source.title(), MAX_TITLE)),
                truncate(source.subtitle(), MAX_TITLE),
                source.isbn13(),
                source.isbn10(),
                source.pageCount(),
                source.publishedYear(),
                source.languageCode(),
                truncate(source.description(), MAX_SYNOPSIS),
                request.ownershipOrDefault(),
                false));
        book.linkToOpenLibrary(source.workKey(), source.editionKey());
        cover.ifPresent(content -> book.replaceCover(images.store(ImageKind.COVER, content)));
        book.assignAuthors(source.authors().stream().map(this::authorOf).distinct().toList());
        book.assignPublisher(publisherOf(source.publisher()));
        book.assignGenres(
                request.genreIdsOrEmpty().stream().distinct().map(this::findGenre).toList());
        book.assignSeries(seriesOf(request.seriesId()), request.seriesPosition());
        return BookService.toResponse(books.save(book));
    }

    private void checkIsNotInCollection(OpenLibraryBook source) {
        books.findByOlEditionKey(source.editionKey()).ifPresent(existing -> {
            throw new DuplicatedBookException("book.edition-duplicated", existing.id());
        });
        if (source.isbn13() != null) {
            books.findByIsbn13(source.isbn13()).ifPresent(existing -> {
                throw new DuplicatedBookException("book.isbn-duplicated", existing.id());
            });
        }
    }

    /** The author the collection already knows, by Open Library key and then by name; otherwise a new one. */
    private Author authorOf(OpenLibraryAuthor source) {
        String name = Objects.requireNonNull(truncate(source.name(), MAX_NAME));
        Optional<Author> known = authors.findByOlAuthorKey(source.key());
        if (known.isPresent()) {
            return known.get();
        }
        Optional<Author> sameName = authors.findFirstByNormalizedNameOrderById(TextNormalizer.normalize(name));
        if (sameName.isPresent()) {
            Author author = sameName.get();
            if (author.olAuthorKey() == null) {
                author.linkToOpenLibrary(source.key());
            }
            return author;
        }
        return authors.save(new Author(name, source.key()));
    }

    private @Nullable Publisher publisherOf(@Nullable String sourceName) {
        String name = truncate(sourceName, MAX_NAME);
        if (name == null) {
            return null;
        }
        return publishers
                .findByNormalizedName(TextNormalizer.normalize(name))
                .orElseGet(() -> publishers.save(new Publisher(name)));
    }

    private Genre findGenre(long id) {
        return genres.findById(id).orElseThrow(() -> new NotFoundException("genre.not-found"));
    }

    private @Nullable Series seriesOf(@Nullable Long id) {
        return id == null ? null : series.findById(id).orElseThrow(() -> new NotFoundException("series.not-found"));
    }

    private ImportPreviewResponse toPreview(OpenLibraryBook book) {
        return new ImportPreviewResponse(
                book.editionKey(),
                book.workKey(),
                book.title(),
                book.subtitle(),
                book.authors().stream().map(OpenLibraryAuthor::name).toList(),
                book.publisher(),
                book.pageCount(),
                book.isbn13(),
                book.isbn10(),
                book.publishedYear(),
                book.languageCode(),
                book.description(),
                coverUrl(book.coverId()),
                libraryBookId(book));
    }

    private @Nullable Long libraryBookId(OpenLibraryBook book) {
        Optional<Book> sameEdition = books.findByOlEditionKey(book.editionKey());
        if (sameEdition.isPresent() || book.isbn13() == null) {
            return sameEdition.map(Book::id).orElse(null);
        }
        return books.findByIsbn13(book.isbn13()).map(Book::id).orElse(null);
    }

    private @Nullable String coverUrl(@Nullable Long coverId) {
        return coverId == null ? null : openLibrary.coverUrl(coverId);
    }

    private static @Nullable String truncate(@Nullable String text, int max) {
        if (text == null) {
            return null;
        }
        String stripped = text.strip();
        if (stripped.isEmpty()) {
            return null;
        }
        return stripped.length() <= max ? stripped : stripped.substring(0, max).strip();
    }
}
