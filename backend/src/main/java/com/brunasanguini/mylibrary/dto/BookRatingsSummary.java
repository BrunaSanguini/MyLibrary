package com.brunasanguini.mylibrary.dto;

import com.brunasanguini.mylibrary.dto.response.RatingResponse;

import java.util.List;

public record BookRatingsSummary(
        List<RatingResponse> ratings,
        Double finalScore,
        Double stars
) {}