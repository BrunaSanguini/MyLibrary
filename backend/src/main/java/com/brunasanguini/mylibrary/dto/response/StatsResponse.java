package com.brunasanguini.mylibrary.dto.response;

import java.util.List;
import java.util.Map;

public record StatsResponse(
        // RN-100
        Long totalRead,
        Long currentlyReading,
        Double averageScore,

        // RN-100, RN-103
        Integer annualGoal,
        Long booksReadThisYear,
        Double annualGoalProgress,  // percentual 0-100

        // RN-101: livros lidos por mês {1: 2, 2: 0, ...}
        Map<Integer, Long> booksPerMonth,

        // RN-102: distribuição por gênero {"Romance": 5, "Ficção": 3}
        Map<String, Long> booksByGenre,

        // RN-104: tempo médio de leitura em dias
        Double averageDaysToRead,

        // RN-105: favorito por mês {1: FavoriteBook, 2: FavoriteBook, ...}
        Map<Integer, FavoriteBookResponse> favoriteByMonth
) {}