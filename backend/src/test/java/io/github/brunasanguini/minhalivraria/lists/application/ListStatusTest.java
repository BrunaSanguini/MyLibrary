package io.github.brunasanguini.minhalivraria.lists.application;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ListStatusTest {

    @Test
    void shouldNotHaveStartedWithNoBookRead() {
        assertThat(ListStatus.of(0, 0)).isEqualTo(ListStatus.NOT_STARTED);
        assertThat(ListStatus.of(3, 0)).isEqualTo(ListStatus.NOT_STARTED);
    }

    @Test
    void shouldBeInProgressWithSomeBooksRead() {
        assertThat(ListStatus.of(3, 1)).isEqualTo(ListStatus.IN_PROGRESS);
        assertThat(ListStatus.of(3, 2)).isEqualTo(ListStatus.IN_PROGRESS);
    }

    @Test
    void shouldBeCompletedWithAllTheBooksRead() {
        assertThat(ListStatus.of(1, 1)).isEqualTo(ListStatus.COMPLETED);
        assertThat(ListStatus.of(3, 3)).isEqualTo(ListStatus.COMPLETED);
    }
}
