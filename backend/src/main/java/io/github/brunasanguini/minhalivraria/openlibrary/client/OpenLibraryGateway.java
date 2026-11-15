package io.github.brunasanguini.minhalivraria.openlibrary.client;

import io.github.brunasanguini.minhalivraria.shared.error.BadGatewayException;
import io.github.brunasanguini.minhalivraria.shared.error.GatewayTimeoutException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import io.github.brunasanguini.minhalivraria.shared.error.ServiceUnavailableException;
import java.net.SocketTimeoutException;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpTimeoutException;
import java.util.Optional;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.resilience.annotation.Retryable;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Every call to the Open Library goes through here, and so gets the same treatment: the rate limit, two new
 * attempts when the failure may be temporary, and the conversion of HTTP failures into the {@code openlibrary.*}
 * errors of docs/erros.md.
 *
 * <p>Timeouts and error answers (5xx and 429) are tried again; a missing record or a missing connection is not,
 * because trying again would not change the answer.
 */
public class OpenLibraryGateway {

    /** Only what a search result shows, with the edition that best matches the search in each work. */
    static final String SEARCH_FIELDS = "key,title,author_name,first_publish_year,cover_i,cover_edition_key,"
            + "editions,editions.key,editions.title,editions.cover_i,editions.publish_date";

    /** Makes the Open Library prefer editions in Portuguese when it picks the edition of each work. */
    static final String PREFERRED_LANGUAGE = "pt";

    private static final Logger log = LoggerFactory.getLogger(OpenLibraryGateway.class);
    private static final int NEW_ATTEMPTS = 2;
    private static final long FIRST_WAIT_MILLIS = 300;
    private static final double WAIT_GROWTH = 2;

    private final OpenLibraryApi api;
    private final RestClient covers;
    private final RateLimiter limiter;

    public OpenLibraryGateway(OpenLibraryApi api, RestClient covers, RateLimiter limiter) {
        this.api = api;
        this.covers = covers;
        this.limiter = limiter;
    }

    @Retryable(
            includes = {BadGatewayException.class, GatewayTimeoutException.class},
            maxRetries = NEW_ATTEMPTS,
            delay = FIRST_WAIT_MILLIS,
            multiplier = WAIT_GROWTH)
    public SearchResponse search(String query, int limit) {
        return call(() -> api.search(query, SEARCH_FIELDS, PREFERRED_LANGUAGE, limit));
    }

    @Retryable(
            includes = {BadGatewayException.class, GatewayTimeoutException.class},
            maxRetries = NEW_ATTEMPTS,
            delay = FIRST_WAIT_MILLIS,
            multiplier = WAIT_GROWTH)
    public EditionResponse findEditionByIsbn(String isbn) {
        return call(() -> api.findEditionByIsbn(isbn));
    }

    @Retryable(
            includes = {BadGatewayException.class, GatewayTimeoutException.class},
            maxRetries = NEW_ATTEMPTS,
            delay = FIRST_WAIT_MILLIS,
            multiplier = WAIT_GROWTH)
    public EditionResponse findEdition(String editionId) {
        return call(() -> api.findEdition(editionId));
    }

    @Retryable(
            includes = {BadGatewayException.class, GatewayTimeoutException.class},
            maxRetries = NEW_ATTEMPTS,
            delay = FIRST_WAIT_MILLIS,
            multiplier = WAIT_GROWTH)
    public WorkResponse findWork(String workId) {
        return call(() -> api.findWork(workId));
    }

    @Retryable(
            includes = {BadGatewayException.class, GatewayTimeoutException.class},
            maxRetries = NEW_ATTEMPTS,
            delay = FIRST_WAIT_MILLIS,
            multiplier = WAIT_GROWTH)
    public AuthorResponse findAuthor(String authorId) {
        return call(() -> api.findAuthor(authorId));
    }

    /**
     * The large cover, always by cover id: by ISBN the Open Library allows only 100 requests every 5 minutes.
     * {@code default=false} makes a missing cover answer 404 instead of a blank image.
     *
     * @return the image, or empty when the Open Library has no cover with this id
     */
    @Retryable(
            includes = {BadGatewayException.class, GatewayTimeoutException.class},
            maxRetries = NEW_ATTEMPTS,
            delay = FIRST_WAIT_MILLIS,
            multiplier = WAIT_GROWTH)
    public Optional<byte[]> downloadCover(long coverId) {
        try {
            return call(() -> Optional.ofNullable(covers.get()
                    .uri("/b/id/{coverId}-L.jpg?default=false", coverId)
                    .retrieve()
                    .body(byte[].class)));
        } catch (NotFoundException missing) {
            return Optional.empty();
        }
    }

    private <T> T call(Supplier<T> request) {
        limiter.acquire();
        try {
            return request.get();
        } catch (RestClientResponseException answered) {
            if (answered.getStatusCode().value() == HttpStatus.NOT_FOUND.value()) {
                throw new NotFoundException("openlibrary.not-found");
            }
            log.warn("The Open Library answered {}", answered.getStatusCode());
            throw new BadGatewayException("openlibrary.bad-response");
        } catch (ResourceAccessException unreachable) {
            log.warn("The Open Library could not be reached: {}", unreachable.getMessage());
            if (timedOut(unreachable)) {
                throw new GatewayTimeoutException("openlibrary.timeout");
            }
            throw new ServiceUnavailableException("openlibrary.unavailable");
        } catch (RestClientException unreadable) {
            log.warn("The Open Library sent an answer that could not be read: {}", unreadable.getMessage());
            throw new BadGatewayException("openlibrary.bad-response");
        }
    }

    /** Not managing to connect in time means there is no connection; only a silent server is a timeout. */
    private static boolean timedOut(Throwable failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof HttpConnectTimeoutException) {
                return false;
            }
            if (cause instanceof HttpTimeoutException || cause instanceof SocketTimeoutException) {
                return true;
            }
        }
        return false;
    }
}
