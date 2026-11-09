package io.github.brunasanguini.minhalivraria.shared.error;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@WebSliceTest
@Import(ApiExceptionHandlerTest.FailingController.class)
class ApiExceptionHandlerTest {

    private static final String BASE = "/api/v1/test-errors";

    @Autowired
    private MockMvcTester mvc;

    @Test
    void shouldAnswerNotFoundExceptionsWith404() {
        assertThat(mvc.get().uri(BASE + "/not-found"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("book.not-found");
    }

    @Test
    void shouldLinkTheProblemTypeToTheErrorCatalog() {
        assertThat(mvc.get().uri(BASE + "/not-found"))
                .bodyJson()
                .extractingPath("$.type")
                .isEqualTo("https://github.com/BrunaSanguini/MyLibrary/blob/main/docs/erros.md#book-not-found");
    }

    @Test
    void shouldReportTheRequestedPathAsInstance() {
        assertThat(mvc.get().uri(BASE + "/not-found"))
                .bodyJson()
                .extractingPath("$.instance")
                .isEqualTo(BASE + "/not-found");
    }

    @Test
    void shouldAnswerConflictExceptionsWith409() {
        assertThat(mvc.get().uri(BASE + "/conflict"))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("book.isbn-duplicated");
    }

    @Test
    void shouldAnswerBusinessRuleExceptionsWith422() {
        assertThat(mvc.get().uri(BASE + "/business-rule"))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("reading.end-before-start");
    }

    @Test
    void shouldListInvalidFieldsWhenValidationFails() {
        assertThat(mvc.post()
                        .uri(BASE + "/validated")
                        .header("X-Requested-By", "minha-livraria")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "title": "" }
                                """))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .satisfies(json -> {
                    assertThat(json).extractingPath("$.code").isEqualTo("validation");
                    assertThat(json).extractingPath("$.errors[0].field").isEqualTo("title");
                });
    }

    @Test
    void shouldAnswerMalformedJsonWithRequestMalformed() {
        assertThat(mvc.post()
                        .uri(BASE + "/validated")
                        .header("X-Requested-By", "minha-livraria")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ not json"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("request.malformed");
    }

    @Test
    void shouldAnswerUnknownApiRoutesWithResourceNotFound() {
        assertThat(mvc.get().uri("/api/v1/nao-existe"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("resource.not-found");
    }

    @Test
    void shouldHideDetailsOfUnexpectedErrors() {
        assertThat(mvc.get().uri(BASE + "/unexpected"))
                .hasStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                .satisfies(result -> assertThat(result).bodyJson()
                        .extractingPath("$.code")
                        .isEqualTo("internal.error"))
                .bodyText()
                .doesNotContain("segredo interno");
    }

    @RestController
    @RequestMapping("/test-errors")
    static class FailingController {

        @GetMapping("/not-found")
        void notFound() {
            throw new NotFoundException("book.not-found", 42);
        }

        @GetMapping("/conflict")
        void conflict() {
            throw new ConflictException("book.isbn-duplicated", "9788595084742");
        }

        @GetMapping("/business-rule")
        void businessRule() {
            throw new BusinessRuleException("reading.end-before-start");
        }

        @GetMapping("/unexpected")
        void unexpected() {
            throw new IllegalStateException("segredo interno");
        }

        @PostMapping("/validated")
        void validated(@Valid @RequestBody Sample sample) {}

        record Sample(@NotBlank String title) {}
    }
}
