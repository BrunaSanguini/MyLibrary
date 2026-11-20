package io.github.brunasanguini.minhalivraria.lists.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import io.github.brunasanguini.minhalivraria.lists.application.BookListRequest;
import io.github.brunasanguini.minhalivraria.lists.application.BookListResponse;
import io.github.brunasanguini.minhalivraria.lists.application.BookListService;
import io.github.brunasanguini.minhalivraria.lists.application.ListFilter;
import io.github.brunasanguini.minhalivraria.lists.application.ListStatus;
import io.github.brunasanguini.minhalivraria.lists.domain.ListColor;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@WebSliceTest(controllers = BookListController.class)
class BookListControllerTest {

    private static final String REQUESTED_BY = "X-Requested-By";
    private static final String MINHA_LIVRARIA = "minha-livraria";
    private static final BookListResponse VACATION = new BookListResponse(
            7,
            "Para as férias",
            "Leituras leves",
            ListColor.PLUM,
            false,
            3,
            1,
            1,
            ListStatus.IN_PROGRESS,
            List.of("/api/v1/images/a.webp"),
            Instant.parse("2026-11-01T12:00:00Z"));

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private BookListService service;

    @Test
    void shouldListTheCardsSortedByNameByDefault() {
        given(service.search(any(), any())).willReturn(new PageImpl<>(List.of(VACATION), PageRequest.of(0, 20), 1));

        assertThat(mvc.get().uri("/api/v1/lists")).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                        {
                          "content": [
                            {
                              "id": 7,
                              "name": "Para as férias",
                              "description": "Leituras leves",
                              "color": "PLUM",
                              "pinned": false,
                              "bookCount": 3,
                              "readCount": 1,
                              "wishlistCount": 1,
                              "status": "IN_PROGRESS",
                              "coverUrls": ["/api/v1/images/a.webp"],
                              "updatedAt": "2026-11-01T12:00:00Z"
                            }
                          ],
                          "totalElements": 1
                        }
                        """);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        then(service).should().search(eq(ListFilter.none()), pageable.capture());
        assertThat(pageable.getValue().getSort()).isEqualTo(Sort.by("normalizedName"));
    }

    @Test
    void shouldSortByTheLastChange() {
        given(service.search(any(), any())).willReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        assertThat(mvc.get().uri("/api/v1/lists?sort=updatedAt,desc")).hasStatusOk();

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        then(service).should().search(any(), pageable.capture());
        assertThat(pageable.getValue().getSort()).isEqualTo(Sort.by(Sort.Direction.DESC, "updatedAt"));
    }

    @Test
    void shouldPassTheFiltersOfTheListing() {
        given(service.search(any(), any())).willReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        assertThat(mvc.get().uri("/api/v1/lists?q=ferias&status=COMPLETED&pinned=false"))
                .hasStatusOk();

        then(service).should().search(eq(new ListFilter("ferias", ListStatus.COMPLETED, false)), any());
    }

    @Test
    void shouldRefuseAStatusThatDoesNotExist() {
        assertThat(mvc.get().uri("/api/v1/lists?status=PAUSED")).hasStatus(HttpStatus.BAD_REQUEST);
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldRefuseASearchTermThatIsTooLong() {
        assertThat(mvc.get().uri("/api/v1/lists?q=" + "a".repeat(201))).hasStatus(HttpStatus.BAD_REQUEST);
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldRefuseASortFieldOutsideTheList() {
        assertThat(mvc.get().uri("/api/v1/lists?sort=description,asc"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("request.invalid-sort");
    }

    @Test
    void shouldAnswer404ForAnUnknownList() {
        given(service.get(99)).willThrow(new NotFoundException("list.not-found"));

        assertThat(mvc.get().uri("/api/v1/lists/99"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .isLenientlyEqualTo("""
                        { "code": "list.not-found", "title": "Lista não encontrada" }
                        """);
    }

    @Test
    void shouldAnswerANewListWith201AndItsLocation() {
        given(service.create(new BookListRequest("Para as férias", "Leituras leves", null)))
                .willReturn(VACATION);

        assertThat(post("/api/v1/lists", """
                        { "name": "Para as férias", "description": "Leituras leves" }
                        """))
                .hasStatus(HttpStatus.CREATED)
                .hasHeader(HttpHeaders.LOCATION, "/api/v1/lists/7")
                .bodyJson()
                .extractingPath("$.id")
                .isEqualTo(7);
    }

    @Test
    void shouldCreateAListWithTheChosenColor() {
        given(service.create(new BookListRequest("Para as férias", null, ListColor.RUST)))
                .willReturn(VACATION);

        assertThat(post("/api/v1/lists", """
                        { "name": "Para as férias", "color": "RUST" }
                        """)).hasStatus(HttpStatus.CREATED);
    }

    @Test
    void shouldRefuseAColorOutsideThePalette() {
        assertThat(post("/api/v1/lists", """
                        { "name": "Para as férias", "color": "NEON" }
                        """)).hasStatus(HttpStatus.BAD_REQUEST);
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldRequireTheNameOfAList() {
        assertThat(post("/api/v1/lists", """
                        { "name": "  " }
                        """))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors[0].field")
                .isEqualTo("name");
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldAnswer409ForANameAlreadyInUse() {
        given(service.update(anyLong(), any())).willThrow(new ConflictException("list.name-duplicated"));

        assertThat(put("/api/v1/lists/7", """
                        { "name": "Clássicos" }
                        """))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        { "code": "list.name-duplicated", "title": "Lista já existe" }
                        """);
    }

    @Test
    void shouldUpdateAList() {
        given(service.update(7, new BookListRequest("Para as férias", null, null)))
                .willReturn(VACATION);

        assertThat(put("/api/v1/lists/7", """
                        { "name": "Para as férias" }
                        """))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.name")
                .isEqualTo("Para as férias");
    }

    @Test
    void shouldDeleteAListWith204() {
        assertThat(mvc.delete().uri("/api/v1/lists/7").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NO_CONTENT);

        then(service).should().delete(7);
    }

    @Test
    void shouldPinAndUnpinAListWith204() {
        assertThat(mvc.put().uri("/api/v1/lists/7/pin").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NO_CONTENT);
        assertThat(mvc.delete().uri("/api/v1/lists/7/pin").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NO_CONTENT);

        then(service).should().pin(7);
        then(service).should().unpin(7);
    }

    @Test
    void shouldAnswer404WhenPinningAnUnknownList() {
        willThrow(new NotFoundException("list.not-found")).given(service).pin(99);

        assertThat(mvc.put().uri("/api/v1/lists/99/pin").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("list.not-found");
    }

    @Test
    void shouldAddAndRemoveABookWith204() {
        assertThat(mvc.put().uri("/api/v1/lists/7/books/42").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NO_CONTENT);
        assertThat(mvc.delete().uri("/api/v1/lists/7/books/42").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NO_CONTENT);

        then(service).should().addBook(7, 42);
        then(service).should().removeBook(7, 42);
    }

    @Test
    void shouldAnswer404WhenAddingAnUnknownBook() {
        willThrow(new NotFoundException("book.not-found")).given(service).addBook(7, 99);

        assertThat(mvc.put().uri("/api/v1/lists/7/books/99").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("book.not-found");
    }

    @Test
    void shouldReorderWith204() {
        assertThat(put("/api/v1/lists/7/order", """
                        { "bookIds": [3, 1, 2] }
                        """)).hasStatus(HttpStatus.NO_CONTENT);

        then(service).should().reorder(7, List.of(3L, 1L, 2L));
    }

    @Test
    void shouldAnswer422ForAnOrderThatIsNotTheBooksOfTheList() {
        willThrow(new BusinessRuleException("list.invalid-order"))
                .given(service)
                .reorder(anyLong(), any());

        assertThat(put("/api/v1/lists/7/order", """
                        { "bookIds": [3] }
                        """))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        { "code": "list.invalid-order", "title": "Ordem inválida" }
                        """);
    }

    @Test
    void shouldRequireTheBooksOfTheNewOrder() {
        assertThat(put("/api/v1/lists/7/order", "{}")).hasStatus(HttpStatus.BAD_REQUEST);
        then(service).shouldHaveNoInteractions();
    }

    private MvcTestResult post(String uri, String body) {
        return mvc.post()
                .uri(uri)
                .header(REQUESTED_BY, MINHA_LIVRARIA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
    }

    private MvcTestResult put(String uri, String body) {
        return mvc.put()
                .uri(uri)
                .header(REQUESTED_BY, MINHA_LIVRARIA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
    }
}
