package io.github.brunasanguini.minhalivraria.shelf.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.shared.error.BadRequestException;
import io.github.brunasanguini.minhalivraria.shelf.application.BookCardResponse;
import io.github.brunasanguini.minhalivraria.shelf.application.BookCardResponse.CardSeriesResponse;
import io.github.brunasanguini.minhalivraria.shelf.application.ShelfFilter;
import io.github.brunasanguini.minhalivraria.shelf.application.ShelfService;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebSliceTest(controllers = ShelfController.class)
class ShelfControllerTest {

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private ShelfService service;

    @Test
    void shouldAnswerThePageInTheApiFormat() {
        given(service.search(any(), any()))
                .willReturn(new PageImpl<>(List.of(card()), PageRequest.of(0, 24), 1));

        assertThat(mvc.get().uri("/api/v1/shelf/books"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo(
                        """
                        {
                          "page": 0,
                          "size": 24,
                          "totalElements": 1,
                          "totalPages": 1,
                          "content": [
                            {
                              "id": 42,
                              "title": "A Sociedade do Anel",
                              "authors": ["J. R. R. Tolkien"],
                              "coverUrl": "/api/v1/images/17",
                              "genres": ["Alta fantasia"],
                              "ownership": "OWNED",
                              "favorite": true,
                              "series": { "id": 3, "name": "O Senhor dos Anéis", "position": 1.0 }
                            }
                          ]
                        }
                        """);
    }

    @Test
    void shouldPassEveryFilterToTheService() {
        given(service.search(any(), any())).willReturn(emptyPage());

        assertThat(mvc.get()
                        .uri("/api/v1/shelf/books?q=aneis&ownership=OWNED&favorite=true"
                                + "&genreId=1&authorId=2&publisherId=3&seriesId=4"))
                .hasStatusOk();

        ArgumentCaptor<ShelfFilter> filter = ArgumentCaptor.forClass(ShelfFilter.class);
        then(service).should().search(filter.capture(), any());
        assertThat(filter.getValue())
                .isEqualTo(new ShelfFilter("aneis", Ownership.OWNED, true, 1L, 2L, 3L, 4L));
    }

    @Test
    void shouldLeaveEveryFilterNullWhenNoneIsGiven() {
        given(service.search(any(), any())).willReturn(emptyPage());

        assertThat(mvc.get().uri("/api/v1/shelf/books")).hasStatusOk();

        ArgumentCaptor<ShelfFilter> filter = ArgumentCaptor.forClass(ShelfFilter.class);
        then(service).should().search(filter.capture(), any());
        assertThat(filter.getValue())
                .isEqualTo(new ShelfFilter(null, null, null, null, null, null, null));
    }

    @Test
    void shouldReportASortOutsideTheListAsInvalidSort() {
        willThrow(new BadRequestException("request.invalid-sort"))
                .given(service)
                .search(any(), any());

        assertThat(mvc.get().uri("/api/v1/shelf/books?sort=synopsis,asc"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("request.invalid-sort");
    }

    @Test
    void shouldRefuseAnUnknownOwnership() {
        assertThat(mvc.get().uri("/api/v1/shelf/books?ownership=EMPRESTADO"))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldRefuseAPageSizeAboveTheLimit() {
        assertThat(mvc.get().uri("/api/v1/shelf/books?size=101"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("validation");
    }

    @Test
    void shouldRefuseATermLongerThanTheLimit() {
        assertThat(mvc.get().uri("/api/v1/shelf/books?q=" + "a".repeat(201)))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldNotRequireTheRequestedByHeaderToRead() {
        given(service.search(any(), any())).willReturn(emptyPage());

        assertThat(mvc.get().uri("/api/v1/shelf/books")).hasStatusOk();
    }

    private static PageImpl<BookCardResponse> emptyPage() {
        return new PageImpl<>(List.of(), PageRequest.of(0, 24), 0);
    }

    private static BookCardResponse card() {
        return new BookCardResponse(
                42,
                "A Sociedade do Anel",
                List.of("J. R. R. Tolkien"),
                "/api/v1/images/17",
                List.of("Alta fantasia"),
                Ownership.OWNED,
                true,
                new CardSeriesResponse(3, "O Senhor dos Anéis", new BigDecimal("1.0")));
    }
}
