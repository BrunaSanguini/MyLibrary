package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.response.FavoriteBookResponse;
import com.brunasanguini.mylibrary.dto.response.StatsResponse;
import com.brunasanguini.mylibrary.entity.Book;
import com.brunasanguini.mylibrary.entity.Genre;
import com.brunasanguini.mylibrary.entity.ReadingSession;
import com.brunasanguini.mylibrary.entity.ReadingStatus;
import com.brunasanguini.mylibrary.repository.BookRepository;
import com.brunasanguini.mylibrary.repository.RatingRepository;
import com.brunasanguini.mylibrary.repository.ReadingSessionRepository;
import com.brunasanguini.mylibrary.repository.UserSettingsRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StatsService {

    private final BookRepository bookRepository;
    private final ReadingSessionRepository readingSessionRepository;
    private final RatingRepository ratingRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final RatingService ratingService;

    public StatsService(BookRepository bookRepository,
                        ReadingSessionRepository readingSessionRepository,
                        RatingRepository ratingRepository,
                        UserSettingsRepository userSettingsRepository,
                        RatingService ratingService) {
        this.bookRepository = bookRepository;
        this.readingSessionRepository = readingSessionRepository;
        this.ratingRepository = ratingRepository;
        this.userSettingsRepository = userSettingsRepository;
        this.ratingService = ratingService;
    }

    public StatsResponse getStats(UUID userId) {
        int currentYear = LocalDate.now().getYear();

        // RN-100: total lido e em leitura
        Long totalRead = bookRepository.countByReadingStatus(ReadingStatus.READ);
        Long currentlyReading = bookRepository.countByReadingStatus(ReadingStatus.READING);

        // RN-100: nota média geral — média das médias de cada livro
        List<Book> allBooks = bookRepository.findAll();
        OptionalDouble avgScore = allBooks.stream()
                .mapToDouble(b -> {
                    Double score = ratingService.getFinalScore(b.getId());
                    return score != null ? score : Double.NaN;
                })
                .filter(d -> !Double.isNaN(d))
                .average();
        Double averageScore = avgScore.isPresent() ?
                Math.round(avgScore.getAsDouble() * 10.0) / 10.0 : null;

        // RN-103: meta anual
        Integer annualGoal = userSettingsRepository.findByUserId(userId)
                .map(s -> s.getAnnualGoal())
                .orElse(null);

        // RN-101: livros lidos por mês no ano corrente
        List<ReadingSession> sessionsThisYear =
                readingSessionRepository.findCompletedByYear(currentYear);

        Map<Integer, Long> booksPerMonth = new LinkedHashMap<>();
        for (int m = 1; m <= 12; m++) booksPerMonth.put(m, 0L);
        sessionsThisYear.forEach(rs -> {
            int month = rs.getEndDate().getMonthValue();
            booksPerMonth.merge(month, 1L, Long::sum);
        });

        // Livros lidos no ano (para progresso da meta)
        Long booksReadThisYear = sessionsThisYear.stream()
                .map(rs -> rs.getBook().getId())
                .distinct()
                .count();

        Double annualGoalProgress = (annualGoal != null && annualGoal > 0) ?
                Math.min(100.0, (booksReadThisYear * 100.0) / annualGoal) : null;

        // RN-102: distribuição por gênero — livros com status READ
        List<Book> readBooks = bookRepository.findByReadingStatus(ReadingStatus.READ);
        Map<String, Long> booksByGenre = readBooks.stream()
                .flatMap(b -> b.getGenres().stream())
                .collect(Collectors.groupingBy(Genre::getName, Collectors.counting()));

        // RN-104: tempo médio de leitura
        List<ReadingSession> completedSessions =
                readingSessionRepository.findByIsCompletedTrue();
        OptionalDouble avgDays = completedSessions.stream()
                .filter(rs -> rs.getDaysToRead() != null)
                .mapToLong(ReadingSession::getDaysToRead)
                .average();
        Double averageDaysToRead = avgDays.isPresent() ?
                Math.round(avgDays.getAsDouble() * 10.0) / 10.0 : null;

        // RN-105: favorito por mês — livro com maior nota em cada mês do ano corrente
        Map<Integer, FavoriteBookResponse> favoriteByMonth = new LinkedHashMap<>();
        for (int m = 1; m <= 12; m++) {
            final int month = m;
            sessionsThisYear.stream()
                    .filter(rs -> rs.getEndDate().getMonthValue() == month)
                    .map(ReadingSession::getBook)
                    .distinct()
                    .max(Comparator.comparingDouble(b -> {
                        Double s = ratingService.getFinalScore(b.getId());
                        return s != null ? s : -1.0;
                    }))
                    .ifPresent(book -> {
                        Double score = ratingService.getFinalScore(book.getId());
                        favoriteByMonth.put(month, new FavoriteBookResponse(
                                book.getId(),
                                book.getTitle(),
                                book.getCoverUrl(),
                                score
                        ));
                    });
        }

        return new StatsResponse(
                totalRead,
                currentlyReading,
                averageScore,
                annualGoal,
                booksReadThisYear,
                annualGoalProgress,
                booksPerMonth,
                booksByGenre,
                averageDaysToRead,
                favoriteByMonth
        );
    }
}