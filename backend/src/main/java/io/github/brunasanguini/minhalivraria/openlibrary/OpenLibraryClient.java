package io.github.brunasanguini.minhalivraria.openlibrary;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.brunasanguini.minhalivraria.openlibrary.client.EditionResponse;
import io.github.brunasanguini.minhalivraria.openlibrary.client.OpenLibraryGateway;
import io.github.brunasanguini.minhalivraria.openlibrary.client.OpenLibraryMapper;
import io.github.brunasanguini.minhalivraria.openlibrary.client.WorkResponse;
import io.github.brunasanguini.minhalivraria.shared.config.AppProperties;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.text.TextNormalizer;
import io.github.brunasanguini.minhalivraria.shared.validation.Isbns;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Public API of the module: searches the Open Library and reads its editions, already converted to our records.
 *
 * <p>Answers stay in memory for one hour, so confirming an import reuses what its preview fetched. Failures are
 * reported with the {@code openlibrary.*} errors of docs/erros.md:
 *
 * <ul>
 *   <li>{@link NotFoundException} {@code openlibrary.not-found}: the ISBN or the edition does not exist there
 *   <li>{@link io.github.brunasanguini.minhalivraria.shared.error.BadGatewayException} {@code
 *       openlibrary.bad-response}: it answered with an error or with data that cannot be read
 *   <li>{@link io.github.brunasanguini.minhalivraria.shared.error.ServiceUnavailableException} {@code
 *       openlibrary.unavailable}: there is no connection
 *   <li>{@link io.github.brunasanguini.minhalivraria.shared.error.GatewayTimeoutException} {@code
 *       openlibrary.timeout}: it did not answer in time
 * </ul>
 */
@Component
public class OpenLibraryClient {

    private static final int SEARCH_LIMIT = 20;
    private static final int MAX_AUTHORS = 10;
    private static final Duration CACHE_TIME = Duration.ofHours(1);
    private static final int CACHE_SIZE = 500;
    private static final Pattern EDITION_KEY = Pattern.compile("OL\\d{1,20}M");

    private final OpenLibraryGateway gateway;
    private final String coversUrl;

    private final Cache<String, List<OpenLibraryCandidate>> searches = cache();
    private final Cache<String, OpenLibraryBook> editions = cache();
    private final Cache<String, String> editionKeysByIsbn = cache();
    private final Cache<String, Optional<OpenLibraryAuthor>> authors = cache();

    public OpenLibraryClient(OpenLibraryGateway gateway, AppProperties properties) {
        this.gateway = gateway;
        this.coversUrl = withoutTrailingSlash(properties.openLibrary().coversUrl().toString());
    }

    /** Up to 20 books whose title or author matches the text. */
    public List<OpenLibraryCandidate> search(String query) {
        String normalized = TextNormalizer.normalize(query);
        if (normalized.isEmpty()) {
            return List.of();
        }
        return searches.get(
                normalized, term -> OpenLibraryMapper.toCandidates(gateway.search(query.strip(), SEARCH_LIMIT)));
    }

    /**
     * The edition with this ISBN-10 or ISBN-13, with or without hyphens.
     *
     * @throws NotFoundException {@code openlibrary.not-found}, also when the text is not a valid ISBN
     */
    public OpenLibraryBook findByIsbn(String isbn) {
        String compact = Isbns.compact(isbn);
        if (compact == null || !(Isbns.isValid13(compact) || Isbns.isValid10(compact))) {
            throw new NotFoundException("openlibrary.not-found");
        }
        String editionKey = editionKeysByIsbn.get(compact, number -> {
            OpenLibraryBook book = assemble(gateway.findEditionByIsbn(number));
            editions.put(book.editionKey(), book);
            return book.editionKey();
        });
        return findEdition(editionKey);
    }

    /**
     * The edition with this key, such as {@code OL51694024M}.
     *
     * @throws NotFoundException {@code openlibrary.not-found}, also when the text is not an edition key
     */
    public OpenLibraryBook findEdition(String editionKey) {
        if (!EDITION_KEY.matcher(editionKey).matches()) {
            throw new NotFoundException("openlibrary.not-found");
        }
        return editions.get(editionKey, key -> assemble(gateway.findEdition(key)));
    }

    /** The image of a cover, or empty when the Open Library has no cover with this id. */
    public Optional<byte[]> downloadCover(long coverId) {
        return gateway.downloadCover(coverId);
    }

    /** Address of the medium cover at the Open Library, for a preview to show before anything is saved. */
    public String coverUrl(long coverId) {
        return coversUrl + "/b/id/" + coverId + "-M.jpg";
    }

    /** An edition rarely brings everything: the work lends the description and, sometimes, the authors. */
    private OpenLibraryBook assemble(EditionResponse edition) {
        String workKey = OpenLibraryMapper.workKeyOf(edition);
        boolean needsWork = edition.description() == null
                || edition.authors() == null
                || edition.authors().isEmpty();
        WorkResponse work = needsWork && workKey != null ? gateway.findWork(workKey) : null;
        List<OpenLibraryAuthor> found = new ArrayList<>();
        for (String authorKey : OpenLibraryMapper.authorKeysOf(edition, work)) {
            if (found.size() == MAX_AUTHORS) {
                break;
            }
            author(authorKey).ifPresent(found::add);
        }
        return OpenLibraryMapper.toBook(edition, work, found);
    }

    private Optional<OpenLibraryAuthor> author(String authorKey) {
        return authors.get(authorKey, key -> {
            String name = OpenLibraryMapper.nameOf(gateway.findAuthor(key));
            return Optional.ofNullable(name).map(found -> new OpenLibraryAuthor(key, found));
        });
    }

    private static <V> Cache<String, V> cache() {
        return Caffeine.newBuilder()
                .expireAfterWrite(CACHE_TIME)
                .maximumSize(CACHE_SIZE)
                .build();
    }

    private static String withoutTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    /** For tests that need every call to reach the Open Library again. */
    void forgetEverything() {
        searches.invalidateAll();
        editions.invalidateAll();
        editionKeysByIsbn.invalidateAll();
        authors.invalidateAll();
    }
}
