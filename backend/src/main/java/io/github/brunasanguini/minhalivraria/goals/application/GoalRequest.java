package io.github.brunasanguini.minhalivraria.goals.application;

import io.github.brunasanguini.minhalivraria.goals.GoalPeriod;
import io.github.brunasanguini.minhalivraria.goals.GoalType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.jspecify.annotations.Nullable;

/**
 * @param month 1 to 12 for a monthly goal; absent for a yearly one
 * @param target how many books, pages or rereads
 */
public record GoalRequest(
        @NotNull GoalType type,
        @NotNull GoalPeriod period,
        @NotNull @Min(1900) @Max(2999) Integer year,
        @Min(1) @Max(12) @Nullable Integer month,
        @NotNull @Positive @Max(1_000_000) Integer target) {}
