package io.github.brunasanguini.minhalivraria.lists.web;

import io.github.brunasanguini.minhalivraria.lists.application.BookListRequest;
import io.github.brunasanguini.minhalivraria.lists.application.BookListResponse;
import io.github.brunasanguini.minhalivraria.lists.application.BookListService;
import io.github.brunasanguini.minhalivraria.lists.application.ListFilter;
import io.github.brunasanguini.minhalivraria.lists.application.ListOrderRequest;
import io.github.brunasanguini.minhalivraria.lists.application.ListStatus;
import io.github.brunasanguini.minhalivraria.shared.web.PageQuery;
import io.github.brunasanguini.minhalivraria.shared.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.util.Map;
import java.util.function.Function;
import org.jspecify.annotations.Nullable;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Sort;
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

@Tag(name = "lists", description = "Lists of books made by the user")
@RestController
@RequestMapping("/lists")
class BookListController {

    private static final Map<String, String> SORT_FIELDS = Map.of("name", "normalizedName", "updatedAt", "updatedAt");
    private static final Sort BY_NAME = Sort.by("normalizedName");

    private final BookListService service;

    BookListController(BookListService service) {
        this.service = service;
    }

    @Operation(
            operationId = "searchLists",
            summary = "Lists, as cards",
            description = "q ignores case and accents and matches the name. status is how far the reading of the list"
                    + " is. pinned=true is the pinned list and pinned=false are all the others. Sorting: name"
                    + " (default, asc) and updatedAt. The books of a list come from"
                    + " GET /shelf/books?listId={id}&sort=listOrder,asc.")
    @GetMapping
    PageResponse<BookListResponse> search(
            @RequestParam(required = false) @Size(max = 200) @Nullable String q,
            @RequestParam(required = false) @Nullable ListStatus status,
            @RequestParam(required = false) @Nullable Boolean pinned,
            @Valid @ParameterObject PageQuery page) {
        return PageResponse.of(
                service.search(new ListFilter(q, status, pinned), page.toPageable(SORT_FIELDS, BY_NAME)),
                Function.identity());
    }

    @Operation(operationId = "getList")
    @GetMapping("/{id}")
    BookListResponse get(@PathVariable long id) {
        return service.get(id);
    }

    @Operation(
            operationId = "createList",
            description = "A name already in use: 409 list.name-duplicated. Without a color, the list is plum.")
    @PostMapping
    ResponseEntity<BookListResponse> create(@Valid @RequestBody BookListRequest request) {
        BookListResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/v1/lists/" + created.id()))
                .body(created);
    }

    @Operation(
            operationId = "updateList",
            description = "A name already in use: 409 list.name-duplicated. Without a color, the list keeps its own.")
    @PutMapping("/{id}")
    BookListResponse update(@PathVariable long id, @Valid @RequestBody BookListRequest request) {
        return service.update(id, request);
    }

    @Operation(operationId = "deleteList", summary = "Deletes the list; its books stay in the collection")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(
            operationId = "pinList",
            summary = "Pins the list on the Lists page",
            description = "Only one list is pinned: the one pinned before is unpinned. Idempotent. Pinning does not"
                    + " change updatedAt.")
    @PutMapping("/{id}/pin")
    ResponseEntity<Void> pin(@PathVariable long id) {
        service.pin(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "unpinList", summary = "Unpins the list", description = "Idempotent.")
    @DeleteMapping("/{id}/pin")
    ResponseEntity<Void> unpin(@PathVariable long id) {
        service.unpin(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(
            operationId = "addBookToList",
            summary = "Adds a book at the end of the list",
            description = "Idempotent: a book that is already in the list stays where it is.")
    @PutMapping("/{id}/books/{bookId}")
    ResponseEntity<Void> addBook(@PathVariable long id, @PathVariable long bookId) {
        service.addBook(id, bookId);
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "removeBookFromList")
    @DeleteMapping("/{id}/books/{bookId}")
    ResponseEntity<Void> removeBook(@PathVariable long id, @PathVariable long bookId) {
        service.removeBook(id, bookId);
        return ResponseEntity.noContent().build();
    }

    @Operation(
            operationId = "reorderList",
            description = "bookIds has to be exactly the books of the list, each one once; otherwise 422"
                    + " list.invalid-order.")
    @PutMapping("/{id}/order")
    ResponseEntity<Void> reorder(@PathVariable long id, @Valid @RequestBody ListOrderRequest request) {
        service.reorder(id, request.bookIds());
        return ResponseEntity.noContent().build();
    }
}
