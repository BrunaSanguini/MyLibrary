package io.github.brunasanguini.minhalivraria.books.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.web.PageResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class AuthorServiceTest {

    private static final PageRequest BY_NAME = PageRequest.of(0, 24, Sort.by("normalizedName"));

    @Autowired
    private AuthorService service;

    @Test
    void shouldAcceptTwoAuthorsWithTheSameName() {
        service.create(new AuthorRequest("Ana Silva"));
        service.create(new AuthorRequest("ana silva"));

        assertThat(service.search("ana silva", BY_NAME).totalElements()).isEqualTo(2);
    }

    @Test
    void shouldFindAuthorsIgnoringCaseAndAccents() {
        service.create(new AuthorRequest("Machado de Assis"));
        service.create(new AuthorRequest("Clarice Lispector"));
        service.create(new AuthorRequest("José Saramago"));

        PageResponse<AuthorResponse> found = service.search("JOSE", BY_NAME);

        assertThat(found.content()).extracting(AuthorResponse::name).containsExactly("José Saramago");
    }

    @Test
    void shouldListEveryAuthorInNameOrderWithoutATerm() {
        service.create(new AuthorRequest("Machado de Assis"));
        service.create(new AuthorRequest("Clarice Lispector"));

        PageResponse<AuthorResponse> all = service.search("  ", BY_NAME);

        assertThat(all.content()).extracting(AuthorResponse::name).containsExactly("Clarice Lispector", "Machado de Assis");
    }

    @Test
    void shouldRenameAndDeleteAnAuthor() {
        long id = service.create(new AuthorRequest("Tolkien")).id();

        assertThat(service.update(id, new AuthorRequest("J. R. R. Tolkien")).name()).isEqualTo("J. R. R. Tolkien");
        assertThat(service.get(id).name()).isEqualTo("J. R. R. Tolkien");

        service.delete(id);

        assertThatThrownBy(() -> service.get(id))
                .isInstanceOf(NotFoundException.class)
                .extracting("code")
                .isEqualTo("author.not-found");
    }
}
