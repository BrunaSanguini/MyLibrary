package com.brunasanguini.mylibrary.dto.response;

import java.util.List;
import java.util.UUID;

public record BookResponse(
        UUID id,
        String title,
        String isbn,
        Integer pages,
        String coverUrl,
        String status,
        String publisherName,
        String languageName,
        String seriesName,
        Integer volumeNumber,
        Integer rereadCount,
        List<AuthorResponse> authors,
        List<GenreResponse> genres,
        List<SubgenreResponse> subgenres,
        List<TagResponse> tags
) {}