package com.brunasanguini.mylibrary.service;

import com.brunasanguini.mylibrary.dto.IsbnResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

@Service
public class IsbnService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public IsbnService(ObjectMapper objectMapper) {
        this.restClient = RestClient.create();
        this.objectMapper = objectMapper;
    }

    public IsbnResponse fetchByIsbn(String isbn) {
        String url = "https://openlibrary.org/api/books"
                + "?bibkeys=ISBN:" + isbn
                + "&format=json&jscmd=data";

        String raw = restClient.get()
                .uri(url)
                .retrieve()
                .body(String.class);

        return parse(raw, isbn);
    }

    private IsbnResponse parse(String json, String isbn) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode book = root.get("ISBN:" + isbn);

            if (book == null) {
                throw new RuntimeException("ISBN não encontrado na Open Library: " + isbn);
            }

            // Título
            String title = book.path("title").asText(null);

            // Autores
            List<String> authors = new ArrayList<>();
            JsonNode authorsNode = book.path("authors");
            if (authorsNode.isArray()) {
                for (JsonNode author : authorsNode) {
                    String name = author.path("name").asText(null);
                    if (name != null) authors.add(name);
                }
            }

            // Número de páginas
            Integer pageCount = null;
            JsonNode pages = book.path("number_of_pages");
            if (!pages.isMissingNode()) pageCount = pages.asInt();

            // Ano de publicação
            Integer publicationYear = null;
            JsonNode publishDate = book.path("publish_date");
            if (!publishDate.isMissingNode()) {
                String dateStr = publishDate.asText();
                // Tenta extrair o ano — formatos comuns: "2003", "March 2003", "2003-01-01"
                String yearOnly = dateStr.replaceAll(".*?(\\d{4}).*", "$1");
                try {
                    publicationYear = Integer.parseInt(yearOnly);
                } catch (NumberFormatException ignored) {}
            }

            // URL da capa
            String coverUrl = "https://covers.openlibrary.org/b/isbn/" + isbn + "-L.jpg";

            return new IsbnResponse(title, authors, coverUrl, pageCount, publicationYear, isbn);

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Erro ao processar resposta da Open Library", e);
        }
    }
}