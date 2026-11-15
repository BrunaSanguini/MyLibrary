package io.github.brunasanguini.minhalivraria.shared.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.net.URI;
import java.nio.file.Path;
import java.time.Duration;
import org.jspecify.annotations.Nullable;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;
import org.springframework.validation.annotation.Validated;

/**
 * Typed application settings under the {@code app} prefix.
 *
 * @param dataDir folder that holds the database, images, backups and logs
 * @param openLibrary where and how the Open Library is reached
 * @param images image storage settings
 * @param backup database backup settings
 * @param shutdownToken token the My Collection hub must send to shut the app down; blank disables shutdown
 */
@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @NotNull Path dataDir,
        @NotNull @Valid OpenLibrary openLibrary,
        @NotNull @Valid Images images,
        @NotNull @Valid Backup backup,
        @Nullable String shutdownToken) {

    /**
     * @param baseUrl address of the API, such as {@code https://openlibrary.org}
     * @param coversUrl address of the covers, such as {@code https://covers.openlibrary.org}
     * @param contact e-mail sent in the {@code User-Agent}; it comes from the local config.yml and never from the
     *     repository. With a contact the Open Library allows 3 requests per second, without it only 1
     * @param connectTimeout how long to wait for the connection
     * @param readTimeout how long to wait for the answer
     */
    public record OpenLibrary(
            @NotNull URI baseUrl,
            @NotNull URI coversUrl,
            @Nullable String contact,
            @NotNull Duration connectTimeout,
            @NotNull Duration readTimeout) {

        public boolean hasContact() {
            return contact != null && !contact.isBlank();
        }
    }

    /**
     * @param maxSize largest accepted image
     * @param trashRetention how long discarded images stay in the trash before being deleted
     */
    public record Images(@NotNull DataSize maxSize, @NotNull Duration trashRetention) {}

    /** @param keep how many copies of each backup type are kept */
    public record Backup(@Positive int keep) {}

    public boolean shutdownEnabled() {
        return shutdownToken != null && !shutdownToken.isBlank();
    }
}
