package io.github.brunasanguini.minhalivraria.shared.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class ClockConfiguration {

    /** Injected wherever "today" matters, so tests can fix the date. */
    @Bean
    Clock clock() {
        return Clock.systemDefaultZone();
    }
}
