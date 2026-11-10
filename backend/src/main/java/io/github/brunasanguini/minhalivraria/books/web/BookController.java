package io.github.brunasanguini.minhalivraria.books.web;

import io.github.brunasanguini.minhalivraria.books.application.BannerResponse;
import io.github.brunasanguini.minhalivraria.books.application.BookDetailResponse;
import io.github.brunasanguini.minhalivraria.books.application.BookRequest;
import io.github.brunasanguini.minhalivraria.books.application.BookService;
import io.github.brunasanguini.minhalivraria.books.application.CoverResponse;
import io.github.brunasanguini.minhalivraria.books.application.OwnershipRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "books", description = "Books of the collection, registered by hand or imported")
@RestController
@RequestMapping("/books")
class BookController {

    private final BookService service;

    BookController(BookService service) {
        this.service = service;
    }

    @Operation(
            operationId = "createBook",
            summary = "Registers a book",
            description = "Duplicated ISBN-13: 409 book.isbn-duplicated, with bookId pointing to the book that"
                    + " already has it.")
    @PostMapping
    ResponseEntity<BookDetailResponse> create(@Valid @RequestBody BookRequest request) {
        BookDetailResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/v1/books/" + created.id()))
                .body(created);
    }

    @Operation(operationId = "getBook", summary = "The book page, without readings and review")
    @GetMapping("/{id}")
    BookDetailResponse get(@PathVariable long id) {
        return service.get(id);
    }

    @Operation(operationId = "updateBook", summary = "Replaces the book's data")
    @PutMapping("/{id}")
    BookDetailResponse update(@PathVariable long id, @Valid @RequestBody BookRequest request) {
        return service.update(id, request);
    }

    @Operation(operationId = "deleteBook", summary = "Deletes the book and sends its images to the trash")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "favoriteBook", summary = "Marks the book as a favorite")
    @PutMapping("/{id}/favorite")
    ResponseEntity<Void> favorite(@PathVariable long id) {
        service.markFavorite(id, true);
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "unfavoriteBook")
    @DeleteMapping("/{id}/favorite")
    ResponseEntity<Void> unfavorite(@PathVariable long id) {
        service.markFavorite(id, false);
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "changeBookOwnership", summary = "OWNED, WISHLIST or NONE")
    @PutMapping("/{id}/ownership")
    ResponseEntity<Void> changeOwnership(@PathVariable long id, @Valid @RequestBody OwnershipRequest request) {
        service.changeOwnership(id, request.ownership());
        return ResponseEntity.noContent().build();
    }

    @Operation(
            operationId = "replaceBookCover",
            summary = "Sends the cover",
            description = "JPEG, PNG or WebP up to 5 MB. The previous cover goes to the trash.")
    @PutMapping(path = "/{id}/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    CoverResponse replaceCover(@PathVariable long id, @RequestPart("file") MultipartFile file) {
        return service.replaceCover(id, UploadedFile.bytesOf(file));
    }

    @Operation(operationId = "removeBookCover")
    @DeleteMapping("/{id}/cover")
    ResponseEntity<Void> removeCover(@PathVariable long id) {
        service.removeCover(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(operationId = "replaceBookBanner", summary = "Sends the banner of the book page")
    @PutMapping(path = "/{id}/banner", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    BannerResponse replaceBanner(@PathVariable long id, @RequestPart("file") MultipartFile file) {
        return service.replaceBanner(id, UploadedFile.bytesOf(file));
    }

    @Operation(operationId = "removeBookBanner")
    @DeleteMapping("/{id}/banner")
    ResponseEntity<Void> removeBanner(@PathVariable long id) {
        service.removeBanner(id);
        return ResponseEntity.noContent().build();
    }
}
