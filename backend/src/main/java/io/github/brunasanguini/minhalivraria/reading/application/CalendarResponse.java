package io.github.brunasanguini.minhalivraria.reading.application;

import java.time.LocalDate;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * A month of reading for the calendar: every day with a session, a start or an end of a reading, and the books
 * of each day.
 *
 * @param finished readings finished in the month, also on a day without a session
 * @param days only the days with a session, a start or an end, oldest first
 */
public record CalendarResponse(int year, int month, int finished, List<CalendarDayResponse> days) {

    public record CalendarDayResponse(LocalDate date, List<CalendarEntryResponse> books) {}

    /**
     * One book on one day.
     *
     * @param pages pages of the sessions of the day, 0 on a start or end without a session
     * @param started the reading started on this day
     * @param finished the reading was finished on this day
     * @param abandoned the reading was abandoned on this day, the last day of the book
     */
    public record CalendarEntryResponse(
            long bookId,
            String title,
            List<String> authors,
            @Nullable String coverUrl,
            int pages,
            boolean started,
            boolean finished,
            boolean abandoned) {}
}
