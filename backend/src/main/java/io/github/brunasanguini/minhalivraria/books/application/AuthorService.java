package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.books.domain.Author;
import io.github.brunasanguini.minhalivraria.books.domain.AuthorRepository;
import io.github.brunasanguini.minhalivraria.books.domain.BookRepository;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.text.TextNormalizer;
import io.github.brunasanguini.minhalivraria.shared.web.PageResponse;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Authors are not unique by name: two people can share one. */
@Service
@Transactional(readOnly = true)
public class AuthorService {

    private final AuthorRepository authors;
    private final BookRepository books;

    AuthorService(AuthorRepository authors, BookRepository books) {
        this.authors = authors;
        this.books = books;
    }

    public PageResponse<AuthorResponse> search(@Nullable String q, Pageable pageable) {
        String term = q == null ? "" : TextNormalizer.normalize(q);
        Page<Author> page =
                term.isEmpty() ? authors.findAll(pageable) : authors.findByNormalizedNameContaining(term, pageable);
        return PageResponse.of(page, AuthorService::toResponse);
    }

    public AuthorResponse get(long id) {
        return toResponse(find(id));
    }

    @Transactional
    public AuthorResponse create(AuthorRequest request) {
        return toResponse(authors.save(new Author(request.name())));
    }

    @Transactional
    public AuthorResponse update(long id, AuthorRequest request) {
        Author author = find(id);
        author.rename(request.name());
        return toResponse(author);
    }

    /**
     * @throws ConflictException {@code author.has-books}, when the author still has books in the collection
     */
    @Transactional
    public void delete(long id) {
        Author author = find(id);
        if (books.existsByAuthorsId(id)) {
            throw new ConflictException("author.has-books");
        }
        authors.delete(author);
    }

    private Author find(long id) {
        return authors.findById(id).orElseThrow(() -> new NotFoundException("author.not-found"));
    }

    private static AuthorResponse toResponse(Author author) {
        return new AuthorResponse(author.id(), author.name());
    }
}
