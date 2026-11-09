package io.github.brunasanguini.minhalivraria.shared.backup;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.brunasanguini.minhalivraria.shared.config.AppProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import javax.sql.DataSource;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.util.unit.DataSize;

class DatabaseBackupTest {

    @TempDir
    Path dataDir;

    @Test
    void shouldCreateBinaryAndSqlBackups() throws SQLException {
        DataSource database = fileDatabase();
        execute(database, "CREATE TABLE note (id INT PRIMARY KEY)");

        backupAt(database, "2026-11-09T10:00:00Z", 5).create();

        assertThat(dataDir.resolve("backups/minha-livraria-20261109-100000.zip"))
                .isRegularFile();
        assertThat(dataDir.resolve("backups/minha-livraria-20261109-100000.sql.zip"))
                .isRegularFile();
    }

    @Test
    void shouldRestoreTheDataFromTheSqlBackup() throws SQLException {
        DataSource database = fileDatabase();
        execute(database, "CREATE TABLE note (id INT PRIMARY KEY, title VARCHAR(50))");
        execute(database, "INSERT INTO note VALUES (1, 'Dom Casmurro')");
        backupAt(database, "2026-11-09T10:00:00Z", 5).create();

        DataSource restored = memoryDatabase();
        Path script = dataDir.resolve("backups/minha-livraria-20261109-100000.sql.zip");
        execute(restored, "RUNSCRIPT FROM '" + script + "' COMPRESSION ZIP");

        assertThat(queryTitle(restored)).isEqualTo("Dom Casmurro");
    }

    @Test
    void shouldKeepOnlyTheConfiguredNumberOfCopies() throws SQLException, IOException {
        DataSource database = fileDatabase();
        execute(database, "CREATE TABLE note (id INT PRIMARY KEY)");

        for (String instant : List.of("2026-11-09T10:00:00Z", "2026-11-09T11:00:00Z", "2026-11-09T12:00:00Z")) {
            backupAt(database, instant, 2).create();
        }

        try (Stream<Path> files = Files.list(dataDir.resolve("backups"))) {
            assertThat(files.map(file -> file.getFileName().toString()))
                    .containsExactlyInAnyOrder(
                            "minha-livraria-20261109-110000.zip",
                            "minha-livraria-20261109-120000.zip",
                            "minha-livraria-20261109-110000.sql.zip",
                            "minha-livraria-20261109-120000.sql.zip");
        }
    }

    @Test
    void shouldSkipInMemoryDatabases() {
        backupAt(memoryDatabase(), "2026-11-09T10:00:00Z", 5).create();

        assertThat(dataDir.resolve("backups")).doesNotExist();
    }

    private DatabaseBackup backupAt(DataSource database, String instant, int keep) {
        AppProperties properties = new AppProperties(
                dataDir,
                new AppProperties.Images(DataSize.ofMegabytes(5), Duration.ofDays(30)),
                new AppProperties.Backup(keep),
                null);
        Clock clock = Clock.fixed(Instant.parse(instant), ZoneOffset.UTC);
        return new DatabaseBackup(database, properties, clock);
    }

    private DataSource fileDatabase() {
        JdbcDataSource database = new JdbcDataSource();
        database.setURL("jdbc:h2:file:" + dataDir.resolve("data/test").toAbsolutePath());
        return database;
    }

    private static DataSource memoryDatabase() {
        JdbcDataSource database = new JdbcDataSource();
        database.setURL("jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1");
        return database;
    }

    private static void execute(DataSource database, String sql) throws SQLException {
        try (Connection connection = database.getConnection();
                Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private static String queryTitle(DataSource database) throws SQLException {
        try (Connection connection = database.getConnection();
                Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery("SELECT title FROM note WHERE id = 1")) {
            assertThat(result.next()).isTrue();
            return result.getString("title");
        }
    }
}
