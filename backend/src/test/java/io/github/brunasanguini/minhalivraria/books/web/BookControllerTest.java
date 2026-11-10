package io.github.brunasanguini.minhalivraria.books.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import io.github.brunasanguini.minhalivraria.books.application.BannerResponse;
import io.github.brunasanguini.minhalivraria.books.application.BookDetailResponse;
import io.github.brunasanguini.minhalivraria.books.application.BookDetailResponse.BookAuthorResponse;
import io.github.brunasanguini.minhalivraria.books.application.BookRequest;
import io.github.brunasanguini.minhalivraria.books.application.BookService;
import io.github.brunasanguini.minhalivraria.books.application.CoverResponse;
import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebSliceTest(controllers = BookController.class)
class BookControllerTest {

    private static final String REQUESTED_BY = "X-Requested-By";
    private static final String MINHA_LIVRARIA = "minha-livraria";

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private BookService service;

    @Test
    void shouldAnswerACreatedBookWith201AndItsLocation() {
        given(service.create(any())).willReturn(book(42));

        assertThat(mvc.post()
                        .uri("/api/v1/books")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "A Sociedade do Anel",
                                  "isbn13": "9788595084742",
                                  "authorIds": [7]
                                }
                                """))
                .hasStatus(HttpStatus.CREATED)
                .hasHeader(HttpHeaders.LOCATION, "/api/v1/books/42")
                .bodyJson()
                .isLenientlyEqualTo("""
                        {
                          "id": 42,
                          "title": "A Sociedade do Anel",
                          "authors": [{ "id": 7, "name": "J. R. R. Tolkien" }],
                          "ownership": "OWNED",
                          "favorite": true,
                          "coverUrl": "/api/v1/images/17"
                        }
                        """);
    }

    @Test
    void shouldReturnTheBookPage() {
        given(service.get(42)).willReturn(book(42));

        assertThat(mvc.get().uri("/api/v1/books/42"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.title")
                .isEqualTo("A Sociedade do Anel");
    }

    @Test
    void shouldAnswerAnUnknownBookWith404() {
        willThrow(new NotFoundException("book.not-found")).given(service).get(404);

        assertThat(mvc.get().uri("/api/v1/books/404"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("book.not-found");
    }

    @Test
    void shouldRefuseABookWithoutATitle() {
        assertThat(mvc.post()
                        .uri("/api/v1/books")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "title": "   ", "authorIds": [7] }
                                """))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors[0].field")
                .isEqualTo("title");
    }

    @Test
    void shouldRefuseABookWithoutAnAuthor() {
        assertThat(mvc.post()
                        .uri("/api/v1/books")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "title": "Duna", "authorIds": [] }
                                """))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors[0].field")
                .isEqualTo("authorIds");
    }

    @Test
    void shouldRefuseAnIsbnWithTheWrongCheckDigit() {
        assertThat(mvc.post()
                        .uri("/api/v1/books")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "title": "Duna", "isbn13": "9788595084743", "authorIds": [7] }
                                """))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors[0].field")
                .isEqualTo("isbn13");
    }

    @Test
    void shouldPassTheWholeFormToTheService() {
        given(service.update(eq(42L), any())).willReturn(book(42));

        assertThat(mvc.put()
                        .uri("/api/v1/books/42")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "A Sociedade do Anel",
                                  "authorIds": [7],
                                  "publisherId": 2,
                                  "genreIds": [1, 4],
                                  "seriesId": 3,
                                  "seriesPosition": 1.5,
                                  "ownership": "WISHLIST",
                                  "favorite": true
                                }
                                """))
                .hasStatusOk();

        ArgumentCaptor<BookRequest> request = ArgumentCaptor.forClass(BookRequest.class);
        then(service).should().update(eq(42L), request.capture());
        assertThat(request.getValue().authorIds()).containsExactly(7L);
        assertThat(request.getValue().genreIds()).containsExactly(1L, 4L);
        assertThat(request.getValue().seriesPosition()).isEqualByComparingTo("1.5");
        assertThat(request.getValue().ownershipOrDefault()).isEqualTo(Ownership.WISHLIST);
    }

    @Test
    void shouldMarkAndUnmarkAFavorite() {
        assertThat(mvc.put().uri("/api/v1/books/42/favorite").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NO_CONTENT);
        assertThat(mvc.delete().uri("/api/v1/books/42/favorite").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NO_CONTENT);

        then(service).should().markFavorite(42, true);
        then(service).should().markFavorite(42, false);
    }

    @Test
    void shouldChangeTheOwnership() {
        assertThat(mvc.put()
                        .uri("/api/v1/books/42/ownership")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "ownership": "WISHLIST" }
                                """))
                .hasStatus(HttpStatus.NO_CONTENT);

        then(service).should().changeOwnership(42, Ownership.WISHLIST);
    }

    @Test
    void shouldRefuseAnUnknownOwnership() {
        assertThat(mvc.put()
                        .uri("/api/v1/books/42/ownership")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "ownership": "EMPRESTADO" }
                                """))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldDeleteTheBook() {
        assertThat(mvc.delete().uri("/api/v1/books/42").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NO_CONTENT);

        then(service).should().delete(42);
    }

    @Test
    void shouldSendTheCoverToTheService() {
        given(service.replaceCover(anyLong(), any())).willReturn(new CoverResponse("/api/v1/images/17"));

        assertThat(mvc.put()
                        .uri("/api/v1/books/42/cover")
                        .multipart()
                        .file(new MockMultipartFile("file", "capa.png", "image/png", new byte[] {1, 2, 3}))
                        .header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.coverUrl")
                .isEqualTo("/api/v1/images/17");
    }

    @Test
    void shouldSendTheBannerToTheService() {
        given(service.replaceBanner(anyLong(), any())).willReturn(new BannerResponse("/api/v1/images/18"));

        assertThat(mvc.put()
                        .uri("/api/v1/books/42/banner")
                        .multipart()
                        .file(new MockMultipartFile("file", "banner.png", "image/png", new byte[] {1, 2, 3}))
                        .header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.bannerUrl")
                .isEqualTo("/api/v1/images/18");
    }

    @Test
    void shouldRemoveTheCoverAndTheBanner() {
        assertThat(mvc.delete().uri("/api/v1/books/42/cover").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NO_CONTENT);
        assertThat(mvc.delete().uri("/api/v1/books/42/banner").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NO_CONTENT);

        then(service).should().removeCover(42);
        then(service).should().removeBanner(42);
    }

    private static BookDetailResponse book(long id) {
        return new BookDetailResponse(
                id,
                "A Sociedade do Anel",
                null,
                List.of(new BookAuthorResponse(7, "J. R. R. Tolkien")),
                null,
                null,
                List.of(),
                "9788595084742",
                null,
                576,
                (short) 2019,
                "por",
                null,
                Ownership.OWNED,
                true,
                "/api/v1/images/17",
                null,
                null,
                Instant.parse("2026-11-09T22:13:00Z"),
                Instant.parse("2026-11-09T22:13:00Z"));
    }
}
