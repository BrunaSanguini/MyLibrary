package io.github.brunasanguini.minhalivraria.reading.application;

import java.math.BigDecimal;
import java.time.Instant;
import org.jspecify.annotations.Nullable;

public record ReviewResponse(
        long bookId, @Nullable BigDecimal rating, @Nullable String content, Instant updatedAt) {}
