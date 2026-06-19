package com.brunasanguini.mylibrary.dto.response;

import java.util.UUID;

public record SubgenreResponse(
        UUID id,
        String name,
        UUID genreId,
        String genreName
) {}