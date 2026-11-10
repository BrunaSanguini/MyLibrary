package io.github.brunasanguini.minhalivraria.images.domain;

import io.github.brunasanguini.minhalivraria.images.ImageKind;
import io.github.brunasanguini.minhalivraria.shared.persistence.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.util.Objects;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.jspecify.annotations.Nullable;

/** An image file saved under images/{kind}/{fileName}. Never changes after it is saved. */
@Entity
public class Image extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private @Nullable Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 8)
    private ImageKind kind;

    @Column(name = "file_name", nullable = false, updatable = false, length = 100)
    private String fileName;

    @Column(name = "content_type", nullable = false, updatable = false, length = 20)
    private String contentType;

    @Column(name = "size_bytes", nullable = false, updatable = false)
    private int sizeBytes;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, updatable = false, length = 64)
    private String sha256;

    public Image(ImageKind kind, String fileName, ImageFormat format, int sizeBytes, String sha256) {
        this.kind = kind;
        this.fileName = fileName;
        this.contentType = format.contentType();
        this.sizeBytes = sizeBytes;
        this.sha256 = sha256;
    }

    /** For JPA only. */
    @SuppressWarnings("NullAway.Init")
    protected Image() {}

    /** Available once the image is saved. */
    public long id() {
        return Objects.requireNonNull(id, "Image not saved yet");
    }

    public ImageKind kind() {
        return kind;
    }

    public String fileName() {
        return fileName;
    }

    public String contentType() {
        return contentType;
    }

    public int sizeBytes() {
        return sizeBytes;
    }

    public String sha256() {
        return sha256;
    }
}
