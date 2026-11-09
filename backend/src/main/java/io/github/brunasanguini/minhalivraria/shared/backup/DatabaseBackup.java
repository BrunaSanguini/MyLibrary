package io.github.brunasanguini.minhalivraria.shared.backup;

import io.github.brunasanguini.minhalivraria.shared.config.AppProperties;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Backs up the H2 database before pending migrations are applied (ADR-0001, ADR-0004).
 *
 * <ul>
 *   <li>{@code BACKUP TO}: binary copy, consistent even with the database open, for a quick restore.
 *   <li>{@code SCRIPT TO}: compressed SQL export, restorable with {@code RUNSCRIPT} on an H2 version whose file
 *       format changed.
 * </ul>
 *
 * Only the most recent {@code app.backup.keep} copies of each kind are kept.
 */
@Component
public class DatabaseBackup {

    private static final Logger log = LoggerFactory.getLogger(DatabaseBackup.class);
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");
    private static final String PREFIX = "minha-livraria-";
    private static final String BINARY_SUFFIX = ".zip";
    private static final String SCRIPT_SUFFIX = ".sql.zip";

    private final DataSource dataSource;
    private final AppProperties properties;
    private final Clock clock;

    public DatabaseBackup(DataSource dataSource, AppProperties properties, Clock clock) {
        this.dataSource = dataSource;
        this.properties = properties;
        this.clock = clock;
    }

    public void create() {
        try (Connection connection = dataSource.getConnection();
                Statement statement = connection.createStatement()) {
            if (connection.getMetaData().getURL().startsWith("jdbc:h2:mem:")) {
                log.debug("In-memory database: backup skipped");
                return;
            }
            Path directory = Files.createDirectories(properties.dataDir().resolve("backups"));
            String stamp = LocalDateTime.now(clock).format(STAMP);
            Path binary = directory.resolve(PREFIX + stamp + BINARY_SUFFIX);
            Path script = directory.resolve(PREFIX + stamp + SCRIPT_SUFFIX);

            statement.execute("BACKUP TO " + sqlString(binary));
            statement.execute("SCRIPT TO " + sqlString(script) + " COMPRESSION ZIP");
            log.info("Database backed up to {} and {}", binary, script);

            prune(directory, SCRIPT_SUFFIX);
            prune(directory, BINARY_SUFFIX);
        } catch (SQLException exception) {
            throw new IllegalStateException("Could not back up the database before migrating", exception);
        } catch (IOException exception) {
            throw new UncheckedIOException("Could not create the backup folder", exception);
        }
    }

    /** Deletes the oldest copies of one kind, keeping {@code app.backup.keep}. Names sort by date. */
    private void prune(Path directory, String suffix) throws IOException {
        List<Path> copies;
        try (Stream<Path> files = Files.list(directory)) {
            copies = files.filter(file -> isCopy(file, suffix))
                    .sorted(Comparator.comparing(Path::toString).reversed())
                    .toList();
        }
        for (Path old : copies.subList(Math.min(properties.backup().keep(), copies.size()), copies.size())) {
            Files.delete(old);
        }
    }

    private static boolean isCopy(Path file, String suffix) {
        String name = file.getFileName().toString();
        boolean isScript = name.endsWith(SCRIPT_SUFFIX);
        boolean sameKind = suffix.equals(SCRIPT_SUFFIX) ? isScript : !isScript && name.endsWith(BINARY_SUFFIX);
        return name.startsWith(PREFIX) && sameKind;
    }

    /** The path comes from configuration, never from a request; quotes are still escaped. */
    private static String sqlString(Path path) {
        return "'" + path.toString().replace("'", "''") + "'";
    }
}
