package io.github.brunasanguini.minhalivraria.openlibrary.client;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.HttpExchange;

/** The Open Library endpoints the application uses. Base URL, timeouts and User-Agent come from the group. */
@HttpExchange(accept = "application/json")
public interface OpenLibraryApi {

    @GetExchange("/search.json")
    SearchResponse search(
            @RequestParam("q") String query,
            @RequestParam("fields") String fields,
            @RequestParam("lang") String language,
            @RequestParam("limit") int limit);

    /** Answers with a redirect to the edition, which the HTTP client follows. */
    @GetExchange("/isbn/{isbn}.json")
    EditionResponse findEditionByIsbn(@PathVariable("isbn") String isbn);

    @GetExchange("/books/{editionId}.json")
    EditionResponse findEdition(@PathVariable("editionId") String editionId);

    @GetExchange("/works/{workId}.json")
    WorkResponse findWork(@PathVariable("workId") String workId);

    @GetExchange("/authors/{authorId}.json")
    AuthorResponse findAuthor(@PathVariable("authorId") String authorId);
}
