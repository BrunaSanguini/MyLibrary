package io.github.brunasanguini.minhalivraria.openlibrary.client;

import io.github.brunasanguini.minhalivraria.openlibrary.OpenLibraryAuthor;
import io.github.brunasanguini.minhalivraria.openlibrary.OpenLibraryBook;
import io.github.brunasanguini.minhalivraria.openlibrary.OpenLibraryCandidate;
import io.github.brunasanguini.minhalivraria.shared.error.BadGatewayException;
import io.github.brunasanguini.minhalivraria.shared.validation.Isbns;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Predicate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * Anti-corruption layer: turns the JSON shapes of the Open Library into the records the rest of the application
 * uses, solving the inconsistencies of the API on the way (ADR-0004).
 */
public final class OpenLibraryMapper {

    private static final Pattern YEAR = Pattern.compile("(?<!\\d)(\\d{4})(?!\\d)");
    private static final Pattern LANGUAGE = Pattern.compile("[a-z]{3}");
    private static final int LAST_YEAR = 2999;

    private OpenLibraryMapper() {}

    /**
     * @param work the work of the edition, when it was fetched: it lends its description to an edition without one
     * @param authors the authors of the edition, already resolved to their names
     * @throws BadGatewayException {@code openlibrary.bad-response}, when the edition has no key or no title
     */
    public static OpenLibraryBook toBook(
            EditionResponse edition, @Nullable WorkResponse work, List<OpenLibraryAuthor> authors) {
        String editionKey = idOf(edition.key());
        String title = blankToNull(edition.title());
        if (editionKey == null || title == null) {
            throw new BadGatewayException("openlibrary.bad-response");
        }
        String description = text(edition.description());
        if (description == null && work != null) {
            description = text(work.description());
        }
        return new OpenLibraryBook(
                editionKey,
                workKeyOf(edition),
                title,
                blankToNull(edition.subtitle()),
                List.copyOf(authors),
                first(edition.publishers()),
                positive(edition.numberOfPages()),
                isbn(edition.isbn13(), Isbns::isValid13),
                isbn(edition.isbn10(), Isbns::isValid10),
                year(edition.publishDate()),
                languageCode(edition.languages()),
                description,
                coverId(edition.covers()));
    }

    /** Works without an edition to import, or without a title, are left out. */
    public static List<OpenLibraryCandidate> toCandidates(SearchResponse response) {
        List<OpenLibraryCandidate> candidates = new ArrayList<>();
        for (SearchResponse.Work work : orEmpty(response.docs())) {
            OpenLibraryCandidate candidate = toCandidate(work);
            if (candidate != null) {
                candidates.add(candidate);
            }
        }
        return List.copyOf(candidates);
    }

    /** {@code /works/OL27448W} of the edition, as {@code OL27448W}. */
    public static @Nullable String workKeyOf(EditionResponse edition) {
        return orEmpty(edition.works()).stream()
                .map(reference -> idOf(reference.key()))
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    /** The authors of the edition or, when it names none, the authors of its work. */
    public static List<String> authorKeysOf(EditionResponse edition, @Nullable WorkResponse work) {
        List<String> ofEdition = keys(orEmpty(edition.authors()));
        if (!ofEdition.isEmpty() || work == null) {
            return ofEdition;
        }
        return keys(orEmpty(work.authors()).stream()
                .map(WorkResponse.AuthorRole::author)
                .filter(Objects::nonNull)
                .toList());
    }

    /** The name of an author, or null when the record has none. */
    public static @Nullable String nameOf(AuthorResponse author) {
        String name = blankToNull(author.name());
        return name != null ? name : blankToNull(author.personalName());
    }

    /** The description is plain text in some records and {@code { "type", "value" }} in others. */
    static @Nullable String text(@Nullable Object description) {
        return switch (description) {
            case String plain -> blankToNull(plain);
            case Map<?, ?> typed when typed.get("value") instanceof String value -> blankToNull(value);
            case null, default -> null;
        };
    }

    /** The date is free text: {@code "1954"}, {@code "July 29, 1954"} and {@code "2019-07-15"} all become a year. */
    static @Nullable Short year(@Nullable String publishDate) {
        if (publishDate == null) {
            return null;
        }
        Matcher matcher = YEAR.matcher(publishDate);
        while (matcher.find()) {
            int year = Integer.parseInt(matcher.group(1));
            if (year >= 1 && year <= LAST_YEAR) {
                return (short) year;
            }
        }
        return null;
    }

    /** {@code /languages/por} becomes {@code por}. */
    static @Nullable String languageCode(@Nullable List<KeyReference> languages) {
        return orEmpty(languages).stream()
                .map(reference -> idOf(reference.key()))
                .filter(code -> code != null && LANGUAGE.matcher(code).matches())
                .findFirst()
                .orElse(null);
    }

    /** The last part of a key: {@code /books/OL51694024M} becomes {@code OL51694024M}. */
    static @Nullable String idOf(@Nullable String key) {
        if (key == null) {
            return null;
        }
        return blankToNull(key.substring(key.lastIndexOf('/') + 1));
    }

    private static @Nullable OpenLibraryCandidate toCandidate(SearchResponse.Work work) {
        SearchResponse.Edition edition = work.editions() == null
                ? null
                : orEmpty(work.editions().docs()).stream().findFirst().orElse(null);
        String editionKey = edition == null ? null : idOf(edition.key());
        if (editionKey == null) {
            editionKey = idOf(work.coverEditionKey());
        }
        String title = edition == null ? null : blankToNull(edition.title());
        if (title == null) {
            title = blankToNull(work.title());
        }
        if (editionKey == null || title == null) {
            return null;
        }
        Short publishedYear = edition == null ? null : year(first(edition.publishDates()));
        if (publishedYear == null && work.firstPublishYear() != null) {
            publishedYear = year(String.valueOf(work.firstPublishYear()));
        }
        Long coverId = edition == null ? null : validCover(edition.coverId());
        if (coverId == null) {
            coverId = validCover(work.coverId());
        }
        return new OpenLibraryCandidate(
                editionKey,
                idOf(work.key()),
                title,
                orEmpty(work.authorNames()).stream()
                        .filter(name -> !name.isBlank())
                        .toList(),
                publishedYear,
                coverId);
    }

    private static List<String> keys(List<KeyReference> references) {
        return references.stream()
                .map(reference -> idOf(reference.key()))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private static @Nullable String isbn(@Nullable List<String> values, Predicate<String> valid) {
        return orEmpty(values).stream()
                .map(Isbns::compact)
                .filter(compact -> compact != null && valid.test(compact))
                .findFirst()
                .orElse(null);
    }

    private static @Nullable Long coverId(@Nullable List<@Nullable Long> covers) {
        if (covers == null) {
            return null;
        }
        for (Long cover : covers) {
            if (validCover(cover) != null) {
                return cover;
            }
        }
        return null;
    }

    private static @Nullable Long validCover(@Nullable Long coverId) {
        return coverId != null && coverId > 0 ? coverId : null;
    }

    private static @Nullable Integer positive(@Nullable Integer value) {
        return value != null && value > 0 ? value : null;
    }

    private static @Nullable String first(@Nullable List<String> values) {
        return orEmpty(values).stream()
                .map(OpenLibraryMapper::blankToNull)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private static <T> List<T> orEmpty(@Nullable List<T> values) {
        return values == null ? List.of() : values;
    }

    private static @Nullable String blankToNull(@Nullable String value) {
        if (value == null) {
            return null;
        }
        String stripped = value.strip();
        return stripped.isEmpty() ? null : stripped;
    }
}
