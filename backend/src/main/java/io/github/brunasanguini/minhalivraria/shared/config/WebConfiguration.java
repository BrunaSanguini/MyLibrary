package io.github.brunasanguini.minhalivraria.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.HandlerTypePredicate;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.i18n.FixedLocaleResolver;

@Configuration(proxyBeanMethods = false)
class WebConfiguration implements WebMvcConfigurer {

    static final String API_PREFIX = "/api/v1";
    private static final String BASE_PACKAGE = "io.github.brunasanguini.minhalivraria";

    /** Controllers declare only "/books"; the API prefix is applied here (ADR-0005). */
    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.addPathPrefix(API_PREFIX, HandlerTypePredicate.forBasePackage(BASE_PACKAGE));
    }

    /** Serves the Angular build and falls back to index.html for front-end routes (ADR-0001). */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new SpaFallbackResourceResolver());
    }

    @Bean
    LocaleResolver localeResolver() {
        return new FixedLocaleResolver(AppLocale.DEFAULT);
    }
}
