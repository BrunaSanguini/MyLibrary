package io.github.brunasanguini.minhalivraria.goals.domain;

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
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * A goal with a deadline: a target between two dates the reader chooses ("2 livros de não ficção nos próximos 6
 * meses", "20 livros em 2027"), optionally only for the books of one genre and its subgenres. Unlike the yearly and
 * monthly goals, everything in it can change.
 */
@Entity
@Table(name = "deadline_goal")
public class DeadlineGoal extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private GoalType type;

    @Column(nullable = false)
    private int target;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    /** Only the books of this genre and of its subgenres count; null counts every book. */
    @Column(name = "genre_id")
    private @Nullable Long genreId;

    /**
     * @throws BusinessRuleException {@code goal.invalid-dates} when the end comes before the start
     */
    public DeadlineGoal(GoalType type, int target, LocalDate startDate, LocalDate endDate, @Nullable Long genreId) {
        checkDates(startDate, endDate);
        this.type = type;
        this.target = target;
        this.startDate = startDate;
        this.endDate = endDate;
        this.genreId = genreId;
    }

    /** For JPA only. */
    @SuppressWarnings("NullAway.Init")
    protected DeadlineGoal() {}

    /**
     * @throws BusinessRuleException {@code goal.invalid-dates} when the end comes before the start
     */
    public void change(GoalType type, int target, LocalDate startDate, LocalDate endDate, @Nullable Long genreId) {
        checkDates(startDate, endDate);
        this.type = type;
        this.target = target;
        this.startDate = startDate;
        this.endDate = endDate;
        this.genreId = genreId;
    }

    private static void checkDates(LocalDate startDate, LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new BusinessRuleException("goal.invalid-dates");
        }
    }

    public long id() {
        return Objects.requireNonNull(id, "Goal not saved yet");
    }

    public GoalType type() {
        return type;
    }

    public int target() {
        return target;
    }

    /** First day the goal counts. */
    public LocalDate startDate() {
        return startDate;
    }

    /** Last day the goal counts. */
    public LocalDate endDate() {
        return endDate;
    }

    public @Nullable Long genreId() {
        return genreId;
    }
}
