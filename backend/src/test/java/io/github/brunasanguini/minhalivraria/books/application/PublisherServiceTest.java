package io.github.brunasanguini.minhalivraria.books.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.books.application.BookDetailResponse.BookPublisherResponse;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import jakarta.persistence.EntityManager;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PublisherServiceTest {

    @Autowired
    private PublisherService service;

    @Autowired
    private BookService books;

    @Autowired
    private AuthorService authors;

    @Autowired
    private EntityManager entityManager;

    @Test
    void shouldRefuseANameThatDiffersOnlyInCaseAndAccents() {
        service.create(new PublisherRequest("Companhia das Letras"));

        assertThatThrownBy(() -> service.create(new PublisherRequest("  COMPANHIA DAS LETRAS ")))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("publisher.name-duplicated");
    }

    @Test
    void shouldRefuseRenamingToTheNameOfAnotherPublisher() {
        service.create(new PublisherRequest("Rocco"));
        long id = service.create(new PublisherRequest("Intrínseca")).id();

        assertThatThrownBy(() -> service.update(id, new PublisherRequest("rocco")))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void shouldAcceptRenamingAPublisherToItsOwnName() {
        long id = service.create(new PublisherRequest("Intrinseca")).id();

        assertThat(service.update(id, new PublisherRequest("Intrínseca")).name())
                .isEqualTo("Intrínseca");
    }

    @Test
    void shouldSearchAndDeletePublishers() {
        long id = service.create(new PublisherRequest("Editora Aleph")).id();
        service.create(new PublisherRequest("Darkside"));

        assertThat(service.search("aleph", PageRequest.of(0, 24, Sort.by("normalizedName")))
                        .content())
                .extracting(PublisherResponse::name)
                .containsExactly("Editora Aleph");

        service.delete(id);

        assertThatThrownBy(() -> service.get(id)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void shouldKeepTheOtherPublishersOfABookInOrderWhenOneIsDeleted() {
        long author = authors.create(new AuthorRequest("Machado de Assis")).id();
        long garnier = service.create(new PublisherRequest("Garnier")).id();
        long laemmert = service.create(new PublisherRequest("Laemmert")).id();
        long globo = service.create(new PublisherRequest("Globo")).id();
        long book = books.create(new BookRequest(
                        "Dom Casmurro",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of(author),
                        List.of(garnier, laemmert, globo),
                        null,
                        null,
                        null,
                        null,
                        null))
                .id();

        service.delete(laemmert);
        entityManager.flush();
        entityManager.clear();

        assertThat(books.get(book).publishers())
                .extracting(BookPublisherResponse::name)
                .containsExactly("Garnier", "Globo");
    }
}
