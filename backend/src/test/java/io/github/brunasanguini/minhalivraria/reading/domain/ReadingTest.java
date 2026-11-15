package io.github.brunasanguini.minhalivraria.reading.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class ReadingTest {

    private static final long BOOK = 42;
    private static final LocalDate NOV_1 = LocalDate.parse("2026-11-01");
    private static final LocalDate NOV_8 = LocalDate.parse("2026-11-08");

    @Test
    void shouldStartInProgressWithAStartAndNoEnd() {
        Reading reading = inProgress();

        assertThat(reading.status()).isEqualTo(ReadingStatus.IN_PROGRESS);
        assertThat(reading.startDate()).isEqualTo(NOV_1);
        assertThat(reading.endDate()).isNull();
        assertThat(reading.reread()).isFalse();
    }

    @Test
    void shouldRequireTheStartOfAReadingInProgress() {
        assertThatThrownBy(() -> new Reading(BOOK, ReadingStatus.IN_PROGRESS, null, null, false))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("reading.start-date-required");
    }

    @Test
    void shouldRefuseAnEndOnAReadingInProgress() {
        assertThatThrownBy(() -> new Reading(BOOK, ReadingStatus.IN_PROGRESS, NOV_1, NOV_8, false))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("reading.end-date-not-allowed");
    }

    @Test
    void shouldRegisterAnOldReadingWithOnlyTheEnd() {
        Reading reading = new Reading(BOOK, ReadingStatus.FINISHED, null, NOV_8, true);

        assertThat(reading.startDate()).isNull();
        assertThat(reading.endDate()).isEqualTo(NOV_8);
        assertThat(reading.reread()).isTrue();
    }

    @Test
    void shouldRequireTheEndOfAFinishedOrAbandonedReading() {
        assertThatThrownBy(() -> new Reading(BOOK, ReadingStatus.FINISHED, NOV_1, null, false))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("reading.end-date-required");
        assertThatThrownBy(() -> new Reading(BOOK, ReadingStatus.ABANDONED, NOV_1, null, false))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void shouldRefuseAnEndBeforeTheStart() {
        assertThatThrownBy(() -> new Reading(BOOK, ReadingStatus.FINISHED, NOV_8, NOV_1, false))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("reading.end-before-start");
    }

    @Test
    void shouldFinishOnTheGivenDay() {
        Reading reading = inProgress();

        reading.finish(NOV_8);

        assertThat(reading.status()).isEqualTo(ReadingStatus.FINISHED);
        assertThat(reading.endDate()).isEqualTo(NOV_8);
    }

    @Test
    void shouldFinishOnTheSameDayItStarted() {
        Reading reading = inProgress();

        reading.finish(NOV_1);

        assertThat(reading.endDate()).isEqualTo(NOV_1);
    }

    @Test
    void shouldAbandonOnTheGivenDay() {
        Reading reading = inProgress();

        reading.abandon(NOV_8);

        assertThat(reading.status()).isEqualTo(ReadingStatus.ABANDONED);
        assertThat(reading.endDate()).isEqualTo(NOV_8);
    }

    @Test
    void shouldStayInProgressWhenTheEndIsBeforeTheStart() {
        Reading reading = inProgress();

        assertThatThrownBy(() -> reading.finish(NOV_1.minusDays(1)))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("reading.end-before-start");
    }

    @Test
    void shouldOnlyFinishOrAbandonAReadingInProgress() {
        Reading reading = inProgress();
        reading.finish(NOV_8);

        assertThatThrownBy(() -> reading.finish(NOV_8))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("reading.not-in-progress");
        assertThatThrownBy(() -> reading.abandon(NOV_8)).isInstanceOf(ConflictException.class);
    }

    @Test
    void shouldCorrectTheDatesAndTheRereadMarkWithoutChangingTheStatus() {
        Reading reading = inProgress();
        reading.finish(NOV_8);

        reading.reschedule(NOV_1.minusDays(3), NOV_8.plusDays(1), true);

        assertThat(reading.status()).isEqualTo(ReadingStatus.FINISHED);
        assertThat(reading.startDate()).isEqualTo(NOV_1.minusDays(3));
        assertThat(reading.endDate()).isEqualTo(NOV_8.plusDays(1));
        assertThat(reading.reread()).isTrue();
    }

    @Test
    void shouldNotLetACorrectionEndAReadingInProgress() {
        Reading reading = inProgress();

        assertThatThrownBy(() -> reading.reschedule(NOV_1, NOV_8, false))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("reading.end-date-not-allowed");
    }

    @Test
    void shouldCoverTheDaysOfItsPeriod() {
        Reading reading = new Reading(BOOK, ReadingStatus.FINISHED, NOV_1, NOV_8, false);

        assertThat(reading.covers(NOV_1)).isTrue();
        assertThat(reading.covers(NOV_8)).isTrue();
        assertThat(reading.covers(NOV_1.minusDays(1))).isFalse();
        assertThat(reading.covers(NOV_8.plusDays(1))).isFalse();
    }

    @Test
    void shouldCoverAnyDayOnTheOpenSideOfThePeriod() {
        assertThat(inProgress().covers(NOV_8.plusYears(1))).isTrue();
        assertThat(inProgress().covers(NOV_1.minusDays(1))).isFalse();
        assertThat(new Reading(BOOK, ReadingStatus.FINISHED, null, NOV_8, false).covers(NOV_1.minusYears(5)))
                .isTrue();
    }

    private static Reading inProgress() {
        return new Reading(BOOK, ReadingStatus.IN_PROGRESS, NOV_1, null, false);
    }
}
