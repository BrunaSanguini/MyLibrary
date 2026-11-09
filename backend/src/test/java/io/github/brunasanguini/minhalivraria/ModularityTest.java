package io.github.brunasanguini.minhalivraria;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModularityTest {

    @Test
    void shouldRespectModuleBoundaries() {
        ApplicationModules.of(MinhaLivrariaApplication.class).verify();
    }
}
