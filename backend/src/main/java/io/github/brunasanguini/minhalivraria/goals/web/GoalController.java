package io.github.brunasanguini.minhalivraria.goals.web;

import io.github.brunasanguini.minhalivraria.goals.application.GoalRequest;
import io.github.brunasanguini.minhalivraria.goals.application.GoalResponse;
import io.github.brunasanguini.minhalivraria.goals.application.GoalService;
import io.github.brunasanguini.minhalivraria.goals.application.GoalTargetRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.net.URI;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "goals", description = "Reading goals by year or month, with their progress")
@RestController
@RequestMapping("/goals")
class GoalController {

    private final GoalService service;

    GoalController(GoalService service) {
        this.service = service;
    }

    @Operation(
            operationId = "listGoals",
            summary = "Goals of a year, yearly and monthly, with the progress of each one",
            description = "Without year, the current one. In the current year, a month without a monthly goal gets"
                    + " one with the target of the last monthly goal of the same type.")
    @GetMapping
    List<GoalResponse> list(@RequestParam(required = false) @Min(1900) @Max(2999) @Nullable Integer year) {
        return service.listByYear(year);
    }

    @Operation(
            operationId = "createGoal",
            description = "A second goal of the same type and period: 409 goal.duplicated. A monthly goal without"
                    + " month, a yearly goal with one, or rereads by month: 422 goal.invalid-period.")
    @PostMapping
    ResponseEntity<GoalResponse> create(@Valid @RequestBody GoalRequest request) {
        GoalResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/v1/goals/" + created.id()))
                .body(created);
    }

    @Operation(
            operationId = "updateGoal",
            summary = "Changes the target of a goal and turns it on or off",
            description = "Without enabled, the goal stays on or off as it was. A goal that is off keeps its target"
                    + " but does not show on the Home.")
    @PutMapping("/{id}")
    GoalResponse update(@PathVariable long id, @Valid @RequestBody GoalTargetRequest request) {
        return service.update(id, request.target(), request.enabled());
    }

    @Operation(operationId = "deleteGoal")
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
