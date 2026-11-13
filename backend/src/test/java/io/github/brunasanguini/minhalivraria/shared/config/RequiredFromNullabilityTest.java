package io.github.brunasanguini.minhalivraria.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** What the front-end's generated types depend on: a response field is optional only when it really can be absent. */
@SpringBootTest
@AutoConfigureMockMvc
class RequiredFromNullabilityTest {

    private final JsonMapper json = JsonMapper.builder().build();

    @Autowired
    private MockMvcTester mvc;

    @Test
    void shouldRequireTheFieldsAResponseAlwaysCarries() {
        assertThat(requiredOf("BookCardResponse"))
                .contains("id", "title", "authors", "genres", "ownership", "favorite");
    }

    @Test
    void shouldLeaveNullableFieldsOptional() {
        assertThat(requiredOf("BookCardResponse")).doesNotContain("coverUrl", "series");
    }

    @Test
    void shouldApplyToNestedRecordsToo() {
        assertThat(requiredOf("CardSeriesResponse")).contains("id", "name", "position");
    }

    @Test
    void shouldKeepTreatingAnOptionalRequestFieldAsOptional() {
        assertThat(requiredOf("BookRequest")).contains("title", "authorIds").doesNotContain("subtitle", "isbn13");
    }

    @Test
    void shouldRequireTheFieldsOfAPage() {
        assertThat(requiredOf("PageResponseBookCardResponse"))
                .contains("content", "page", "size", "totalElements", "totalPages");
    }

    private List<String> requiredOf(String schema) {
        String body = mvc.get().uri("/v3/api-docs").exchange().getResponse().getContentAsString(StandardCharsets.UTF_8);
        JsonNode required = json.readTree(body).path("components").path("schemas").path(schema).path("required");
        List<String> names = new ArrayList<>();
        required.forEach(name -> names.add(name.asString()));
        return names;
    }
}
