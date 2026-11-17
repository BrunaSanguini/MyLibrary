package io.github.brunasanguini.minhalivraria.profile.domain;

import io.github.brunasanguini.minhalivraria.profile.ProfileTheme;
import io.github.brunasanguini.minhalivraria.shared.persistence.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import org.jspecify.annotations.Nullable;

/** The single profile of the library, the row with id 1 that the first migration creates. */
@Entity
public class Profile extends AuditedEntity {

    /** The only id the table accepts. */
    public static final short SINGLE_ROW_ID = 1;

    @Id
    private short id;

    @Column(name = "display_name", length = 80)
    private @Nullable String displayName;

    @Column(name = "avatar_image_id")
    private @Nullable Long avatarImageId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 6)
    private ProfileTheme theme;

    /** For JPA only. */
    @SuppressWarnings("NullAway.Init")
    protected Profile() {}

    /** @param displayName blank means no name, and the app greets without one */
    public void update(@Nullable String displayName, ProfileTheme theme) {
        this.displayName = displayName == null || displayName.isBlank() ? null : displayName.strip();
        this.theme = theme;
    }

    /** @return the avatar it had, which is no longer used */
    public @Nullable Long replaceAvatar(@Nullable Long imageId) {
        Long previous = avatarImageId;
        avatarImageId = imageId;
        return previous;
    }

    public @Nullable String displayName() {
        return displayName;
    }

    public @Nullable Long avatarImageId() {
        return avatarImageId;
    }

    public ProfileTheme theme() {
        return theme;
    }
}
