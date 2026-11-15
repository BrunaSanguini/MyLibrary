package io.github.brunasanguini.minhalivraria.reading.web;

import io.github.brunasanguini.minhalivraria.reading.application.ReviewRequest;
import io.github.brunasanguini.minhalivraria.reading.application.ReviewResponse;
import io.github.brunasanguini.minhalivraria.reading.application.ReviewService;
import io.github.brunasanguini.minhalivraria.reading.application.ReviewSummaryResponse;
import io.github.brunasanguini.minhalivraria.reading.application.SavedReview;
import io.github.brunasanguini.minhalivraria.shared.web.PageQuery;
import io.github.brunasanguini.minhalivraria.shared.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.function.Function;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "reviews", description = "Rating and review of each book")
@RestController
class ReviewController {

    private static final Map<String, String> SORT_FIELDS = Map.of("updatedAt", "updatedAt");
    private static final Sort LATEST_FIRST = Sort.by(Sort.Direction.DESC, "updatedAt");

    private final ReviewService service;

    ReviewController(ReviewService service) {
        this.service = service;
    }

    @Operation(
            operationId = "getBookReview",
            description = "A book without review: 404 review.not-found, which the front shows as \"no review yet\".")
    @GetMapping("/books/{bookId}/review")
    ReviewResponse get(@PathVariable long bookId) {
        return service.get(bookId);
    }

    @Operation(
            operationId = "saveBookReview",
            summary = "Creates or rewrites the review of a book",
            description = "201 when the book had no review, 200 when it had. Rating from 1 to 5 in half points (400"
                    + " validation). Without rating and without text: 422 review.empty.")
    @PutMapping("/books/{bookId}/review")
    ResponseEntity<ReviewResponse> save(@PathVariable long bookId, @Valid @RequestBody ReviewRequest request) {
        SavedReview saved = service.save(bookId, request);
        return ResponseEntity.status(saved.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(saved.review());
    }

    @Operation(operationId = "deleteBookReview")
    @DeleteMapping("/books/{bookId}/review")
    ResponseEntity<Void> delete(@PathVariable long bookId) {
        service.delete(bookId);
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "listReviews", summary = "Latest reviews. Sorting: updatedAt (default, desc)")
    @GetMapping("/reviews")
    PageResponse<ReviewSummaryResponse> latest(@Valid @ParameterObject PageQuery page) {
        return PageResponse.of(service.latest(page.toPageable(SORT_FIELDS, LATEST_FIRST)), Function.identity());
    }
}
