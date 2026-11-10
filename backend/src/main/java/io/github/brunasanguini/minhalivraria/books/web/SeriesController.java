package io.github.brunasanguini.minhalivraria.books.web;

import io.github.brunasanguini.minhalivraria.books.application.SeriesRequest;
import io.github.brunasanguini.minhalivraria.books.application.SeriesResponse;
import io.github.brunasanguini.minhalivraria.books.application.SeriesService;
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

@Tag(name = "series", description = "Series, unique by normalized name")
@RestController
@RequestMapping("/series")
class SeriesController {

    private final SeriesService service;

    SeriesController(SeriesService service) {
        this.service = service;
    }

    @Operation(operationId = "searchSeries", summary = "Series, by name (q ignores case and accents)")
    @GetMapping
    PageResponse<SeriesResponse> search(
            @RequestParam(required = false) @Size(max = 200) @Nullable String q,
            @Valid @ParameterObject PageQuery query) {
        return service.search(q, NameSort.pageable(query));
    }

    @Operation(operationId = "getSeries")
    @GetMapping("/{id}")
    SeriesResponse get(@PathVariable long id) {
        return service.get(id);
    }

    @Operation(operationId = "createSeries")
    @PostMapping
    ResponseEntity<SeriesResponse> create(@Valid @RequestBody SeriesRequest request) {
        SeriesResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/v1/series/" + created.id()))
                .body(created);
    }

    @Operation(operationId = "updateSeries")
    @PutMapping("/{id}")
    SeriesResponse update(@PathVariable long id, @Valid @RequestBody SeriesRequest request) {
        return service.update(id, request);
    }

    @Operation(operationId = "deleteSeries")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
