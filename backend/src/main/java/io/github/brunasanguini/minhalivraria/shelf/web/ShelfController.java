package io.github.brunasanguini.minhalivraria.shelf.web;

import io.github.brunasanguini.minhalivraria.books.Ownership;
import io.github.brunasanguini.minhalivraria.shared.web.PageQuery;
import io.github.brunasanguini.minhalivraria.shared.web.PageResponse;
import io.github.brunasanguini.minhalivraria.shelf.application.BookCardResponse;
import io.github.brunasanguini.minhalivraria.shelf.application.ShelfFilter;
import io.github.brunasanguini.minhalivraria.shelf.application.ShelfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.util.function.Function;
import org.jspecify.annotations.Nullable;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.GetMapping;
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
                    + " subgenres. Sorting: title, author, addedAt (default, desc) and seriesPosition.")
    @GetMapping("/books")
    PageResponse<BookCardResponse> search(
            @RequestParam(required = false) @Size(max = 200) @Nullable String q,
            @RequestParam(required = false) @Nullable Ownership ownership,
            @RequestParam(required = false) @Nullable Boolean favorite,
            @RequestParam(required = false) @Nullable Long genreId,
            @RequestParam(required = false) @Nullable Long authorId,
            @RequestParam(required = false) @Nullable Long publisherId,
            @RequestParam(required = false) @Nullable Long seriesId,
            @Valid @ParameterObject PageQuery page) {
        ShelfFilter filter = new ShelfFilter(q, ownership, favorite, genreId, authorId, publisherId, seriesId);
        return PageResponse.of(service.search(filter, page), Function.identity());
    }
}
