package com.brunasanguini.mylibrary.dto;

import java.util.List;

public record IsbnResponse(
        String title,
        List<String> authors,
        String coverUrl,
        Integer pageCount,
        Integer publicationYear,
        String isbn
) {}