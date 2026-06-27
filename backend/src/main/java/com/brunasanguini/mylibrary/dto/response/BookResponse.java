package com.brunasanguini.mylibrary.dto.response;

import com.brunasanguini.mylibrary.entity.ReadingStatus;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

public record BookResponse(
        UUID id,
        String title,
        String isbn,
        Integer pageCount,
        String language,
        String synopsis,
        String coverUrl,
        Integer publicationYear,
        Set<AuthorResponse> authors,
        Set<GenreResponse> genres,
        String publisherName,
        String seriesName,
        Integer volumeNumber,
        Set<String> tags,
        ReadingStatus readingStatus,
        Integer rereadCount,
        Boolean wouldReread,
        Boolean wouldRecommend,
        Boolean isFavorite,
        String review,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}