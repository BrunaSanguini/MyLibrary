package io.github.brunasanguini.minhalivraria.shared.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import java.time.Instant;
import org.jspecify.annotations.Nullable;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Audit columns of every table (docs/modelo-de-dados.md), filled by Spring Data when the entity is saved. */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class AuditedEntity {

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private @Nullable Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private @Nullable Instant updatedAt;

    /** Null only before the entity is saved for the first time. */
    public @Nullable Instant createdAt() {
        return createdAt;
    }

    /** Null only before the entity is saved for the first time. */
    public @Nullable Instant updatedAt() {
        return updatedAt;
    }
}
