package io.github.brunasanguini.minhalivraria.goals.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.goals.GoalPeriod;
import io.github.brunasanguini.minhalivraria.goals.GoalType;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class GoalTest {

    @Test
    void shouldCountTheWholeYearInAYearlyGoal() {
        Goal goal = new Goal(GoalType.BOOKS, GoalPeriod.YEAR, 2026, null, 24);

        assertThat(goal.firstDay()).isEqualTo(LocalDate.parse("2026-01-01"));
        assertThat(goal.lastDay()).isEqualTo(LocalDate.parse("2026-12-31"));
        assertThat(goal.month()).isNull();
        assertThat(goal.year()).isEqualTo(2026);
        assertThat(goal.target()).isEqualTo(24);
    }

    @Test
    void shouldCountTheWholeMonthInAMonthlyGoalEvenInALeapYear() {
        Goal goal = new Goal(GoalType.PAGES, GoalPeriod.MONTH, 2028, 2, 600);

        assertThat(goal.firstDay()).isEqualTo(LocalDate.parse("2028-02-01"));
        assertThat(goal.lastDay()).isEqualTo(LocalDate.parse("2028-02-29"));
        assertThat(goal.month()).isEqualTo(2);
    }

    @Test
    void shouldRefuseAMonthlyGoalWithoutMonth() {
        assertInvalidPeriod(GoalType.BOOKS, GoalPeriod.MONTH, null);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 13, -1})
    void shouldRefuseAMonthOutsideTheCalendar(int month) {
        assertInvalidPeriod(GoalType.BOOKS, GoalPeriod.MONTH, month);
    }

    @Test
    void shouldRefuseAYearlyGoalWithMonth() {
        assertInvalidPeriod(GoalType.PAGES, GoalPeriod.YEAR, 3);
    }

    @Test
    void shouldRefuseRereadsByMonth() {
        assertInvalidPeriod(GoalType.REREADS, GoalPeriod.MONTH, 3);
    }

    @Test
    void shouldAcceptRereadsByYear() {
        assertThat(new Goal(GoalType.REREADS, GoalPeriod.YEAR, 2026, null, 2).type())
                .isEqualTo(GoalType.REREADS);
    }

    @Test
    void shouldChangeOnlyTheTarget() {
        Goal goal = new Goal(GoalType.BOOKS, GoalPeriod.YEAR, 2026, null, 24);

        goal.changeTarget(30);

        assertThat(goal.target()).isEqualTo(30);
        assertThat(goal.period()).isEqualTo(GoalPeriod.YEAR);
    }

    private static void assertInvalidPeriod(GoalType type, GoalPeriod period, Integer month) {
        assertThatThrownBy(() -> new Goal(type, period, 2026, month, 10))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("goal.invalid-period");
    }
}
