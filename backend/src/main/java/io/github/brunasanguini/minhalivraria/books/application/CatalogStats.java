package io.github.brunasanguini.minhalivraria.books.application;

import io.github.brunasanguini.minhalivraria.images.ImageUrls;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * Book counts and cover samples of the catalog cards, read with SQL.
 *
 * <p>One query for the counts and one for the covers of the whole page, instead of loading the books of each author,
 * publisher or series through the entities just to count them.
 */
@Component
class CatalogStats {

    private static final int COVERS = 3;

    /** What a catalog card shows besides the name. */
    record Stats(long bookCount, List<String> coverUrls) {

        static final Stats NONE = new Stats(0, List.of());
    }

    private final JdbcClient jdbc;

    CatalogStats(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    Map<Long, Stats> ofAuthors(Collection<Long> ids) {
        return stats(
                ids,
                "select ba.author_id as id, count(*) as total from book_author ba"
                        + " where ba.author_id in (:ids) group by ba.author_id",
                "select ba.author_id as id, b.cover_image_id as cover from book_author ba"
                        + " join book b on b.id = ba.book_id"
                        + " where ba.author_id in (:ids) and b.cover_image_id is not null"
                        + " order by b.created_at desc, b.id desc");
    }

    Map<Long, Stats> ofPublishers(Collection<Long> ids) {
        return stats(
                ids,
                "select b.publisher_id as id, count(*) as total from book b"
                        + " where b.publisher_id in (:ids) group by b.publisher_id",
                "select b.publisher_id as id, b.cover_image_id as cover from book b"
                        + " where b.publisher_id in (:ids) and b.cover_image_id is not null"
                        + " order by b.created_at desc, b.id desc");
    }

    /** The covers of a series follow the order of the volumes. */
    Map<Long, Stats> ofSeries(Collection<Long> ids) {
        return stats(
                ids,
                "select b.series_id as id, count(*) as total from book b"
                        + " where b.series_id in (:ids) group by b.series_id",
                "select b.series_id as id, b.cover_image_id as cover from book b"
                        + " where b.series_id in (:ids) and b.cover_image_id is not null"
                        + " order by b.series_position, b.id");
    }

    /**
     * Distinct books of every genre, where a genre also counts the books tagged only with its subgenres. One query
     * for the whole tree.
     */
    Map<Long, Long> bookCountsByGenre() {
        Map<Long, Long> counts = new HashMap<>();
        jdbc.sql("""
                        select g.id as id, count(distinct bg.book_id) as total
                        from genre g
                        join genre s on s.id = g.id or s.parent_id = g.id
                        join book_genre bg on bg.genre_id = s.id
                        group by g.id
                        """)
                .query((rs, row) -> Map.entry(rs.getLong("id"), rs.getLong("total")))
                .list()
                .forEach(entry -> counts.put(entry.getKey(), entry.getValue()));
        return counts;
    }

    private Map<Long, Stats> stats(Collection<Long> ids, String countSql, String coverSql) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<String>> covers = new HashMap<>();
        jdbc.sql(coverSql)
                .param("ids", ids)
                .query((rs, row) -> Map.entry(rs.getLong("id"), rs.getLong("cover")))
                .list()
                .forEach(entry -> {
                    List<String> urls = covers.computeIfAbsent(entry.getKey(), id -> new ArrayList<>());
                    if (urls.size() < COVERS) {
                        urls.add(ImageUrls.of(entry.getValue()));
                    }
                });
        Map<Long, Stats> stats = new HashMap<>();
        jdbc.sql(countSql)
                .param("ids", ids)
                .query((rs, row) -> Map.entry(rs.getLong("id"), rs.getLong("total")))
                .list()
                .forEach(entry -> stats.put(
                        entry.getKey(),
                        new Stats(entry.getValue(), List.copyOf(covers.getOrDefault(entry.getKey(), List.of())))));
        return stats;
    }
}
