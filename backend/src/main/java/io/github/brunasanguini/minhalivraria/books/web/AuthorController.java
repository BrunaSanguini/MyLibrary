package io.github.brunasanguini.minhalivraria.books.web;

import io.github.brunasanguini.minhalivraria.books.application.AuthorRequest;
import io.github.brunasanguini.minhalivraria.books.application.AuthorResponse;
import io.github.brunasanguini.minhalivraria.books.application.AuthorService;
import io.github.brunasanguini.minhalivraria.shared.web.PageQuery;
import io.github.brunasanguini.minhalivraria.shared.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.net.URI;
import org.jspecify.annotations.Nullable;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "authors", description = "Authors of the collection")
@RestController
@RequestMapping("/authors")
class AuthorController {

    private final AuthorService service;

    AuthorController(AuthorService service) {
        this.service = service;
    }

    @Operation(operationId = "searchAuthors", summary = "Authors, by name (q ignores case and accents)")
    @GetMapping
    PageResponse<AuthorResponse> search(
            @RequestParam(required = false) @Size(max = 200) @Nullable String q,
            @Valid @ParameterObject PageQuery query) {
        return service.search(q, NameSort.pageable(query));
    }

    @Operation(operationId = "getAuthor")
    @GetMapping("/{id}")
    AuthorResponse get(@PathVariable long id) {
        return service.get(id);
    }

    @Operation(operationId = "createAuthor")
    @PostMapping
    ResponseEntity<AuthorResponse> create(@Valid @RequestBody AuthorRequest request) {
        AuthorResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/v1/authors/" + created.id())).body(created);
    }

    @Operation(operationId = "updateAuthor")
    @PutMapping("/{id}")
    AuthorResponse update(@PathVariable long id, @Valid @RequestBody AuthorRequest request) {
        return service.update(id, request);
    }

    @Operation(operationId = "deleteAuthor")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
