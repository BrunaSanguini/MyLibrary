-- Single-row profile of the library owner (docs/modelo-de-dados.md).
-- The foreign key to image is added by the migration that creates the image table.
CREATE TABLE profile (
    id              SMALLINT                 NOT NULL,
    display_name    VARCHAR(80),
    avatar_image_id BIGINT,
    theme           VARCHAR(6)               NOT NULL DEFAULT 'SYSTEM',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_profile PRIMARY KEY (id),
    CONSTRAINT ck_profile_singleton CHECK (id = 1),
    CONSTRAINT ck_profile_theme CHECK (theme IN ('LIGHT', 'DARK', 'SYSTEM'))
);

INSERT INTO profile (id, theme, created_at, updated_at)
VALUES (1, 'SYSTEM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
