package io.github.brunasanguini.minhalivraria.reading.application;

import io.github.brunasanguini.minhalivraria.books.BookCatalog;
import io.github.brunasanguini.minhalivraria.books.BookSummary;
import io.github.brunasanguini.minhalivraria.reading.domain.Review;
import io.github.brunasanguini.minhalivraria.reading.domain.ReviewRepository;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The rating and the review of each book. */
@Service
@Transactional(readOnly = true)
public class ReviewService {

    private static final int EXCERPT_LENGTH = 240;

    private final ReviewRepository reviews;
    private final BookCatalog books;

    ReviewService(ReviewRepository reviews, BookCatalog books) {
        this.reviews = reviews;
        this.books = books;
    }

    /**
     * @throws NotFoundException {@code book.not-found}, or {@code review.not-found} when the book has no review yet
     */
    public ReviewResponse get(long bookId) {
        books.require(bookId);
        return reviews.findByBookId(bookId)
                .map(ReviewService::toResponse)
                .orElseThrow(() -> new NotFoundException("review.not-found"));
    }

    /** Creates the review of the book or rewrites the one it has. */
    @Transactional
    public SavedReview save(long bookId, ReviewRequest request) {
        books.require(bookId);
        Optional<Review> existing = reviews.findByBookId(bookId);
        if (existing.isPresent()) {
            Review review = existing.get();
            review.rewrite(request.rating(), request.content());
            // The flush stamps updated_at before the answer is built.
            return new SavedReview(toResponse(reviews.saveAndFlush(review)), false);
        }
        Review created = reviews.saveAndFlush(new Review(bookId, request.rating(), request.content()));
        return new SavedReview(toResponse(created), true);
    }

    /** Deleting the review of a book that has none changes nothing. */
    @Transactional
    public void delete(long bookId) {
        books.require(bookId);
        reviews.findByBookId(bookId).ifPresent(reviews::delete);
    }

    public Page<ReviewSummaryResponse> latest(Pageable pageable) {
        Page<Review> page = reviews.findAll(pageable);
        Map<Long, BookSummary> ofPage =
                books.findAll(page.stream().map(Review::bookId).toList());
        return page.map(review -> toSummary(review, Objects.requireNonNull(ofPage.get(review.bookId()))));
    }

    private static ReviewSummaryResponse toSummary(Review review, BookSummary book) {
        return new ReviewSummaryResponse(
                review.bookId(),
                book.title(),
                book.coverUrl(),
                review.rating(),
                excerpt(review.content()),
                updatedAt(review));
    }

    private static ReviewResponse toResponse(Review review) {
        return new ReviewResponse(review.bookId(), review.rating(), review.content(), updatedAt(review));
    }

    private static Instant updatedAt(Review review) {
        return Objects.requireNonNull(review.updatedAt(), "Review not saved yet");
    }

    /** The beginning of the text, cut at the last whole word that fits. */
    static @Nullable String excerpt(@Nullable String content) {
        if (content == null || content.length() <= EXCERPT_LENGTH) {
            return content;
        }
        String cut = content.substring(0, EXCERPT_LENGTH);
        int lastSpace = cut.lastIndexOf(' ');
        return (lastSpace > 0 ? cut.substring(0, lastSpace) : cut).stripTrailing() + "…";
    }
}
