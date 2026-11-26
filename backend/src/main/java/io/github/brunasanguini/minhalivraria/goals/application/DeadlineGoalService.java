package io.github.brunasanguini.minhalivraria.goals.application;

import io.github.brunasanguini.minhalivraria.books.BookCatalog;
import io.github.brunasanguini.minhalivraria.books.GenreSummary;
import io.github.brunasanguini.minhalivraria.goals.domain.DeadlineGoal;
import io.github.brunasanguini.minhalivraria.goals.domain.DeadlineGoalRepository;
import io.github.brunasanguini.minhalivraria.reading.ReadingHistory;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Goals with a deadline, chosen by the reader between two dates, and how far each one is: the progress is calculated
 * from the readings every time it is asked, as for the yearly and monthly goals.
 */
@Service
@Transactional(readOnly = true)
public class DeadlineGoalService {

    private static final int COMPLETE = 100;

    private final DeadlineGoalRepository goals;
    private final ReadingHistory readings;
    private final BookCatalog books;

    DeadlineGoalService(DeadlineGoalRepository goals, ReadingHistory readings, BookCatalog books) {
        this.goals = goals;
        this.readings = readings;
        this.books = books;
    }

    /** Every goal with a deadline, past, running and future: the one that ends first comes first. */
    public List<DeadlineGoalResponse> list() {
        return goals.findAllByOrderByEndDateAscIdAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * @throws io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException {@code goal.invalid-dates}
     * @throws NotFoundException {@code genre.not-found}
     */
    @Transactional
    public DeadlineGoalResponse create(DeadlineGoalRequest request) {
        requireGenre(request.genreId());
        DeadlineGoal goal = new DeadlineGoal(
                request.type(), request.target(), request.startDate(), request.endDate(), request.genreId());
        return toResponse(goals.save(goal));
    }

    /**
     * Replaces everything in the goal: what it counts, the target, the dates and the genre.
     *
     * @throws NotFoundException {@code goal.not-found} or {@code genre.not-found}
     * @throws io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException {@code goal.invalid-dates}
     */
    @Transactional
    public DeadlineGoalResponse update(long id, DeadlineGoalRequest request) {
        DeadlineGoal goal = find(id);
        requireGenre(request.genreId());
        goal.change(request.type(), request.target(), request.startDate(), request.endDate(), request.genreId());
        return toResponse(goal);
    }

    @Transactional
    public void delete(long id) {
        goals.delete(find(id));
    }

    private void requireGenre(@Nullable Long genreId) {
        if (genreId != null) {
            books.requireGenre(genreId);
        }
    }

    private DeadlineGoal find(long id) {
        return goals.findById(id).orElseThrow(() -> new NotFoundException("goal.not-found"));
    }

    private DeadlineGoalResponse toResponse(DeadlineGoal goal) {
        Long genreId = goal.genreId();
        GoalGenre genre = null;
        if (genreId != null) {
            GenreSummary summary = books.requireGenre(genreId);
            genre = new GoalGenre(summary.id(), summary.name());
        }
        int current = progressOf(goal);
        int percent = (int) Math.min(COMPLETE, (long) current * COMPLETE / goal.target());
        return new DeadlineGoalResponse(
                goal.id(),
                goal.type(),
                goal.target(),
                goal.startDate(),
                goal.endDate(),
                genre,
                current,
                percent);
    }

    private int progressOf(DeadlineGoal goal) {
        LocalDate from = goal.startDate();
        LocalDate to = goal.endDate();
        Long genreId = goal.genreId();
        if (genreId == null) {
            return switch (goal.type()) {
                case BOOKS -> readings.finishedReadings(from, to);
                case PAGES -> readings.pagesRead(from, to);
                case REREADS -> readings.finishedRereads(from, to);
            };
        }
        Set<Long> ofGenre = books.booksOfGenre(genreId);
        return switch (goal.type()) {
            case BOOKS -> readings.finishedReadings(from, to, ofGenre);
            case PAGES -> readings.pagesRead(from, to, ofGenre);
            case REREADS -> readings.finishedRereads(from, to, ofGenre);
        };
    }
}
