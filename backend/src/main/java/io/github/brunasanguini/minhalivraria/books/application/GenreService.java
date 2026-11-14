package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.domain.Genre;
import io.github.brunasanguini.minhalivraria.books.domain.GenreRepository;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.text.TextNormalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Genres and subgenres: names unique among both, at most two levels, no deleting a genre with subgenres. */
@Service
@Transactional(readOnly = true)
public class GenreService {

    private final GenreRepository genres;
    private final CatalogStats stats;

    GenreService(GenreRepository genres, CatalogStats stats) {
        this.genres = genres;
        this.stats = stats;
    }

    /** Genres with their subgenres, both in name order. */
    public List<GenreTreeResponse> tree() {
        Map<Long, GenreTreeResponse> roots = new LinkedHashMap<>();
        List<Genre> all = genres.findAllWithParent();
        Map<Long, Long> counts = stats.bookCountsByGenre();
        for (Genre genre : all) {
            if (!genre.isSubgenre()) {
                roots.put(
                        genre.id(),
                        new GenreTreeResponse(
                                genre.id(), genre.name(), counts.getOrDefault(genre.id(), 0L), new ArrayList<>()));
            }
        }
        for (Genre genre : all) {
            Long parentId = genre.parentId();
            if (parentId != null) {
                Objects.requireNonNull(roots.get(parentId))
                        .subgenres()
                        .add(new GenreTreeResponse.Subgenre(
                                genre.id(), genre.name(), counts.getOrDefault(genre.id(), 0L)));
            }
        }
        return roots.values().stream()
                .map(root -> new GenreTreeResponse(
                        root.id(), root.name(), root.bookCount(), List.copyOf(root.subgenres())))
                .toList();
    }

    @Transactional
    public GenreResponse create(GenreRequest request) {
        if (genres.existsByNormalizedName(TextNormalizer.normalize(request.name()))) {
            throw new ConflictException("genre.name-duplicated");
        }
        Genre genre = new Genre(request.name(), findParent(request.parentId()));
        return toResponse(genres.save(genre));
    }

    @Transactional
    public GenreResponse update(long id, GenreRequest request) {
        Genre genre = find(id);
        if (genres.existsByNormalizedNameAndIdNot(TextNormalizer.normalize(request.name()), id)) {
            throw new ConflictException("genre.name-duplicated");
        }
        Genre parent = findParent(request.parentId());
        // A genre with subgenres cannot become a subgenre: that would make three levels.
        if (parent != null && genres.existsByParentId(id)) {
            throw new BusinessRuleException("genre.invalid-parent");
        }
        genre.rename(request.name());
        genre.changeParent(parent);
        return toResponse(genre);
    }

    @Transactional
    public void delete(long id) {
        Genre genre = find(id);
        if (genres.existsByParentId(id)) {
            throw new ConflictException("genre.has-subgenres");
        }
        genres.delete(genre);
    }

    private @Nullable Genre findParent(@Nullable Long parentId) {
        return parentId == null ? null : find(parentId);
    }

    private Genre find(long id) {
        return genres.findById(id).orElseThrow(() -> new NotFoundException("genre.not-found"));
    }

    private static GenreResponse toResponse(Genre genre) {
        return new GenreResponse(genre.id(), genre.name(), genre.parentId());
    }
}
