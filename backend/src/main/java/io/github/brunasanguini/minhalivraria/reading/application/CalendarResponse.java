package io.github.brunasanguini.minhalivraria.reading.application;

import java.time.LocalDate;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * A month of reading for the calendar: every day with a session and the books of each day.
 *
 * @param finished readings finished in the month, also on a day without a session
 * @param days only the days with at least one session, oldest first
 */
public record CalendarResponse(int year, int month, int finished, List<CalendarDayResponse> days) {

    public record CalendarDayResponse(LocalDate date, List<CalendarEntryResponse> books) {}

    /**
     * One book on one day.
     *
     * @param pages pages of the sessions of the day
     * @param started the reading started on this day
     * @param finished the reading was finished on this day
     */
    public record CalendarEntryResponse(
            long bookId,
            String title,
            List<String> authors,
            @Nullable String coverUrl,
            int pages,
            boolean started,
            boolean finished) {}
}
