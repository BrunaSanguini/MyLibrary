package io.github.brunasanguini.minhalivraria.shared.config;

import java.io.IOException;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Resolves static files normally and answers front-end routes (such as {@code /estante} or {@code /livros/42}) with
 * {@code index.html}, so the Angular router can handle them after a reload.
 *
 * <p>API, Actuator and OpenAPI paths and anything that looks like a file (has an extension) are never redirected: a
 * missing one must stay a 404.
 */
class SpaFallbackResourceResolver extends PathResourceResolver {

    private static final String INDEX = "index.html";
    private static final List<String> BACKEND_PREFIXES = List.of("api/", "actuator/", "v3/", "swagger-ui");

    @Override
    protected @Nullable Resource getResource(String resourcePath, Resource location) throws IOException {
        Resource resource = super.getResource(resourcePath, location);
        if (resource != null || !isFrontendRoute(resourcePath)) {
            return resource;
        }
        return super.getResource(INDEX, location);
    }

    static boolean isFrontendRoute(String resourcePath) {
        if (BACKEND_PREFIXES.stream().anyMatch(resourcePath::startsWith)) {
            return false;
        }
        String lastSegment = resourcePath.substring(resourcePath.lastIndexOf('/') + 1);
        return !lastSegment.contains(".");
    }
}
