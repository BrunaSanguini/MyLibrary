package io.github.brunasanguini.minhalivraria.reading.application;

/**
 * Result of saving a review.
 *
 * @param created true when the book had no review before, which the API answers with 201 instead of 200
 */
public record SavedReview(ReviewResponse review, boolean created) {}
