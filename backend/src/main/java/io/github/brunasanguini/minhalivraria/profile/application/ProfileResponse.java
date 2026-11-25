package io.github.brunasanguini.minhalivraria.profile.application;

import io.github.brunasanguini.minhalivraria.profile.ProfileTheme;
import org.jspecify.annotations.Nullable;

/** @param readerSince the year the reader gave, when she gave one */
public record ProfileResponse(
        @Nullable String displayName,
        @Nullable String avatarUrl,
        ProfileTheme theme,
        @Nullable Integer readerSince) {

    public ProfileResponse(@Nullable String displayName, @Nullable String avatarUrl, ProfileTheme theme) {
        this(displayName, avatarUrl, theme, null);
    }
}
