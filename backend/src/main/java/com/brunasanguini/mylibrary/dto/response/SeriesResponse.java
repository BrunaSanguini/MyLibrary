package com.brunasanguini.mylibrary.dto.response;

import java.util.UUID;

public record SeriesResponse(
        UUID id,
        String name,
        Integer totalVolumes
) {}