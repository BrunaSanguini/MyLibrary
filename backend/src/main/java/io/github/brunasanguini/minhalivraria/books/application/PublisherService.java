package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.domain.Publisher;
import io.github.brunasanguini.minhalivraria.books.domain.PublisherRepository;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.text.TextNormalizer;
import io.github.brunasanguini.minhalivraria.shared.web.PageResponse;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Publishers are unique by normalized name, so an import reuses "Rocco" instead of creating it twice. */
@Service
@Transactional(readOnly = true)
public class PublisherService {

    private final PublisherRepository publishers;

    PublisherService(PublisherRepository publishers) {
        this.publishers = publishers;
    }

    public PageResponse<PublisherResponse> search(@Nullable String q, Pageable pageable) {
        String term = q == null ? "" : TextNormalizer.normalize(q);
        Page<Publisher> page = term.isEmpty()
                ? publishers.findAll(pageable)
                : publishers.findByNormalizedNameContaining(term, pageable);
        return PageResponse.of(page, PublisherService::toResponse);
    }

    public PublisherResponse get(long id) {
        return toResponse(find(id));
    }

    @Transactional
    public PublisherResponse create(PublisherRequest request) {
        if (publishers.existsByNormalizedName(TextNormalizer.normalize(request.name()))) {
            throw new ConflictException("publisher.name-duplicated");
        }
        return toResponse(publishers.save(new Publisher(request.name())));
    }

    @Transactional
    public PublisherResponse update(long id, PublisherRequest request) {
        Publisher publisher = find(id);
        if (publishers.existsByNormalizedNameAndIdNot(TextNormalizer.normalize(request.name()), id)) {
            throw new ConflictException("publisher.name-duplicated");
        }
        publisher.rename(request.name());
        return toResponse(publisher);
    }

    // Books of the publisher lose it (ON DELETE SET NULL in the books table).
    @Transactional
    public void delete(long id) {
        publishers.delete(find(id));
    }

    private Publisher find(long id) {
        return publishers.findById(id).orElseThrow(() -> new NotFoundException("publisher.not-found"));
    }

    private static PublisherResponse toResponse(Publisher publisher) {
        return new PublisherResponse(publisher.id(), publisher.name());
    }
}
