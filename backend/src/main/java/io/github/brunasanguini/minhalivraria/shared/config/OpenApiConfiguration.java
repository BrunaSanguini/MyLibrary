package io.github.brunasanguini.minhalivraria.shared.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class OpenApiConfiguration {

    /**
     * Fixed metadata keeps docs/openapi.json stable: the API version is the URL version, not the app version, and the
     * server is relative instead of the random port of each run.
     */
    @Bean
    OpenAPI openApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Minha Livraria API")
                        .version("v1")
                        .description("Local REST API of Minha Livraria."))
                .servers(List.of(new Server().url("/")));
    }
}
