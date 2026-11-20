package io.github.brunasanguini.minhalivraria.goals.application;

import io.github.brunasanguini.minhalivraria.goals.GoalPeriod;
import io.github.brunasanguini.minhalivraria.goals.GoalType;
import io.github.brunasanguini.minhalivraria.goals.domain.Goal;
import io.github.brunasanguini.minhalivraria.goals.domain.GoalRepository;
import io.github.brunasanguini.minhalivraria.reading.ReadingHistory;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.Year;
import java.time.YearMonth;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reading goals and how far each one is, calculated from the readings every time it is asked. */
@Service
@Transactional(readOnly = true)
public class GoalService {

    private static final int COMPLETE = 100;

    private final GoalRepository goals;
    private final ReadingHistory readings;
    private final Clock clock;

    GoalService(GoalRepository goals, ReadingHistory readings, Clock clock) {
        this.goals = goals;
        this.readings = readings;
        this.clock = clock;
    }

    /**
     * The goals of a year. In the current year, a monthly goal also goes on to the current month: when the month has
     * none yet, it gets one with the target and the switch of the last monthly goal of the same type.
     *
     * @param year the year of the goals; the current year when null
     * @return the yearly goals first, then the monthly ones month by month
     */
    @Transactional
    public List<GoalResponse> listByYear(@Nullable Integer year) {
        int chosen = year == null ? Year.now(clock).getValue() : year;
        YearMonth now = YearMonth.now(clock);
        if (chosen == now.getYear()) {
            carryMonthlyGoalsTo(now);
        }
        return goals.findByYearInOrder((short) chosen).stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * @throws ConflictException {@code goal.duplicated}, when the type already has a goal for the period
     */
    @Transactional
    public GoalResponse create(GoalRequest request) {
        Goal goal = new Goal(request.type(), request.period(), request.year(), request.month(), request.target());
        Short month = request.month() == null ? null : request.month().shortValue();
        if (goals.existsByTypeAndPeriod(request.type(), request.year().shortValue(), month)) {
            throw new ConflictException("goal.duplicated");
        }
        return toResponse(goals.save(goal));
    }

    @Transactional
    public GoalResponse changeTarget(long id, int target) {
        return update(id, target, null);
    }

    /**
     * @param enabled whether the Home shows the goal; null keeps it as it is
     */
    @Transactional
    public GoalResponse update(long id, int target, @Nullable Boolean enabled) {
        Goal goal = find(id);
        goal.changeTarget(target);
        if (enabled != null) {
            goal.turn(enabled);
        }
        return toResponse(goal);
    }

    @Transactional
    public void delete(long id) {
        goals.delete(find(id));
    }

    /** "Muda sozinha a cada mês": the goal of a month is the one of the month before, until it changes. */
    private void carryMonthlyGoalsTo(YearMonth month) {
        for (GoalType type : GoalType.values()) {
            if (type == GoalType.REREADS || hasMonthlyGoal(type, month)) {
                continue;
            }
            goals.findFirstByTypeAndPeriodOrderByYearDescMonthDesc(type, GoalPeriod.MONTH)
                    .filter(last -> monthOf(last).isBefore(month))
                    .ifPresent(last -> goals.save(repeat(last, month)));
        }
    }

    private boolean hasMonthlyGoal(GoalType type, YearMonth month) {
        return goals.existsByTypeAndPeriod(type, (short) month.getYear(), (short) month.getMonthValue());
    }

    private static YearMonth monthOf(Goal goal) {
        Integer month = goal.month();
        return YearMonth.of(goal.year(), month == null ? 1 : month);
    }

    private static Goal repeat(Goal last, YearMonth month) {
        Goal next = new Goal(last.type(), GoalPeriod.MONTH, month.getYear(), month.getMonthValue(), last.target());
        next.turn(last.enabled());
        return next;
    }

    private Goal find(long id) {
        return goals.findById(id).orElseThrow(() -> new NotFoundException("goal.not-found"));
    }

    private GoalResponse toResponse(Goal goal) {
        int current = progressOf(goal);
        int percent = (int) Math.min(COMPLETE, (long) current * COMPLETE / goal.target());
        return new GoalResponse(
                goal.id(),
                goal.type(),
                goal.period(),
                goal.year(),
                goal.month(),
                goal.target(),
                current,
                percent,
                goal.enabled());
    }

    private int progressOf(Goal goal) {
        LocalDate from = goal.firstDay();
        LocalDate to = goal.lastDay();
        return switch (goal.type()) {
            case BOOKS -> readings.finishedReadings(from, to);
            case PAGES -> readings.pagesRead(from, to);
            case REREADS -> readings.finishedRereads(from, to);
        };
    }
}
