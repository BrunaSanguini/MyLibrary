package io.github.brunasanguini.minhalivraria.books.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import io.github.brunasanguini.minhalivraria.books.application.GenreRequest;
import io.github.brunasanguini.minhalivraria.books.application.GenreResponse;
import io.github.brunasanguini.minhalivraria.books.application.GenreService;
import io.github.brunasanguini.minhalivraria.books.application.GenreTreeResponse;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebSliceTest(controllers = GenreController.class)
class GenreControllerTest {

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private GenreService service;

    @Test
    void shouldReturnTheGenreTree() {
        given(service.tree())
                .willReturn(List.of(new GenreTreeResponse(
                        1, "Fantasia", List.of(new GenreTreeResponse.Subgenre(4, "Alta fantasia")))));

        assertThat(mvc.get().uri("/api/v1/genres")).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                        [{ "id": 1, "name": "Fantasia", "subgenres": [{ "id": 4, "name": "Alta fantasia" }] }]
                        """);
    }

    @Test
    void shouldCreateASubgenre() {
        given(service.create(new GenreRequest("Alta fantasia", 1L)))
                .willReturn(new GenreResponse(4, "Alta fantasia", 1L));

        assertThat(post("/api/v1/genres", """
                        { "name": "Alta fantasia", "parentId": 1 }
                        """))
                .hasStatus(HttpStatus.CREATED)
                .hasHeader(HttpHeaders.LOCATION, "/api/v1/genres/4")
                .bodyJson()
                .extractingPath("$.parentId")
                .isEqualTo(1);
    }

    @Test
    void shouldAnswerAParentThatIsASubgenreWith422() {
        given(service.create(new GenreRequest("Fantasia épica", 4L)))
                .willThrow(new BusinessRuleException("genre.invalid-parent"));

        assertThat(post("/api/v1/genres", """
                        { "name": "Fantasia épica", "parentId": 4 }
                        """))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("genre.invalid-parent");
    }

    @Test
    void shouldAnswerADuplicatedNameWith409() {
        given(service.create(new GenreRequest("fantasia", null)))
                .willThrow(new ConflictException("genre.name-duplicated"));

        assertThat(post("/api/v1/genres", """
                        { "name": "fantasia", "parentId": null }
                        """))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("genre.name-duplicated");
    }

    @Test
    void shouldAnswerTheDeletionOfAGenreWithSubgenresWith409() {
        willThrow(new ConflictException("genre.has-subgenres")).given(service).delete(1);

        assertThat(mvc.delete().uri("/api/v1/genres/1").header("X-Requested-By", "minha-livraria"))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("genre.has-subgenres");
    }

    private org.springframework.test.web.servlet.assertj.MvcTestResult post(String uri, String body) {
        return mvc.post()
                .uri(uri)
                .header("X-Requested-By", "minha-livraria")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
    }
}
