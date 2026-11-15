package io.github.brunasanguini.minhalivraria.reading.application;

import io.github.brunasanguini.minhalivraria.shared.validation.HalfPoint;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import org.jspecify.annotations.Nullable;

/**
 * @param rating from 1 to 5, in half points
 */
public record ReviewRequest(
        @DecimalMin("1.0") @DecimalMax("5.0") @HalfPoint @Nullable BigDecimal rating,
        @Size(max = 20000) @Nullable String content) {}
