package io.github.brunasanguini.minhalivraria.books.web;

import io.github.brunasanguini.minhalivraria.books.application.PublisherRequest;
import io.github.brunasanguini.minhalivraria.books.application.PublisherResponse;
import io.github.brunasanguini.minhalivraria.books.application.PublisherService;
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

@Tag(name = "publishers", description = "Publishers, unique by normalized name")
@RestController
@RequestMapping("/publishers")
class PublisherController {

    private final PublisherService service;

    PublisherController(PublisherService service) {
        this.service = service;
    }

    @Operation(operationId = "searchPublishers", summary = "Publishers, by name (q ignores case and accents)")
    @GetMapping
    PageResponse<PublisherResponse> search(
            @RequestParam(required = false) @Size(max = 200) @Nullable String q,
            @Valid @ParameterObject PageQuery query) {
        return service.search(q, NameSort.pageable(query));
    }

    @Operation(operationId = "getPublisher")
    @GetMapping("/{id}")
    PublisherResponse get(@PathVariable long id) {
        return service.get(id);
    }

    @Operation(operationId = "createPublisher")
    @PostMapping
    ResponseEntity<PublisherResponse> create(@Valid @RequestBody PublisherRequest request) {
        PublisherResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/v1/publishers/" + created.id())).body(created);
    }

    @Operation(operationId = "updatePublisher")
    @PutMapping("/{id}")
    PublisherResponse update(@PathVariable long id, @Valid @RequestBody PublisherRequest request) {
        return service.update(id, request);
    }

    @Operation(operationId = "deletePublisher")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
