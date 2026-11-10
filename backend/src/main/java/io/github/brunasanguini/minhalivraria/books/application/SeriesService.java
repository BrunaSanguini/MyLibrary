package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.domain.Series;
import io.github.brunasanguini.minhalivraria.books.domain.SeriesRepository;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.text.TextNormalizer;
import io.github.brunasanguini.minhalivraria.shared.web.PageResponse;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class SeriesService {

    private final SeriesRepository series;

    SeriesService(SeriesRepository series) {
        this.series = series;
    }

    public PageResponse<SeriesResponse> search(@Nullable String q, Pageable pageable) {
        String term = q == null ? "" : TextNormalizer.normalize(q);
        Page<Series> page =
                term.isEmpty() ? series.findAll(pageable) : series.findByNormalizedNameContaining(term, pageable);
        return PageResponse.of(page, SeriesService::toResponse);
    }

    public SeriesResponse get(long id) {
        return toResponse(find(id));
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

    // With the books table, deleting a series also clears series and position of its books.
    @Transactional
    public void delete(long id) {
        series.delete(find(id));
    }

    private Series find(long id) {
        return series.findById(id).orElseThrow(() -> new NotFoundException("series.not-found"));
    }

    private static SeriesResponse toResponse(Series found) {
        return new SeriesResponse(found.id(), found.name(), found.totalVolumes());
    }
}
