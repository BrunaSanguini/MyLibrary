package io.github.brunasanguini.minhalivraria.books.web;

import io.github.brunasanguini.minhalivraria.books.application.GenreRequest;
import io.github.brunasanguini.minhalivraria.books.application.GenreResponse;
import io.github.brunasanguini.minhalivraria.books.application.GenreService;
import io.github.brunasanguini.minhalivraria.books.application.GenreTreeResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "genres", description = "Genres and subgenres, at most two levels")
@RestController
@RequestMapping("/genres")
class GenreController {

    private final GenreService service;

    GenreController(GenreService service) {
        this.service = service;
    }

    @Operation(operationId = "getGenreTree", summary = "Genres with their subgenres, in name order (no pagination)")
    @GetMapping
    List<GenreTreeResponse> tree() {
        return service.tree();
    }

    @Operation(operationId = "createGenre", summary = "Creates a genre, or a subgenre when parentId is a genre")
    @PostMapping
    ResponseEntity<GenreResponse> create(@Valid @RequestBody GenreRequest request) {
        GenreResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/v1/genres/" + created.id()))
                .body(created);
    }

    @Operation(operationId = "updateGenre")
    @PutMapping("/{id}")
    GenreResponse update(@PathVariable long id, @Valid @RequestBody GenreRequest request) {
        return service.update(id, request);
    }

    @Operation(operationId = "deleteGenre", summary = "A genre with subgenres cannot be deleted (409)")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
