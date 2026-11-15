package io.github.brunasanguini.minhalivraria.books.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.books.application.BookDetailResponse;
import io.github.brunasanguini.minhalivraria.books.application.BookImportService;
import io.github.brunasanguini.minhalivraria.books.application.ImportCandidateResponse;
import io.github.brunasanguini.minhalivraria.books.application.ImportPreviewResponse;
import io.github.brunasanguini.minhalivraria.books.application.ImportRequest;
import io.github.brunasanguini.minhalivraria.books.domain.DuplicatedBookException;
import io.github.brunasanguini.minhalivraria.shared.error.GatewayTimeoutException;
import io.github.brunasanguini.minhalivraria.shared.error.ServiceUnavailableException;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebSliceTest(controllers = BookImportController.class)
class BookImportControllerTest {

    private static final String IMPORT = "/api/v1/books/import";
    private static final String REQUESTED_BY = "X-Requested-By";
    private static final String MINHA_LIVRARIA = "minha-livraria";

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private BookImportService service;

    @Test
    void shouldListTheCandidatesOfASearch() {
        given(service.search("sociedade do anel"))
                .willReturn(List.of(new ImportCandidateResponse(
                        "OL51694024M",
                        "OL27448W",
                        "A Sociedade do Anel",
                        List.of("J. R. R. Tolkien"),
                        (short) 2019,
                        "https://covers.openlibrary.org/b/id/12345678-M.jpg",
                        null)));

        assertThat(mvc.get().uri(IMPORT + "/search?q=sociedade do anel"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        [
                          {
                            "editionKey": "OL51694024M",
                            "workKey": "OL27448W",
                            "title": "A Sociedade do Anel",
                            "authors": ["J. R. R. Tolkien"],
                            "publishedYear": 2019,
                            "coverUrl": "https://covers.openlibrary.org/b/id/12345678-M.jpg",
                            "libraryBookId": null
                          }
                        ]
                        """);
    }

    @Test
    void shouldRefuseASearchWithoutText() {
        assertThat(mvc.get().uri(IMPORT + "/search?q= "))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("validation");
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldPreviewByIsbn() {
        given(service.previewByIsbn("9788595084742")).willReturn(preview());

        assertThat(mvc.get().uri(IMPORT + "/preview?isbn=9788595084742"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {
                          "editionKey": "OL29823759M",
                          "title": "O Hobbit",
                          "authors": ["J.R.R. Tolkien"],
                          "publisher": "Harper Collins",
                          "pageCount": 336,
                          "isbn13": "9788595084742",
                          "languageCode": "por",
                          "libraryBookId": 42
                        }
                        """);
    }

    @Test
    void shouldPreviewByEditionKey() {
        given(service.previewByEdition("OL29823759M")).willReturn(preview());

        assertThat(mvc.get().uri(IMPORT + "/preview?editionKey=OL29823759M"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.title")
                .isEqualTo("O Hobbit");
    }

    @Test
    void shouldRefuseAPreviewWithoutIsbnOrEdition() {
        assertThat(mvc.get().uri(IMPORT + "/preview"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("request.invalid");
    }

    @Test
    void shouldRefuseAPreviewWithBothIsbnAndEdition() {
        assertThat(mvc.get().uri(IMPORT + "/preview?isbn=9788595084742&editionKey=OL29823759M"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("request.invalid");
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldAnswerAnImportedBookWith201AndItsLocation() {
        given(service.importEdition(
                        new ImportRequest("OL29823759M", Ownership.OWNED, List.of(1L, 4L), 3L, new BigDecimal("1"))))
                .willReturn(book(42));

        assertThat(mvc.post()
                        .uri(IMPORT)
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "editionKey": "OL29823759M",
                                  "ownership": "OWNED",
                                  "genreIds": [1, 4],
                                  "seriesId": 3,
                                  "seriesPosition": 1
                                }
                                """))
                .hasStatus(HttpStatus.CREATED)
                .hasHeader(HttpHeaders.LOCATION, "/api/v1/books/42")
                .bodyJson()
                .extractingPath("$.id")
                .isEqualTo(42);
    }

    @Test
    void shouldRefuseAnImportWithoutAValidEditionKey() {
        assertThat(mvc.post()
                        .uri(IMPORT)
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "editionKey": "../works/OL27448W" }
                                """))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors[0].field")
                .isEqualTo("editionKey");
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldPointToTheBookWhenTheEditionWasAlreadyImported() {
        given(service.importEdition(any())).willThrow(new DuplicatedBookException("book.edition-duplicated", 42));

        assertThat(mvc.post()
                        .uri(IMPORT)
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "editionKey": "OL29823759M" }
                                """))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        { "code": "book.edition-duplicated", "bookId": 42 }
                        """);
    }

    @Test
    void shouldSayThatManualRegistrationStillWorksWhenThereIsNoConnection() {
        given(service.search("hobbit")).willThrow(new ServiceUnavailableException("openlibrary.unavailable"));

        assertThat(mvc.get().uri(IMPORT + "/search?q=hobbit"))
                .hasStatus(HttpStatus.SERVICE_UNAVAILABLE)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {
                          "code": "openlibrary.unavailable",
                          "title": "Open Library indisponível",
                          "detail": "Sem conexão com a Open Library. O cadastro manual continua disponível."
                        }
                        """);
    }

    @Test
    void shouldAnswer504WhenTheOpenLibraryTakesTooLong() {
        given(service.previewByEdition("OL29823759M")).willThrow(new GatewayTimeoutException("openlibrary.timeout"));

        assertThat(mvc.get().uri(IMPORT + "/preview?editionKey=OL29823759M"))
                .hasStatus(HttpStatus.GATEWAY_TIMEOUT)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("openlibrary.timeout");
    }

    private static ImportPreviewResponse preview() {
        return new ImportPreviewResponse(
                "OL29823759M",
                "OL27482W",
                "O Hobbit",
                null,
                List.of("J.R.R. Tolkien"),
                "Harper Collins",
                336,
                "9788595084742",
                "8595084742",
                (short) 2019,
                "por",
                "Bilbo Bolseiro era um dos mais respeitáveis hobbits.",
                "https://covers.openlibrary.org/b/id/14826646-M.jpg",
                42L);
    }

    private static BookDetailResponse book(long id) {
        return new BookDetailResponse(
                id,
                "O Hobbit",
                null,
                List.of(),
                null,
                null,
                List.of(),
                "9788595084742",
                null,
                336,
                (short) 2019,
                "por",
                null,
                Ownership.OWNED,
                false,
                "/api/v1/images/17",
                null,
                new BookDetailResponse.OpenLibraryResponse(
                        "OL27482W", "OL29823759M", "https://openlibrary.org/books/OL29823759M"),
                null,
                null);
    }
}
