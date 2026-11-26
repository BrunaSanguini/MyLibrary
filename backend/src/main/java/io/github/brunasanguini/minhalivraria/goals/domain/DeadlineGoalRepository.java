package io.github.brunasanguini.minhalivraria.goals.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeadlineGoalRepository extends JpaRepository<DeadlineGoal, Long> {

    /** The goal that ends first comes first. */
    List<DeadlineGoal> findAllByOrderByEndDateAscIdAsc();
}
