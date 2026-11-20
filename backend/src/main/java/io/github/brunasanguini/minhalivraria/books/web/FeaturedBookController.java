package io.github.brunasanguini.minhalivraria.books.web;

import io.github.brunasanguini.minhalivraria.books.application.FeaturedBookResponse;
import io.github.brunasanguini.minhalivraria.books.application.FeaturedBookService;
import io.github.brunasanguini.minhalivraria.books.application.FeaturedBooksRequest;
import io.github.brunasanguini.minhalivraria.shared.web.UploadedFile;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "books")
@RestController
@RequestMapping("/featured")
class FeaturedBookController {

    private final FeaturedBookService service;

    FeaturedBookController(FeaturedBookService service) {
        this.service = service;
    }

    @Operation(operationId = "listFeaturedBooks", summary = "The books featured on the Home, in order")
    @GetMapping
    List<FeaturedBookResponse> list() {
        return service.list();
    }

    @Operation(
            operationId = "replaceFeaturedBooks",
            summary = "Replaces the books featured on the Home",
            description = "One to three books of the collection, each once: 422 featured.duplicated-book or"
                    + " featured.book-not-owned. imageFrom keeps the image a slot had before the change; without it"
                    + " the slot has no image until one is sent.")
    @PutMapping
    List<FeaturedBookResponse> replace(@Valid @RequestBody FeaturedBooksRequest request) {
        return service.replace(request);
    }

    @Operation(operationId = "replaceFeaturedImage", summary = "Sends the image of a featured book")
    @PutMapping(path = "/{slot}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    FeaturedBookResponse replaceImage(@PathVariable int slot, @RequestPart("file") MultipartFile file) {
        return service.replaceImage(slot, UploadedFile.bytesOf(file));
    }
}
