package io.github.brunasanguini.minhalivraria.goals.application;

import io.github.brunasanguini.minhalivraria.goals.GoalPeriod;
import io.github.brunasanguini.minhalivraria.goals.GoalType;
import org.jspecify.annotations.Nullable;

/**
 * A goal with its progress.
 *
 * @param month only in a monthly goal
 * @param current what was reached so far, which may pass the target
 * @param percent from 0 to 100, rounded down; a goal that was passed stays at 100
 * @param enabled whether the Home shows the goal
 */
public record GoalResponse(
        long id,
        GoalType type,
        GoalPeriod period,
        int year,
        @Nullable Integer month,
        int target,
        int current,
        int percent,
        boolean enabled) {}
