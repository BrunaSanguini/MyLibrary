package io.github.brunasanguini.minhalivraria.goals.application;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/** The only thing that changes in a goal. */
public record GoalTargetRequest(@NotNull @Positive @Max(1_000_000) Integer target) {}
