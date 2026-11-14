package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.books.domain.BookRepository;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sample collection for development, demos and the E2E tests: Brazilian classics in the public domain, with no
 * covers, so the front-end shows the placeholder ones (docs/testes-e-qualidade.md).
 *
 * <p>Only exists in the {@code dev} and {@code e2e} profiles, and only fills a collection that has no book and no
 * author yet. It can never touch a real collection: the production profile does not even create this bean.
 */
@Component
@Profile({"dev", "e2e"})
class SampleCatalog implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SampleCatalog.class);

    private final BookRepository books;
    private final BookService bookService;
    private final AuthorService authors;
    private final PublisherService publishers;
    private final SeriesService series;
    private final GenreService genres;

    SampleCatalog(
            BookRepository books,
            BookService bookService,
            AuthorService authors,
            PublisherService publishers,
            SeriesService series,
            GenreService genres) {
        this.books = books;
        this.bookService = bookService;
        this.authors = authors;
        this.publishers = publishers;
        this.series = series;
        this.genres = genres;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        if (books.count() > 0 || !genres.tree().isEmpty()) {
            return;
        }
        long machado = authors.create(new AuthorRequest("Machado de Assis")).id();
        long azevedo = authors.create(new AuthorRequest("Aluísio Azevedo")).id();
        long alencar = authors.create(new AuthorRequest("José de Alencar")).id();
        long barreto = authors.create(new AuthorRequest("Lima Barreto")).id();

        long garnier = publishers.create(new PublisherRequest("Garnier")).id();

        long romance = genres.create(new GenreRequest("Romance", null)).id();
        long realism = genres.create(new GenreRequest("Realismo", romance)).id();
        long naturalism =
                genres.create(new GenreRequest("Naturalismo", romance)).id();
        long indianism = genres.create(new GenreRequest("Indianismo", romance)).id();
        long classic =
                genres.create(new GenreRequest("Clássico brasileiro", null)).id();
        long satire = genres.create(new GenreRequest("Sátira", null)).id();

        long trilogy = series.create(new SeriesRequest("Trilogia Realista", 3)).id();

        book(
                "Memórias Póstumas de Brás Cubas",
                1881,
                machado,
                null,
                trilogy,
                1,
                Ownership.OWNED,
                true,
                realism,
                classic);
        book("Quincas Borba", 1891, machado, garnier, trilogy, 2, Ownership.OWNED, false, realism, classic);
        book("Dom Casmurro", 1899, machado, garnier, trilogy, 3, Ownership.OWNED, true, realism, classic);
        book("O Cortiço", 1890, azevedo, garnier, null, null, Ownership.OWNED, false, naturalism, classic);
        book("Iracema", 1865, alencar, null, null, null, Ownership.WISHLIST, false, indianism, classic);
        book("O Guarani", 1857, alencar, null, null, null, Ownership.NONE, false, indianism, classic);
        book(
                "Triste Fim de Policarpo Quaresma",
                1915,
                barreto,
                null,
                null,
                null,
                Ownership.WISHLIST,
                false,
                satire,
                classic);
        log.info("Sample collection loaded: 7 books");
    }

    private void book(
            String title,
            int year,
            long author,
            @Nullable Long publisher,
            @Nullable Long seriesId,
            @Nullable Integer position,
            Ownership ownership,
            boolean favorite,
            long... genreIds) {
        bookService.create(new BookRequest(
                title,
                null,
                null,
                null,
                null,
                (short) year,
                "por",
                null,
                List.of(author),
                publisher,
                Arrays.stream(genreIds).boxed().toList(),
                seriesId,
                position == null ? null : BigDecimal.valueOf(position),
                ownership,
                favorite));
    }
}
