package io.github.brunasanguini.minhalivraria.profile.application;

import io.github.brunasanguini.minhalivraria.profile.ProfileTheme;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/** @param displayName absent or blank: the app greets without a name */
public record ProfileRequest(
        @Size(max = 80) @Nullable String displayName,
        @NotNull ProfileTheme theme) {}
