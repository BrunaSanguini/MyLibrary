package io.github.brunasanguini.minhalivraria.reading.domain;

import io.github.brunasanguini.minhalivraria.shared.persistence.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.time.LocalDate;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * What was read on one day of a reading. The rules that need the other sessions and the book (period, total of
 * pages) are checked by the service before the session gets here.
 */
@Entity
public class ReadingSession extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reading_id", nullable = false, updatable = false)
    private Reading reading;

    @Column(name = "session_date", nullable = false)
    private LocalDate date;

    @Column(name = "pages_read", nullable = false)
    private int pagesRead;

    @Column(length = 2000)
    private @Nullable String note;

    public ReadingSession(Reading reading, LocalDate date, int pagesRead, @Nullable String note) {
        this.reading = reading;
        this.date = date;
        this.pagesRead = pagesRead;
        this.note = note;
    }

    /** For JPA only. */
    @SuppressWarnings("NullAway.Init")
    protected ReadingSession() {}

    public void update(LocalDate date, int pagesRead, @Nullable String note) {
        this.date = date;
        this.pagesRead = pagesRead;
        this.note = note;
    }

    public long id() {
        return Objects.requireNonNull(id, "Session not saved yet");
    }

    public Reading reading() {
        return reading;
    }

    public LocalDate date() {
        return date;
    }

    public int pagesRead() {
        return pagesRead;
    }

    public @Nullable String note() {
        return note;
    }
}
