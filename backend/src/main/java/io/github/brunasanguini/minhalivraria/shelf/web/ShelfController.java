package io.github.brunasanguini.minhalivraria.shelf.web;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.shared.web.PageQuery;
import io.github.brunasanguini.minhalivraria.shared.web.PageResponse;
import io.github.brunasanguini.minhalivraria.shelf.application.BookCardResponse;
import io.github.brunasanguini.minhalivraria.shelf.application.RelatedBooksResponse;
import io.github.brunasanguini.minhalivraria.shelf.application.ShelfFilter;
import io.github.brunasanguini.minhalivraria.shelf.application.ShelfService;
import io.github.brunasanguini.minhalivraria.shelf.application.ShelfStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.function.Function;
import org.jspecify.annotations.Nullable;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "shelf", description = "Read-only listing of book cards, used by every screen")
@RestController
@RequestMapping("/shelf")
class ShelfController {

    private final ShelfService service;

    ShelfController(ShelfService service) {
        this.service = service;
    }

    @Operation(
            operationId = "searchShelfBooks",
            summary = "Book cards, filtered and paginated",
            description = "The search ignores accents and also matches author names. A genre brings the books of its"
                    + " subgenres. status can repeat. Sorting: title, author, addedAt (default, desc), seriesPosition,"
                    + " rating, finishedAt and, only with listId, listOrder.")
    @GetMapping("/books")
    PageResponse<BookCardResponse> search(
            @RequestParam(required = false) @Size(max = 200) @Nullable String q,
            @RequestParam(required = false) @Nullable List<ShelfStatus> status,
            @RequestParam(required = false) @Nullable Ownership ownership,
            @RequestParam(required = false) @Nullable Boolean favorite,
            @RequestParam(required = false) @Nullable Long genreId,
            @RequestParam(required = false) @Nullable Long authorId,
            @RequestParam(required = false) @Nullable Long publisherId,
            @RequestParam(required = false) @Nullable Long seriesId,
            @RequestParam(required = false) @Nullable Long listId,
            @Valid @ParameterObject PageQuery page) {
        ShelfFilter filter = new ShelfFilter(q, status, ownership, favorite, genreId, authorId, publisherId, seriesId, listId);
        return PageResponse.of(service.search(filter, page), Function.identity());
    }

    @Operation(
            operationId = "getRelatedBooks",
            summary = "The other books of the series and the ones with subgenres in common")
    @GetMapping("/books/{id}/related")
    RelatedBooksResponse related(@PathVariable long id) {
        return service.related(id);
    }
}
