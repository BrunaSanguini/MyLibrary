package io.github.brunasanguini.minhalivraria.openlibrary.client;

import io.github.brunasanguini.minhalivraria.shared.config.AppProperties;
import java.net.http.HttpClient;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.info.BuildProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.resilience.annotation.EnableResilientMethods;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientHttpServiceGroupConfigurer;
import org.springframework.web.service.registry.ImportHttpServices;

/**
 * Registers {@link OpenLibraryApi} in the {@code openlibrary} group and gives the group its base URL, timeouts and
 * User-Agent. {@code @EnableResilientMethods} turns on the {@code @Retryable} of {@link OpenLibraryGateway}.
 */
@Configuration(proxyBeanMethods = false)
@EnableResilientMethods
@ImportHttpServices(group = OpenLibraryConfiguration.GROUP, types = OpenLibraryApi.class)
class OpenLibraryConfiguration {

    static final String GROUP = "openlibrary";

    private static final String PROJECT = "https://github.com/BrunaSanguini/MyLibrary";
    private static final int REQUESTS_PER_SECOND_WITH_CONTACT = 3;
    private static final int REQUESTS_PER_SECOND_WITHOUT_CONTACT = 1;

    @Bean
    RestClientHttpServiceGroupConfigurer openLibraryGroup(
            AppProperties properties, ObjectProvider<BuildProperties> build) {
        AppProperties.OpenLibrary settings = properties.openLibrary();
        String userAgent = userAgent(settings, build.getIfAvailable());
        return groups -> groups.filterByName(GROUP).forEachClient((group, client) -> client.baseUrl(
                        settings.baseUrl().toString())
                .defaultHeader(HttpHeaders.USER_AGENT, userAgent)
                .requestFactory(requestFactory(settings)));
    }

    @Bean
    OpenLibraryGateway openLibraryGateway(
            OpenLibraryApi api, AppProperties properties, ObjectProvider<BuildProperties> build) {
        AppProperties.OpenLibrary settings = properties.openLibrary();
        RestClient covers = RestClient.builder()
                .baseUrl(settings.coversUrl().toString())
                .defaultHeader(HttpHeaders.USER_AGENT, userAgent(settings, build.getIfAvailable()))
                .requestFactory(requestFactory(settings))
                .build();
        int requestsPerSecond =
                settings.hasContact() ? REQUESTS_PER_SECOND_WITH_CONTACT : REQUESTS_PER_SECOND_WITHOUT_CONTACT;
        return new OpenLibraryGateway(api, covers, RateLimiter.perSecond(requestsPerSecond));
    }

    /**
     * {@code MinhaLivraria/0.6.0 (+https://github.com/BrunaSanguini/MyLibrary; contact)}. The Open Library asks
     * clients to identify themselves and gives a higher limit to the ones that send a contact.
     */
    static String userAgent(AppProperties.OpenLibrary settings, @Nullable BuildProperties build) {
        String version = build == null || build.getVersion() == null ? "dev" : build.getVersion();
        String contact = settings.contact();
        String details = contact != null && !contact.isBlank() ? "+" + PROJECT + "; " + contact.strip() : "+" + PROJECT;
        return "MinhaLivraria/" + version + " (" + details + ")";
    }

    /**
     * Follows redirects, because {@code /isbn/{isbn}.json} and the covers answer with one. HTTP/1.1 keeps the client
     * from trying an HTTP/2 upgrade on plain connections.
     */
    private static ClientHttpRequestFactory requestFactory(AppProperties.OpenLibrary settings) {
        HttpClient http = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(settings.connectTimeout())
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(settings.readTimeout());
        return factory;
    }
}
