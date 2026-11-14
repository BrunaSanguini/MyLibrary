package io.github.brunasanguini.minhalivraria.books.application;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.brunasanguini.minhalivraria.books.domain.BookRepository;
import io.github.brunasanguini.minhalivraria.images.ImageSamples;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.assertj.core.groups.Tuple;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

/** The numbers of the Catálogos cards, counted by SQL over the sample collection. */
@SpringBootTest
@Transactional
class CatalogStatsTest {

    private static final Path DATA_DIR = tempDataDir();

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @Autowired
    private BookRepository books;

    @Autowired
    private BookService bookService;

    @Autowired
    private AuthorService authors;

    @Autowired
    private PublisherService publishers;

    @Autowired
    private SeriesService series;

    @Autowired
    private GenreService genres;

    @Autowired
    private EntityManager entityManager;

    @BeforeEach
    void sampleCollection() {
        new SampleCatalog(books, bookService, authors, publishers, series, genres)
                .run(new DefaultApplicationArguments());
        // The counts are read with SQL, so the pending inserts have to reach the database first.
        entityManager.flush();
    }

    @Test
    void shouldCountTheBooksOfEachAuthor() {
        assertThat(authors.search("machado", PageRequest.of(0, 10)).content())
                .singleElement()
                .satisfies(author -> {
                    assertThat(author.bookCount()).isEqualTo(3);
                    assertThat(author.coverUrls()).isEmpty();
                });
        assertThat(authors.search("lima", PageRequest.of(0, 10)).content())
                .singleElement()
                .extracting(AuthorResponse::bookCount)
                .isEqualTo(1L);
    }

    @Test
    void shouldCountTheBooksOfAPublisherAndOfASeries() {
        assertThat(publishers.search(null, PageRequest.of(0, 10)).content())
                .singleElement()
                .extracting(PublisherResponse::bookCount)
                .isEqualTo(3L);
        assertThat(series.search(null, PageRequest.of(0, 10)).content())
                .singleElement()
                .satisfies(found -> {
                    assertThat(found.bookCount()).isEqualTo(3);
                    assertThat(found.totalVolumes()).isEqualTo(3);
                });
    }

    @Test
    void shouldBringTheCountsWhenReadingOneRecord() {
        long machado = authors.search("machado", PageRequest.of(0, 1))
                .content()
                .getFirst()
                .id();

        assertThat(authors.get(machado).bookCount()).isEqualTo(3);
    }

    @Test
    void shouldCountAGenreWithTheBooksOfItsSubgenres() {
        GenreTreeResponse romance = genres.tree().stream()
                .filter(genre -> genre.name().equals("Romance"))
                .findFirst()
                .orElseThrow();

        // Realismo 3 + Naturalismo 1 + Indianismo 2, none tagged with Romance itself.
        assertThat(romance.bookCount()).isEqualTo(6);
        assertThat(romance.subgenres())
                .extracting(GenreTreeResponse.Subgenre::name, GenreTreeResponse.Subgenre::bookCount)
                .containsExactly(
                        Tuple.tuple("Indianismo", 2L), Tuple.tuple("Naturalismo", 1L), Tuple.tuple("Realismo", 3L));
    }

    @Test
    void shouldCountEachBookOnceInAGenreItIsTaggedWithTwice() {
        GenreTreeResponse classic = genres.tree().stream()
                .filter(genre -> genre.name().equals("Clássico brasileiro"))
                .findFirst()
                .orElseThrow();

        assertThat(classic.bookCount()).isEqualTo(7);
    }

    @Test
    void shouldShowTheCoverOfABookOnItsAuthorCard() {
        long book = books.findAll().getFirst().id();
        String cover = bookService.replaceCover(book, ImageSamples.PNG).coverUrl();
        entityManager.flush();

        assertThat(authors.search(null, PageRequest.of(0, 10)).content())
                .anySatisfy(author -> assertThat(author.coverUrls()).containsExactly(cover));
    }

    private static Path tempDataDir() {
        try {
            return Files.createTempDirectory("minha-livraria-catalog-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
