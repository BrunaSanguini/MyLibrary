package io.github.brunasanguini.minhalivraria.shared.backup;

import org.flywaydb.core.api.MigrationInfoService;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class BackupConfiguration {

    /**
     * Backs up before migrating, but only an existing database with pending migrations: a brand-new database has
     * nothing to protect.
     */
    @Bean
    FlywayMigrationStrategy backupBeforeMigrate(DatabaseBackup backup) {
        return flyway -> {
            MigrationInfoService info = flyway.info();
            if (info.applied().length > 0 && info.pending().length > 0) {
                backup.create();
            }
            flyway.migrate();
        };
    }
}
