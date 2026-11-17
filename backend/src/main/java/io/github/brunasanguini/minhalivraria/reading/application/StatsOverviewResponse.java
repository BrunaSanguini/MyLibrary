package io.github.brunasanguini.minhalivraria.reading.application;

import java.math.BigDecimal;
import org.jspecify.annotations.Nullable;

/**
 * The numbers of the profile for one month and its year.
 *
 * @param finishedInMonth readings finished in the month, rereads included
 * @param finishedInYear readings finished in the year, rereads included
 * @param averageRating mean of every rating given, with one decimal; absent without ratings
 * @param rereadsInYear readings marked as reread and finished in the year
 * @param pagesInYear pages read in the year, counted as the goals count them
 * @param currentStreak days in a row with a session up to today; a streak that reached yesterday still counts, since
 *     today is not over
 * @param longestStreak most days in a row with a session, ever
 * @param finishedLast30Days readings finished in the last 30 days, today included
 * @param inProgress readings in progress now
 * @param fastestInYear the reading of the year finished in the fewest days, among those with a start date
 */
public record StatsOverviewResponse(
        int year,
        int month,
        int finishedInMonth,
        int finishedInYear,
        @Nullable BigDecimal averageRating,
        int rereadsInYear,
        int pagesInYear,
        int currentStreak,
        int longestStreak,
        int finishedLast30Days,
        int inProgress,
        @Nullable FastestReadingResponse fastestInYear) {}
