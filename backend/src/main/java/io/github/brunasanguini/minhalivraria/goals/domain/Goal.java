package io.github.brunasanguini.minhalivraria.goals.domain;

import io.github.brunasanguini.minhalivraria.goals.GoalPeriod;
import io.github.brunasanguini.minhalivraria.goals.GoalType;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.persistence.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * A reading goal for one year or one month. What it counts and when never change; only the target does, and whether
 * it is on, so a goal that was wrong from the start is deleted and created again.
 */
@Entity
public class Goal extends AuditedEntity {

    private static final int JANUARY = 1;
    private static final int DECEMBER = 12;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 10)
    private GoalType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 5)
    private GoalPeriod period;

    @Column(name = "period_year", nullable = false, updatable = false)
    private short year;

    @Column(name = "period_month", updatable = false)
    private @Nullable Short month;

    @Column(nullable = false)
    private int target;

    /** Off, the goal keeps its target but the Home does not show it. */
    @Column(nullable = false)
    private boolean enabled = true;

    /**
     * @param month 1 to 12 for a monthly goal; null for a yearly one
     * @throws BusinessRuleException {@code goal.invalid-period}: a monthly goal without month, a yearly goal with
     *     one, or a goal of rereads by month
     */
    public Goal(GoalType type, GoalPeriod period, int year, @Nullable Integer month, int target) {
        boolean monthly = period == GoalPeriod.MONTH;
        boolean monthFits = monthly ? month != null && month >= JANUARY && month <= DECEMBER : month == null;
        if (!monthFits || (monthly && type == GoalType.REREADS)) {
            throw new BusinessRuleException("goal.invalid-period");
        }
        this.type = type;
        this.period = period;
        this.year = (short) year;
        this.month = month == null ? null : month.shortValue();
        this.target = target;
    }

    /** For JPA only. */
    @SuppressWarnings("NullAway.Init")
    protected Goal() {}

    public void changeTarget(int target) {
        this.target = target;
    }

    public void turn(boolean on) {
        this.enabled = on;
    }

    /** First day the goal counts. */
    public LocalDate firstDay() {
        return month == null ? LocalDate.of(year, JANUARY, 1) : LocalDate.of(year, month, 1);
    }

    /** Last day the goal counts. */
    public LocalDate lastDay() {
        return month == null
                ? LocalDate.of(year, DECEMBER, 31)
                : YearMonth.of(year, month).atEndOfMonth();
    }

    public long id() {
        return Objects.requireNonNull(id, "Goal not saved yet");
    }

    public GoalType type() {
        return type;
    }

    public GoalPeriod period() {
        return period;
    }

    public int year() {
        return year;
    }

    public @Nullable Integer month() {
        return month == null ? null : month.intValue();
    }

    public int target() {
        return target;
    }

    public boolean enabled() {
        return enabled;
    }
}
