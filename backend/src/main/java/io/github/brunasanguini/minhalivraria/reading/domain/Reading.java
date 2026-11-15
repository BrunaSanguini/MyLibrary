package io.github.brunasanguini.minhalivraria.reading.domain;

import io.github.brunasanguini.minhalivraria.reading.ReadingStatus;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.persistence.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDate;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * One complete reading of a book, from the first page to finishing or giving up. A reread is another reading.
 *
 * <p>The book belongs to another module, so the reading keeps only its id. The period follows the status: in
 * progress has a start and no end; finished and abandoned have an end, and old readings may lack the start.
 */
@Entity
public class Reading extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @Column(name = "book_id", nullable = false, updatable = false)
    private long bookId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private ReadingStatus status;

    @Column(name = "start_date")
    private @Nullable LocalDate startDate;

    @Column(name = "end_date")
    private @Nullable LocalDate endDate;

    @Column(nullable = false)
    private boolean reread;

    /**
     * @throws BusinessRuleException when the period does not fit the status
     */
    public Reading(
            long bookId,
            ReadingStatus status,
            @Nullable LocalDate startDate,
            @Nullable LocalDate endDate,
            boolean reread) {
        this.bookId = bookId;
        this.status = status;
        this.reread = reread;
        setPeriod(startDate, endDate);
    }

    /** For JPA only. */
    @SuppressWarnings("NullAway.Init")
    protected Reading() {}

    public void finish(LocalDate endDate) {
        close(ReadingStatus.FINISHED, endDate);
    }

    public void abandon(LocalDate endDate) {
        close(ReadingStatus.ABANDONED, endDate);
    }

    /** Corrects the dates and the reread mark. The status only changes through finish and abandon. */
    public void reschedule(@Nullable LocalDate startDate, @Nullable LocalDate endDate, boolean reread) {
        setPeriod(startDate, endDate);
        this.reread = reread;
    }

    /** Whether a session on this date belongs to the reading. An open side of the period accepts any date. */
    public boolean covers(LocalDate date) {
        boolean afterStart = startDate == null || !date.isBefore(startDate);
        boolean beforeEnd = endDate == null || !date.isAfter(endDate);
        return afterStart && beforeEnd;
    }

    private void close(ReadingStatus closed, LocalDate endDate) {
        if (status != ReadingStatus.IN_PROGRESS) {
            throw new ConflictException("reading.not-in-progress");
        }
        this.status = closed;
        setPeriod(startDate, endDate);
    }

    private void setPeriod(@Nullable LocalDate startDate, @Nullable LocalDate endDate) {
        if (status == ReadingStatus.IN_PROGRESS) {
            if (startDate == null) {
                throw new BusinessRuleException("reading.start-date-required");
            }
            if (endDate != null) {
                throw new BusinessRuleException("reading.end-date-not-allowed");
            }
        } else if (endDate == null) {
            throw new BusinessRuleException("reading.end-date-required");
        }
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new BusinessRuleException("reading.end-before-start");
        }
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public long id() {
        return Objects.requireNonNull(id, "Reading not saved yet");
    }

    public long bookId() {
        return bookId;
    }

    public ReadingStatus status() {
        return status;
    }

    public @Nullable LocalDate startDate() {
        return startDate;
    }

    public @Nullable LocalDate endDate() {
        return endDate;
    }

    public boolean reread() {
        return reread;
    }
}
