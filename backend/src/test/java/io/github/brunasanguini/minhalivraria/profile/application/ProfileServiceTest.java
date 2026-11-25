package io.github.brunasanguini.minhalivraria.profile.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.images.ImageSamples;
import io.github.brunasanguini.minhalivraria.profile.ProfileTheme;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.PayloadTooLargeException;
import io.github.brunasanguini.minhalivraria.shared.error.UnsupportedMediaTypeException;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Year;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ProfileServiceTest {

    private static final Path DATA_DIR = tempDataDir();

    @DynamicPropertySource
    static void dataDir(DynamicPropertyRegistry registry) {
        registry.add("app.data-dir", DATA_DIR::toString);
    }

    @Autowired
    private ProfileService profile;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcClient jdbc;

    @Test
    void shouldStartWithoutNameOrAvatarAndFollowingTheSystem() {
        assertThat(profile.get()).isEqualTo(new ProfileResponse(null, null, ProfileTheme.SYSTEM));
    }

    @Test
    void shouldSaveTheNameTrimmedAndTheTheme() {
        ProfileResponse saved = profile.update(new ProfileRequest("  Bru ", ProfileTheme.DARK));
        entityManager.flush();
        entityManager.clear();

        assertThat(saved.displayName()).isEqualTo("Bru");
        assertThat(profile.get()).isEqualTo(new ProfileResponse("Bru", null, ProfileTheme.DARK));
    }

    @Test
    void shouldForgetABlankName() {
        profile.update(new ProfileRequest("Bru", ProfileTheme.LIGHT));

        assertThat(profile.update(new ProfileRequest("   ", ProfileTheme.LIGHT)).displayName())
                .isNull();
    }

    @Test
    void shouldKeepTheYearTheReaderStarted() {
        profile.update(new ProfileRequest("Bru", ProfileTheme.DARK, 2019));
        entityManager.flush();
        entityManager.clear();

        assertThat(profile.get().readerSince()).isEqualTo(2019);
        assertThat(profile.update(new ProfileRequest("Bru", ProfileTheme.DARK)).readerSince())
                .isNull();
    }

    @Test
    void shouldRefuseAYearStillToCome() {
        int next = Year.now().getValue() + 1;

        assertThatThrownBy(() -> profile.update(new ProfileRequest("Bru", ProfileTheme.DARK, next)))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code")
                .isEqualTo("profile.reader-since-future");
    }

    @Test
    void shouldReplaceTheAvatarAndSendThePreviousOneAway() {
        String first = profile.replaceAvatar(ImageSamples.PNG).avatarUrl();
        String second = profile.replaceAvatar(ImageSamples.WEBP).avatarUrl();
        entityManager.flush();

        assertThat(second).isNotEqualTo(first).startsWith("/api/v1/images/");
        assertThat(profile.get().avatarUrl()).isEqualTo(second);
        assertThat(jdbc.sql("select kind from image where id = ?")
                        .param(Long.parseLong(second.substring(second.lastIndexOf('/') + 1)))
                        .query(String.class)
                        .single())
                .isEqualTo("AVATAR");
    }

    @Test
    void shouldRemoveTheAvatar() {
        profile.replaceAvatar(ImageSamples.JPEG);

        profile.removeAvatar();
        entityManager.flush();

        assertThat(profile.get().avatarUrl()).isNull();
    }

    @Test
    void shouldRefuseAnAvatarWithTheRulesOfTheImages() {
        assertThatThrownBy(() -> profile.replaceAvatar(ImageSamples.TEXT_NAMED_AS_PNG))
                .isInstanceOf(UnsupportedMediaTypeException.class)
                .extracting("code")
                .isEqualTo("image.invalid-type");
        assertThatThrownBy(() -> profile.replaceAvatar(ImageSamples.ofSize(ImageSamples.JPEG, 5 * 1024 * 1024 + 1)))
                .isInstanceOf(PayloadTooLargeException.class)
                .extracting("code")
                .isEqualTo("image.too-large");
        assertThat(profile.get().avatarUrl()).isNull();
    }

    private static Path tempDataDir() {
        try {
            return Files.createTempDirectory("minha-livraria-profile-");
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
