package io.github.brunasanguini.minhalivraria.goals.application;

import io.github.brunasanguini.minhalivraria.goals.GoalType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

/**
 * A goal with a deadline, to create it or to replace everything in it.
 *
 * @param target how many books, pages or rereads
 * @param startDate first day that counts
 * @param endDate last day that counts, never before the start
 * @param genreId only the books of this genre and of its subgenres count; absent counts every book
 */
public record DeadlineGoalRequest(
        @NotNull GoalType type,
        @NotNull @Positive @Max(1_000_000) Integer target,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @Nullable Long genreId) {}
