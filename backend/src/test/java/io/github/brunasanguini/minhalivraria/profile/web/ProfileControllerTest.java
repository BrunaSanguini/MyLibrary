package io.github.brunasanguini.minhalivraria.profile.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import io.github.brunasanguini.minhalivraria.profile.ProfileTheme;
import io.github.brunasanguini.minhalivraria.profile.application.AvatarResponse;
import io.github.brunasanguini.minhalivraria.profile.application.ProfileRequest;
import io.github.brunasanguini.minhalivraria.profile.application.ProfileResponse;
import io.github.brunasanguini.minhalivraria.profile.application.ProfileService;
import io.github.brunasanguini.minhalivraria.shared.error.UnsupportedMediaTypeException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@WebSliceTest(controllers = ProfileController.class)
class ProfileControllerTest {

    private static final String REQUESTED_BY = "X-Requested-By";
    private static final String MINHA_LIVRARIA = "minha-livraria";

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private ProfileService service;

    @Test
    void shouldAnswerTheProfileWithNullsForWhatIsMissing() {
        given(service.get()).willReturn(new ProfileResponse(null, null, ProfileTheme.SYSTEM));

        assertThat(mvc.get().uri("/api/v1/profile")).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                        { "displayName": null, "avatarUrl": null, "theme": "SYSTEM" }
                        """);
    }

    @Test
    void shouldSaveTheNameAndTheTheme() {
        given(service.update(new ProfileRequest("Bru", ProfileTheme.DARK)))
                .willReturn(new ProfileResponse("Bru", null, ProfileTheme.DARK));

        assertThat(put("""
                        { "displayName": "Bru", "theme": "DARK" }
                        """)).hasStatusOk().bodyJson().extractingPath("$.theme").isEqualTo("DARK");
    }

    @Test
    void shouldRequireTheTheme() {
        assertThat(put("""
                        { "displayName": "Bru" }
                        """))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors[0].field")
                .isEqualTo("theme");
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldRefuseANameLongerThan80Characters() {
        assertThat(put("{ \"displayName\": \"" + "a".repeat(81) + "\", \"theme\": \"LIGHT\" }"))
                .hasStatus(HttpStatus.BAD_REQUEST);
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldSendTheAvatarToTheService() {
        given(service.replaceAvatar(any())).willReturn(new AvatarResponse("/api/v1/images/21"));

        assertThat(mvc.put()
                        .uri("/api/v1/profile/avatar")
                        .multipart()
                        .file(new MockMultipartFile("file", "eu.png", "image/png", new byte[] {1, 2, 3}))
                        .header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.avatarUrl")
                .isEqualTo("/api/v1/images/21");
    }

    @Test
    void shouldAnswer415ForAnAvatarThatIsNotAnImage() {
        given(service.replaceAvatar(any())).willThrow(new UnsupportedMediaTypeException("image.invalid-type"));

        assertThat(mvc.put()
                        .uri("/api/v1/profile/avatar")
                        .multipart()
                        .file(new MockMultipartFile("file", "eu.png", "image/png", new byte[] {1, 2, 3}))
                        .header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("image.invalid-type");
    }

    @Test
    void shouldRefuseAnEmptyFile() {
        assertThat(mvc.put()
                        .uri("/api/v1/profile/avatar")
                        .multipart()
                        .file(new MockMultipartFile("file", "eu.png", "image/png", new byte[0]))
                        .header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.BAD_REQUEST);
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldRemoveTheAvatarWith204() {
        assertThat(mvc.delete().uri("/api/v1/profile/avatar").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NO_CONTENT);

        then(service).should().removeAvatar();
    }

    private MvcTestResult put(String body) {
        return mvc.put()
                .uri("/api/v1/profile")
                .header(REQUESTED_BY, MINHA_LIVRARIA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
    }
}
