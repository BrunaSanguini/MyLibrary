package io.github.brunasanguini.minhalivraria.books.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import io.github.brunasanguini.minhalivraria.books.application.FeaturedBookResponse;
import io.github.brunasanguini.minhalivraria.books.application.FeaturedBookService;
import io.github.brunasanguini.minhalivraria.books.application.FeaturedBooksRequest;
import io.github.brunasanguini.minhalivraria.books.application.FeaturedSlotRequest;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebSliceTest(controllers = FeaturedBookController.class)
class FeaturedBookControllerTest {

    private static final String REQUESTED_BY = "X-Requested-By";
    private static final String MINHA_LIVRARIA = "minha-livraria";
    private static final FeaturedBookResponse HOBBIT = new FeaturedBookResponse(
            1, 7, "O Hobbit", List.of("J. R. R. Tolkien"), "/api/v1/images/3", "/api/v1/images/9");

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private FeaturedBookService service;

    @Test
    void shouldListTheFeaturedBooks() {
        given(service.list()).willReturn(List.of(HOBBIT));

        assertThat(mvc.get().uri("/api/v1/featured"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        [
                          {
                            "slot": 1,
                            "bookId": 7,
                            "title": "O Hobbit",
                            "authors": ["J. R. R. Tolkien"],
                            "coverUrl": "/api/v1/images/3",
                            "imageUrl": "/api/v1/images/9"
                          }
                        ]
                        """);
    }

    @Test
    void shouldReplaceTheFeaturedBooks() {
        FeaturedBooksRequest request = new FeaturedBooksRequest(List.of(new FeaturedSlotRequest(7L, 2)));
        given(service.replace(request)).willReturn(List.of(HOBBIT));

        assertThat(mvc.put()
                        .uri("/api/v1/featured")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "slots": [ { "bookId": 7, "imageFrom": 2 } ] }
                                """))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$[0].bookId")
                .isEqualTo(7);
    }

    @Test
    void shouldRefuseMoreThanThreeOrNoFeaturedBook() {
        assertThat(mvc.put()
                        .uri("/api/v1/featured")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "slots": [] }
                                """))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldAnswer422ForABookThatIsNotOwned() {
        given(service.replace(any())).willThrow(new BusinessRuleException("featured.book-not-owned"));

        assertThat(mvc.put()
                        .uri("/api/v1/featured")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "slots": [ { "bookId": 8 } ] }
                                """))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        { "code": "featured.book-not-owned", "title": "Livro fora da estante" }
                        """);
    }

    @Test
    void shouldSendTheImageOfASlot() {
        given(service.replaceImage(eq(1), any())).willReturn(HOBBIT);

        assertThat(mvc.put()
                        .uri("/api/v1/featured/1/image")
                        .multipart()
                        .file(new MockMultipartFile("file", "vitrine.png", "image/png", new byte[] {1, 2, 3}))
                        .header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.imageUrl")
                .isEqualTo("/api/v1/images/9");
        then(service).should().replaceImage(eq(1), any());
    }
}
