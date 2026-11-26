package io.github.brunasanguini.minhalivraria.goals.application;

import io.github.brunasanguini.minhalivraria.goals.GoalType;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

/**
 * A goal with a deadline and its progress.
 *
 * @param genre only in a goal limited to the books of one genre and of its subgenres
 * @param current what was reached so far, which may pass the target
 * @param percent from 0 to 100, rounded down; a goal that was passed stays at 100
 */
public record DeadlineGoalResponse(
        long id,
        GoalType type,
        int target,
        LocalDate startDate,
        LocalDate endDate,
        @Nullable GoalGenre genre,
        int current,
        int percent) {}
