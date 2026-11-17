package io.github.brunasanguini.minhalivraria.goals.domain;

import io.github.brunasanguini.minhalivraria.goals.GoalType;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface GoalRepository extends JpaRepository<Goal, Long> {

    /** The goals of a year: the yearly ones first, then month by month, each group by type. */
    @Query("""
            select g from Goal g
            where g.year = :year
            order by coalesce(g.month, 0), g.type
            """)
    List<Goal> findByYearInOrder(short year);

    /** One goal per type and period (goal.duplicated). A null month is the yearly goal. */
    @Query("""
            select count(g) > 0 from Goal g
            where g.type = :type and g.year = :year
                and coalesce(g.month, 0) = coalesce(:month, 0)
            """)
    boolean existsByTypeAndPeriod(GoalType type, short year, @Nullable Short month);
}
