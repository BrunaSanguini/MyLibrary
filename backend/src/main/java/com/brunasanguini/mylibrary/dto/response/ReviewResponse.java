package com.brunasanguini.mylibrary.dto.response;

import java.util.UUID;

public record ReviewResponse(
        UUID id,
        UUID bookId,
        String content,
        Boolean wouldReread,
        Boolean wouldRecommend,
        Boolean isFavorite
) {}