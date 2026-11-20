package io.github.brunasanguini.minhalivraria.goals.application;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.jspecify.annotations.Nullable;

/**
 * What changes in a goal.
 *
 * @param enabled whether the Home shows the goal; absent keeps it as it is
 */
public record GoalTargetRequest(
        @NotNull @Positive @Max(1_000_000) Integer target, @Nullable Boolean enabled) {}
