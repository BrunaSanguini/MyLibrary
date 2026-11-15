package io.github.brunasanguini.minhalivraria.books.web;

import io.github.brunasanguini.minhalivraria.books.application.BookDetailResponse;
import io.github.brunasanguini.minhalivraria.books.application.BookImportService;
import io.github.brunasanguini.minhalivraria.books.application.ImportCandidateResponse;
import io.github.brunasanguini.minhalivraria.books.application.ImportPreviewResponse;
import io.github.brunasanguini.minhalivraria.books.application.ImportRequest;
import io.github.brunasanguini.minhalivraria.shared.error.BadRequestException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "books")
@RestController
@RequestMapping("/books/import")
class BookImportController {

    private static final String OPEN_LIBRARY_ERRORS = " Open Library failures: 404 openlibrary.not-found, 502"
            + " openlibrary.bad-response, 503 openlibrary.unavailable and 504 openlibrary.timeout.";

    private final BookImportService service;

    BookImportController(BookImportService service) {
        this.service = service;
    }

    @Operation(
            operationId = "searchImportCandidates",
            summary = "Searches the Open Library by title or author",
            description = "Up to 20 results. libraryBookId is set when the edition is already in the collection."
                    + OPEN_LIBRARY_ERRORS)
    @GetMapping("/search")
    List<ImportCandidateResponse> search(@RequestParam @NotBlank @Size(max = 200) String q) {
        return service.search(q);
    }

    @Operation(
            operationId = "previewImport",
            summary = "The data of one edition, before importing it",
            description = "Send exactly one of isbn and editionKey; otherwise 400 request.invalid. Nothing is saved"
                    + " and the cover still points to the Open Library."
                    + OPEN_LIBRARY_ERRORS)
    @GetMapping("/preview")
    ImportPreviewResponse preview(
            @RequestParam(required = false) @Nullable String isbn,
            @RequestParam(required = false) @Nullable String editionKey) {
        String number = blankToNull(isbn);
        String edition = blankToNull(editionKey);
        if (number != null && edition == null) {
            return service.previewByIsbn(number);
        }
        if (edition != null && number == null) {
            return service.previewByEdition(edition);
        }
        throw new BadRequestException("request.invalid");
    }

    @Operation(
            operationId = "importBook",
            summary = "Imports an edition into the collection",
            description = "Downloads the cover and reuses authors and publisher by name. Edition or ISBN-13 already"
                    + " in the collection: 409 book.edition-duplicated or book.isbn-duplicated, with bookId."
                    + OPEN_LIBRARY_ERRORS)
    @PostMapping
    ResponseEntity<BookDetailResponse> importEdition(@Valid @RequestBody ImportRequest request) {
        BookDetailResponse created = service.importEdition(request);
        return ResponseEntity.created(URI.create("/api/v1/books/" + created.id()))
                .body(created);
    }

    private static @Nullable String blankToNull(@Nullable String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
