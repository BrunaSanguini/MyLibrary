package io.github.brunasanguini.minhalivraria.profile.application;

import io.github.brunasanguini.minhalivraria.profile.ProfileTheme;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * @param displayName absent or blank: the app greets without a name
 * @param readerSince from 1900 up to this year; absent: the year of the first reading registered
 */
public record ProfileRequest(
        @Size(max = 80) @Nullable String displayName,
        @NotNull ProfileTheme theme,
        @Min(1900) @Nullable Integer readerSince) {

    public ProfileRequest(@Nullable String displayName, ProfileTheme theme) {
        this(displayName, theme, null);
    }
}
