package com.brunasanguini.mylibrary.dto.response;

import java.util.UUID;

public record FavoriteBookResponse(
        UUID id,
        String title,
        String coverUrl,
        Double score
) {}