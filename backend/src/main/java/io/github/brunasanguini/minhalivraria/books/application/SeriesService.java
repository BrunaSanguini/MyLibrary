package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.domain.Book;
import io.github.brunasanguini.minhalivraria.books.domain.BookRepository;
import io.github.brunasanguini.minhalivraria.books.domain.Series;
import io.github.brunasanguini.minhalivraria.books.domain.SeriesRepository;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.text.TextNormalizer;
import io.github.brunasanguini.minhalivraria.shared.web.PageResponse;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class SeriesService {

    private final SeriesRepository series;
    private final BookRepository books;
    private final CatalogStats stats;

    SeriesService(SeriesRepository series, BookRepository books, CatalogStats stats) {
        this.series = series;
        this.books = books;
        this.stats = stats;
    }

    public PageResponse<SeriesResponse> search(@Nullable String q, Pageable pageable) {
        String term = q == null ? "" : TextNormalizer.normalize(q);
        Page<Series> page =
                term.isEmpty() ? series.findAll(pageable) : series.findByNormalizedNameContaining(term, pageable);
        Map<Long, CatalogStats.Stats> bySeries =
                stats.ofSeries(page.map(Series::id).getContent());
        return PageResponse.of(page, found -> toResponse(found, bySeries));
    }

    public SeriesResponse get(long id) {
        return toResponse(find(id), stats.ofSeries(List.of(id)));
    }

    @Transactional
    public SeriesResponse create(SeriesRequest request) {
        if (series.existsByNormalizedName(TextNormalizer.normalize(request.name()))) {
            throw new ConflictException("series.name-duplicated");
        }
        return toResponse(series.save(new Series(request.name(), request.totalVolumes())));
    }

    @Transactional
    public SeriesResponse update(long id, SeriesRequest request) {
        Series found = find(id);
        if (series.existsByNormalizedNameAndIdNot(TextNormalizer.normalize(request.name()), id)) {
            throw new ConflictException("series.name-duplicated");
        }
        found.update(request.name(), request.totalVolumes());
        return toResponse(found);
    }

    /** Clears series and position of every book of the series, so no book is left with a position and no series. */
    @Transactional
    public void delete(long id) {
        Series found = find(id);
        books.findBySeriesId(id).forEach(Book::leaveSeries);
        books.flush();
        series.delete(found);
    }

    private Series find(long id) {
        return series.findById(id).orElseThrow(() -> new NotFoundException("series.not-found"));
    }

    private static SeriesResponse toResponse(Series found) {
        return new SeriesResponse(found.id(), found.name(), found.totalVolumes());
    }

    private static SeriesResponse toResponse(Series found, Map<Long, CatalogStats.Stats> stats) {
        CatalogStats.Stats counted = stats.getOrDefault(found.id(), CatalogStats.Stats.NONE);
        return new SeriesResponse(
                found.id(), found.name(), found.totalVolumes(), counted.bookCount(), counted.coverUrls());
    }
}
