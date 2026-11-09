package io.github.brunasanguini.minhalivraria.shared.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.nio.file.Path;
import org.jspecify.annotations.Nullable;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Typed application settings under the {@code app} prefix.
 *
 * @param dataDir folder that holds the database, images, backups and logs
 * @param backup database backup settings
 * @param shutdownToken token the My Collection hub must send to shut the app down; blank disables shutdown
 */
@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(@NotNull Path dataDir, @NotNull @Valid Backup backup, @Nullable String shutdownToken) {

    /** @param keep how many copies of each backup type are kept */
    public record Backup(@Positive int keep) {}

    public boolean shutdownEnabled() {
        return shutdownToken != null && !shutdownToken.isBlank();
    }
}
