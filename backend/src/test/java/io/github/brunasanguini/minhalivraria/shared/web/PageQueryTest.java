package io.github.brunasanguini.minhalivraria.shared.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.shared.error.BadRequestException;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

class PageQueryTest {

    private static final Map<String, String> FIELDS = Map.of("name", "normalizedName");
    private static final Sort DEFAULT = Sort.by("normalizedName");

    @Test
    void shouldUseTheDefaultsWhenTheRequestHasNone() {
        Pageable pageable = new PageQuery(null, null, null).toPageable(FIELDS, DEFAULT);

        assertThat(pageable.getPageNumber()).isZero();
        assertThat(pageable.getPageSize()).isEqualTo(PageQuery.DEFAULT_SIZE);
        assertThat(pageable.getSort()).isEqualTo(DEFAULT);
    }

    @Test
    void shouldTranslateTheSortFieldToTheEntityProperty() {
        Pageable pageable = new PageQuery(2, 10, "name,desc").toPageable(FIELDS, DEFAULT);

        assertThat(pageable.getPageNumber()).isEqualTo(2);
        assertThat(pageable.getPageSize()).isEqualTo(10);
        assertThat(pageable.getSort()).isEqualTo(Sort.by(Sort.Direction.DESC, "normalizedName"));
    }

    @Test
    void shouldSortAscendingWhenTheDirectionIsMissing() {
        Pageable pageable = new PageQuery(null, null, "name").toPageable(FIELDS, DEFAULT);

        assertThat(pageable.getSort()).isEqualTo(Sort.by(Sort.Direction.ASC, "normalizedName"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"createdAt", "normalizedName", "name,up", "name,asc,extra"})
    void shouldRefuseSortsOutsideTheEndpointList(String sort) {
        PageQuery query = new PageQuery(null, null, sort);

        assertThatThrownBy(() -> query.toPageable(FIELDS, DEFAULT))
                .isInstanceOf(BadRequestException.class)
                .extracting("code")
                .isEqualTo("request.invalid-sort");
    }
}
