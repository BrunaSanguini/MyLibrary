package io.github.brunasanguini.minhalivraria.profile.application;

import io.github.brunasanguini.minhalivraria.profile.ProfileTheme;
import org.jspecify.annotations.Nullable;

public record ProfileResponse(@Nullable String displayName, @Nullable String avatarUrl, ProfileTheme theme) {}
