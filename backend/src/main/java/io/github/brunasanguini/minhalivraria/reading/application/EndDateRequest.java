package io.github.brunasanguini.minhalivraria.reading.application;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/** The day a reading was finished or abandoned. */
public record EndDateRequest(@NotNull LocalDate endDate) {}
