package io.github.brunasanguini.minhalivraria.reading.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import io.github.brunasanguini.minhalivraria.reading.application.ReviewRequest;
import io.github.brunasanguini.minhalivraria.reading.application.ReviewResponse;
import io.github.brunasanguini.minhalivraria.reading.application.ReviewService;
import io.github.brunasanguini.minhalivraria.reading.application.ReviewSummaryResponse;
import io.github.brunasanguini.minhalivraria.reading.application.SavedReview;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@WebSliceTest(controllers = ReviewController.class)
class ReviewControllerTest {

    private static final Instant NOV_8 = Instant.parse("2026-11-08T21:15:00Z");

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private ReviewService service;

    @Test
    void shouldAnswerTheReviewOfABook() {
        given(service.get(42)).willReturn(review());

        assertThat(mvc.get().uri("/api/v1/books/42/review"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {
                          "bookId": 42,
                          "rating": 4.5,
                          "content": "Um clássico.",
                          "updatedAt": "2026-11-08T21:15:00Z"
                        }
                        """);
    }

    @Test
    void shouldAnswer404WithItsOwnCodeForABookWithoutReview() {
        given(service.get(42)).willThrow(new NotFoundException("review.not-found"));

        assertThat(mvc.get().uri("/api/v1/books/42/review"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("review.not-found");
    }

    @Test
    void shouldAnswer201WhenTheReviewIsCreated() {
        given(service.save(42, new ReviewRequest(new BigDecimal("4.5"), "Um clássico.")))
                .willReturn(new SavedReview(review(), true));

        assertThat(put("""
                        { "rating": 4.5, "content": "Um clássico." }
                        """))
                .hasStatus(HttpStatus.CREATED)
                .bodyJson()
                .extractingPath("$.rating")
                .isEqualTo(4.5);
    }

    @Test
    void shouldAnswer200WhenTheReviewIsRewritten() {
        given(service.save(anyLong(), any())).willReturn(new SavedReview(review(), false));

        assertThat(put("""
                        { "rating": 4.5, "content": "Um clássico." }
                        """))
                .hasStatusOk();
    }

    @ParameterizedTest
    @ValueSource(strings = {"3.3", "0.5", "5.5", "4.25"})
    void shouldRefuseARatingOutsideTheHalfPointsFromOneToFive(String rating) {
        assertThat(put("{ \"rating\": " + rating + " }"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors[0].field")
                .isEqualTo("rating");
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldExplainTheHalfPointsInPortuguese() {
        assertThat(put("""
                        { "rating": 3.3 }
                        """))
                .bodyJson()
                .extractingPath("$.errors[0].message")
                .isEqualTo("Use notas de meio em meio ponto, como 3,5 ou 4.");
    }

    @ParameterizedTest
    @ValueSource(strings = {"1", "1.5", "3.0", "5"})
    void shouldAcceptEveryHalfPointFromOneToFive(String rating) {
        given(service.save(anyLong(), any())).willReturn(new SavedReview(review(), false));

        assertThat(put("{ \"rating\": " + rating + " }")).hasStatusOk();
    }

    @Test
    void shouldAnswer422ForAReviewWithoutRatingAndWithoutText() {
        given(service.save(anyLong(), any())).willThrow(new BusinessRuleException("review.empty"));

        assertThat(put("{}"))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        { "code": "review.empty", "detail": "Dê uma nota, escreva um texto ou os dois." }
                        """);
    }

    @Test
    void shouldDeleteTheReviewWith204() {
        assertThat(mvc.delete().uri("/api/v1/books/42/review").header("X-Requested-By", "minha-livraria"))
                .hasStatus(HttpStatus.NO_CONTENT);
        then(service).should().delete(42);
    }

    @Test
    void shouldListTheLatestReviewsFirstByDefault() {
        given(service.latest(any()))
                .willReturn(new PageImpl<>(
                        List.of(new ReviewSummaryResponse(
                                42,
                                "A Sociedade do Anel",
                                "/api/v1/images/17",
                                new BigDecimal("4.5"),
                                "Um clássico.",
                                NOV_8)),
                        PageRequest.of(0, 24),
                        1));

        assertThat(mvc.get().uri("/api/v1/reviews"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        {
                          "page": 0,
                          "totalElements": 1,
                          "content": [
                            {
                              "bookId": 42,
                              "title": "A Sociedade do Anel",
                              "coverUrl": "/api/v1/images/17",
                              "rating": 4.5,
                              "excerpt": "Um clássico.",
                              "updatedAt": "2026-11-08T21:15:00Z"
                            }
                          ]
                        }
                        """);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        then(service).should().latest(pageable.capture());
        assertThat(pageable.getValue().getSort()).isEqualTo(Sort.by(Sort.Direction.DESC, "updatedAt"));
    }

    @Test
    void shouldRefuseASortFieldOutsideTheList() {
        assertThat(mvc.get().uri("/api/v1/reviews?sort=content,asc"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("request.invalid-sort");
    }

    private MvcTestResult put(String body) {
        return mvc.put()
                .uri("/api/v1/books/42/review")
                .header("X-Requested-By", "minha-livraria")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
    }

    private static ReviewResponse review() {
        return new ReviewResponse(42, new BigDecimal("4.5"), "Um clássico.", NOV_8);
    }
}
