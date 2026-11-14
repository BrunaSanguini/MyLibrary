package io.github.brunasanguini.minhalivraria.books.application;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.brunasanguini.minhalivraria.books.domain.BookRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class SampleCatalogTest {

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
    private ApplicationContext context;

    @Test
    void shouldLoadTheSampleCollectionIntoAnEmptyDatabase() {
        sample().run(new DefaultApplicationArguments());

        assertThat(books.count()).isEqualTo(7);
        assertThat(genres.tree()).extracting(GenreTreeResponse::name).contains("Romance", "Sátira");
    }

    @Test
    void shouldLeaveACollectionThatAlreadyHasDataAlone() {
        sample().run(new DefaultApplicationArguments());

        sample().run(new DefaultApplicationArguments());

        assertThat(books.count()).isEqualTo(7);
    }

    @Test
    void shouldNotTouchACollectionThatOnlyHasACatalog() {
        genres.create(new GenreRequest("Poesia", null));

        sample().run(new DefaultApplicationArguments());

        assertThat(books.count()).isZero();
    }

    @Test
    void shouldNotExistOutsideTheDevAndE2eProfiles() {
        assertThat(context.getBeanNamesForType(SampleCatalog.class)).isEmpty();
    }

    private SampleCatalog sample() {
        return new SampleCatalog(books, bookService, authors, publishers, series, genres);
    }
}
