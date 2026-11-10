package io.github.brunasanguini.minhalivraria.books.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class SeriesServiceTest {

    @Autowired
    private SeriesService service;

    @Test
    void shouldKeepTheTotalOfVolumes() {
        SeriesResponse created = service.create(new SeriesRequest("O Senhor dos Anéis", 3));

        assertThat(created.totalVolumes()).isEqualTo(3);
        assertThat(service.update(created.id(), new SeriesRequest("O Senhor dos Anéis", null)).totalVolumes())
                .isNull();
    }

    @Test
    void shouldRefuseADuplicatedNameIgnoringCaseAndAccents() {
        service.create(new SeriesRequest("O Senhor dos Anéis", 3));

        assertThatThrownBy(() -> service.create(new SeriesRequest("o senhor dos aneis", null)))
                .isInstanceOf(ConflictException.class)
                .extracting("code")
                .isEqualTo("series.name-duplicated");
    }

    @Test
    void shouldRefuseRenamingToTheNameOfAnotherSeries() {
        service.create(new SeriesRequest("Duna", 6));
        long id = service.create(new SeriesRequest("Fundação", 7)).id();

        assertThatThrownBy(() -> service.update(id, new SeriesRequest("DUNA", 6)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void shouldSearchGetAndDeleteSeries() {
        long id = service.create(new SeriesRequest("Crônicas de Nárnia", 7)).id();

        assertThat(service.search("narnia", PageRequest.of(0, 24, Sort.by("normalizedName"))).totalElements())
                .isEqualTo(1);
        assertThat(service.get(id).name()).isEqualTo("Crônicas de Nárnia");

        service.delete(id);

        assertThatThrownBy(() -> service.get(id))
                .isInstanceOf(NotFoundException.class)
                .extracting("code")
                .isEqualTo("series.not-found");
    }
}
