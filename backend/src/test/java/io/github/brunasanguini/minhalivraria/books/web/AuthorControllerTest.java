package io.github.brunasanguini.minhalivraria.books.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import io.github.brunasanguini.minhalivraria.books.application.AuthorRequest;
import io.github.brunasanguini.minhalivraria.books.application.AuthorResponse;
import io.github.brunasanguini.minhalivraria.books.application.AuthorService;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.web.PageResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebSliceTest(controllers = AuthorController.class)
class AuthorControllerTest {

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private AuthorService service;

    @Test
    void shouldReturnAPageOfAuthors() {
        given(service.search(eq("tolkien"), any()))
                .willReturn(new PageResponse<>(List.of(new AuthorResponse(7, "J. R. R. Tolkien")), 0, 24, 1, 1));

        assertThat(mvc.get().uri("/api/v1/authors?q=tolkien"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {
                          "content": [{ "id": 7, "name": "J. R. R. Tolkien" }],
                          "page": 0, "size": 24, "totalElements": 1, "totalPages": 1
                        }
                        """);
    }

    @Test
    void shouldPassThePageAndTheSortToTheService() {
        given(service.search(any(), any())).willReturn(new PageResponse<>(List.of(), 2, 10, 0, 0));

        assertThat(mvc.get().uri("/api/v1/authors?page=2&size=10&sort=name,desc")).hasStatusOk();

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        then(service).should().search(eq(null), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isEqualTo(2);
        assertThat(pageable.getValue().getPageSize()).isEqualTo(10);
        assertThat(pageable.getValue().getSort()).isEqualTo(Sort.by(Sort.Direction.DESC, "normalizedName"));
    }

    @Test
    void shouldRefuseAnUnknownSortField() {
        assertThat(mvc.get().uri("/api/v1/authors?sort=createdAt"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("request.invalid-sort");
    }

    @Test
    void shouldRefuseAPageSizeAboveTheLimit() {
        assertThat(mvc.get().uri("/api/v1/authors?size=101"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("validation");
    }

    @Test
    void shouldCreateAnAuthorAndPointToIt() {
        given(service.create(new AuthorRequest("Clarice Lispector")))
                .willReturn(new AuthorResponse(12, "Clarice Lispector"));

        assertThat(mvc.post()
                        .uri("/api/v1/authors")
                        .header("X-Requested-By", "minha-livraria")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "Clarice Lispector" }
                                """))
                .hasStatus(HttpStatus.CREATED)
                .hasHeader(HttpHeaders.LOCATION, "/api/v1/authors/12")
                .bodyJson()
                .extractingPath("$.id")
                .isEqualTo(12);
    }

    @Test
    void shouldRefuseABlankName() {
        assertThat(mvc.post()
                        .uri("/api/v1/authors")
                        .header("X-Requested-By", "minha-livraria")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "  " }
                                """))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors[0].field")
                .isEqualTo("name");
    }

    @Test
    void shouldUpdateAnAuthor() {
        given(service.update(7, new AuthorRequest("Tolkien"))).willReturn(new AuthorResponse(7, "Tolkien"));

        assertThat(mvc.put()
                        .uri("/api/v1/authors/7")
                        .header("X-Requested-By", "minha-livraria")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "name": "Tolkien" }
                                """))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.name")
                .isEqualTo("Tolkien");
    }

    @Test
    void shouldDeleteAnAuthor() {
        assertThat(mvc.delete().uri("/api/v1/authors/7").header("X-Requested-By", "minha-livraria"))
                .hasStatus(HttpStatus.NO_CONTENT);

        then(service).should().delete(7);
    }

    @Test
    void shouldAnswerAnUnknownAuthorWithNotFound() {
        willThrow(new NotFoundException("author.not-found")).given(service).get(99);

        assertThat(mvc.get().uri("/api/v1/authors/99"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("author.not-found");
    }
}
