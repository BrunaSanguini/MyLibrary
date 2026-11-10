package io.github.brunasanguini.minhalivraria.books.domain;

import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.persistence.AuditedEntity;
import io.github.brunasanguini.minhalivraria.shared.text.TextNormalizer;
import io.github.brunasanguini.minhalivraria.shared.validation.Isbns;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.jspecify.annotations.Nullable;

/**
 * An edition of a book: its own data, the catalog it belongs to and the images on disk.
 *
 * <p>Two invariants live here, so no path can break them: {@code searchText} always matches title and subtitle, and
 * series and position are either both set or both null.
 */
@Entity
public class Book extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(length = 500)
    private @Nullable String subtitle;

    /** Fixed-width column, like every other CHAR of the schema. */
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(length = 13)
    private @Nullable String isbn13;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(length = 10)
    private @Nullable String isbn10;

    @Column(name = "page_count")
    private @Nullable Integer pageCount;

    @Column(name = "published_year")
    private @Nullable Short publishedYear;

    @Column(name = "language_code", length = 3)
    private @Nullable String languageCode;

    @Column(length = 10_000)
    private @Nullable String synopsis;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Ownership ownership;

    @Column(nullable = false)
    private boolean favorite;

    /** Normalized title and subtitle, used by the shelf search. */
    @Column(name = "search_text", nullable = false, length = 1001)
    private String searchText;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "book_author",
            joinColumns = @JoinColumn(name = "book_id"),
            inverseJoinColumns = @JoinColumn(name = "author_id"))
    @OrderColumn(name = "author_order")
    private List<Author> authors = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publisher_id")
    private @Nullable Publisher publisher;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "book_genre",
            joinColumns = @JoinColumn(name = "book_id"),
            inverseJoinColumns = @JoinColumn(name = "genre_id"))
    private Set<Genre> genres = new LinkedHashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "series_id")
    private @Nullable Series series;

    @Column(name = "series_position", precision = 4, scale = 1)
    private @Nullable BigDecimal seriesPosition;

    @Column(name = "cover_image_id")
    private @Nullable Long coverImageId;

    @Column(name = "banner_image_id")
    private @Nullable Long bannerImageId;

    @Column(name = "ol_work_key", length = 32)
    private @Nullable String olWorkKey;

    @Column(name = "ol_edition_key", length = 32)
    private @Nullable String olEditionKey;

    public Book(BookFields fields) {
        apply(fields);
    }

    /** For JPA only. */
    @SuppressWarnings("NullAway.Init")
    protected Book() {}

    public void update(BookFields fields) {
        apply(fields);
    }

    /** Keeps the order the authors are printed in. */
    public void assignAuthors(List<Author> authors) {
        this.authors = new ArrayList<>(authors);
    }

    public void assignPublisher(@Nullable Publisher publisher) {
        this.publisher = publisher;
    }

    public void assignGenres(Collection<Genre> genres) {
        this.genres = new LinkedHashSet<>(genres);
    }

    /**
     * Sets the series and the volume within it, or clears both.
     *
     * @throws BusinessRuleException {@code book.series-position-required}, when only one of them is given
     */
    public void assignSeries(@Nullable Series series, @Nullable BigDecimal position) {
        if ((series == null) != (position == null)) {
            throw new BusinessRuleException("book.series-position-required");
        }
        this.series = series;
        this.seriesPosition = position;
    }

    /** Clears the series of every book of a series being deleted, keeping the pair valid. */
    public void leaveSeries() {
        assignSeries(null, null);
    }

    public void markFavorite(boolean favorite) {
        this.favorite = favorite;
    }

    public void changeOwnership(Ownership ownership) {
        this.ownership = ownership;
    }

    /**
     * Points the cover at another image, or at none.
     *
     * @return the id of the image that is no longer used, for the caller to discard
     */
    public @Nullable Long replaceCover(@Nullable Long imageId) {
        Long previous = coverImageId;
        this.coverImageId = imageId;
        return Objects.equals(previous, imageId) ? null : previous;
    }

    /** Like {@link #replaceCover}, for the banner of the book page. */
    public @Nullable Long replaceBanner(@Nullable Long imageId) {
        Long previous = bannerImageId;
        this.bannerImageId = imageId;
        return Objects.equals(previous, imageId) ? null : previous;
    }

    /** Keys of the edition this book was imported from. */
    public void linkToOpenLibrary(@Nullable String workKey, @Nullable String editionKey) {
        this.olWorkKey = workKey;
        this.olEditionKey = editionKey;
    }

    public long id() {
        return Objects.requireNonNull(id, "Book not saved yet");
    }

    public String title() {
        return title;
    }

    public @Nullable String subtitle() {
        return subtitle;
    }

    public @Nullable String isbn13() {
        return isbn13;
    }

    public @Nullable String isbn10() {
        return isbn10;
    }

    public @Nullable Integer pageCount() {
        return pageCount;
    }

    public @Nullable Short publishedYear() {
        return publishedYear;
    }

    public @Nullable String languageCode() {
        return languageCode;
    }

    public @Nullable String synopsis() {
        return synopsis;
    }

    public Ownership ownership() {
        return ownership;
    }

    public boolean favorite() {
        return favorite;
    }

    public String searchText() {
        return searchText;
    }

    public List<Author> authors() {
        return List.copyOf(authors);
    }

    public @Nullable Publisher publisher() {
        return publisher;
    }

    public Set<Genre> genres() {
        return Set.copyOf(genres);
    }

    public @Nullable Series series() {
        return series;
    }

    public @Nullable BigDecimal seriesPosition() {
        return seriesPosition;
    }

    public @Nullable Long coverImageId() {
        return coverImageId;
    }

    public @Nullable Long bannerImageId() {
        return bannerImageId;
    }

    public @Nullable String olWorkKey() {
        return olWorkKey;
    }

    public @Nullable String olEditionKey() {
        return olEditionKey;
    }

    private void apply(BookFields fields) {
        this.title = fields.title().strip();
        this.subtitle = blankToNull(fields.subtitle());
        this.isbn13 = Isbns.compact(fields.isbn13());
        this.isbn10 = Isbns.compact(fields.isbn10());
        this.pageCount = fields.pageCount();
        this.publishedYear = fields.publishedYear();
        this.languageCode = blankToNull(fields.languageCode());
        this.synopsis = blankToNull(fields.synopsis());
        this.ownership = fields.ownership();
        this.favorite = fields.favorite();
        this.searchText = searchTextOf(this.title, this.subtitle);
    }

    /** "aneis sociedade do anel" finds the book whether the term matches the title or the subtitle. */
    private static String searchTextOf(String title, @Nullable String subtitle) {
        String both = subtitle == null ? title : title + " " + subtitle;
        return TextNormalizer.normalize(both);
    }

    private static @Nullable String blankToNull(@Nullable String value) {
        if (value == null) {
            return null;
        }
        String stripped = value.strip();
        return stripped.isEmpty() ? null : stripped;
    }
}
