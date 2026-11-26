package io.github.brunasanguini.minhalivraria.goals.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.goals.GoalType;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class DeadlineGoalTest {

    private static final LocalDate AUGUST_11 = LocalDate.parse("2026-08-11");
    private static final LocalDate FEBRUARY_11 = LocalDate.parse("2027-02-11");

    @Test
    void shouldKeepTheDatesTheReaderChose() {
        DeadlineGoal goal = new DeadlineGoal(GoalType.BOOKS, 2, AUGUST_11, FEBRUARY_11, 12L);

        assertThat(goal.startDate()).isEqualTo(AUGUST_11);
        assertThat(goal.endDate()).isEqualTo(FEBRUARY_11);
        assertThat(goal.genreId()).isEqualTo(12L);
        assertThat(goal.target()).isEqualTo(2);
    }

    @Test
    void shouldAcceptASingleDay() {
        DeadlineGoal goal = new DeadlineGoal(GoalType.PAGES, 50, AUGUST_11, AUGUST_11, null);

        assertThat(goal.endDate()).isEqualTo(goal.startDate());
    }

    @Test
    void shouldRefuseAnEndBeforeTheStart() {
        assertThatThrownBy(() -> new DeadlineGoal(GoalType.BOOKS, 2, FEBRUARY_11, AUGUST_11, null))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("goal.invalid-dates");
    }

    @Test
    void shouldChangeEverythingButNeverToAnEndBeforeTheStart() {
        DeadlineGoal goal = new DeadlineGoal(GoalType.BOOKS, 2, AUGUST_11, FEBRUARY_11, 12L);

        goal.change(GoalType.PAGES, 3000, AUGUST_11, FEBRUARY_11, null);

        assertThat(goal.type()).isEqualTo(GoalType.PAGES);
        assertThat(goal.genreId()).isNull();
        assertThatThrownBy(() -> goal.change(GoalType.BOOKS, 2, FEBRUARY_11, AUGUST_11, null))
                .isInstanceOf(BusinessRuleException.class);
        assertThat(goal.startDate()).isEqualTo(AUGUST_11);
    }
}
