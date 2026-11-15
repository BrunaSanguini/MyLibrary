package io.github.brunasanguini.minhalivraria.goals.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import io.github.brunasanguini.minhalivraria.WebSliceTest;
import io.github.brunasanguini.minhalivraria.goals.GoalPeriod;
import io.github.brunasanguini.minhalivraria.goals.GoalType;
import io.github.brunasanguini.minhalivraria.goals.application.GoalRequest;
import io.github.brunasanguini.minhalivraria.goals.application.GoalResponse;
import io.github.brunasanguini.minhalivraria.goals.application.GoalService;
import io.github.brunasanguini.minhalivraria.shared.error.BusinessRuleException;
import io.github.brunasanguini.minhalivraria.shared.error.ConflictException;
import io.github.brunasanguini.minhalivraria.shared.error.NotFoundException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@WebSliceTest(controllers = GoalController.class)
class GoalControllerTest {

    private static final String REQUESTED_BY = "X-Requested-By";
    private static final String MINHA_LIVRARIA = "minha-livraria";
    private static final GoalResponse BOOKS_OF_2026 =
            new GoalResponse(5, GoalType.BOOKS, GoalPeriod.YEAR, 2026, null, 24, 6, 25);

    @Autowired
    private MockMvcTester mvc;

    @MockitoBean
    private GoalService service;

    @Test
    void shouldListTheGoalsOfTheYearAsked() {
        given(service.listByYear(2026)).willReturn(List.of(BOOKS_OF_2026));

        assertThat(mvc.get().uri("/api/v1/goals?year=2026"))
                .hasStatusOk()
                .bodyJson()
                .isLenientlyEqualTo("""
                        [
                          {
                            "id": 5,
                            "type": "BOOKS",
                            "period": "YEAR",
                            "year": 2026,
                            "month": null,
                            "target": 24,
                            "current": 6,
                            "percent": 25
                          }
                        ]
                        """);
    }

    @Test
    void shouldLeaveTheYearToTheServiceWhenNoneIsGiven() {
        given(service.listByYear(null)).willReturn(List.of());

        assertThat(mvc.get().uri("/api/v1/goals")).hasStatusOk();

        then(service).should().listByYear(null);
    }

    @Test
    void shouldRefuseAYearOutsideTheCalendarOfTheApp() {
        assertThat(mvc.get().uri("/api/v1/goals?year=12")).hasStatus(HttpStatus.BAD_REQUEST);
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldAnswerANewGoalWith201AndItsLocation() {
        given(service.create(new GoalRequest(GoalType.BOOKS, GoalPeriod.YEAR, 2026, null, 24)))
                .willReturn(BOOKS_OF_2026);

        assertThat(post("""
                        { "type": "BOOKS", "period": "YEAR", "year": 2026, "target": 24 }
                        """))
                .hasStatus(HttpStatus.CREATED)
                .hasHeader(HttpHeaders.LOCATION, "/api/v1/goals/5")
                .bodyJson()
                .extractingPath("$.id")
                .isEqualTo(5);
    }

    @Test
    void shouldRequireAPositiveTarget() {
        assertThat(post("""
                        { "type": "BOOKS", "period": "YEAR", "year": 2026, "target": 0 }
                        """))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors[0].field")
                .isEqualTo("target");
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void shouldAnswer409ForASecondGoalOfTheSameTypeAndPeriod() {
        given(service.create(any())).willThrow(new ConflictException("goal.duplicated"));

        assertThat(post("""
                        { "type": "BOOKS", "period": "YEAR", "year": 2026, "target": 24 }
                        """))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        { "code": "goal.duplicated", "title": "Meta já existe" }
                        """);
    }

    @Test
    void shouldAnswer422ForRereadsByMonth() {
        given(service.create(any())).willThrow(new BusinessRuleException("goal.invalid-period"));

        assertThat(post("""
                        { "type": "REREADS", "period": "MONTH", "year": 2026, "month": 3, "target": 1 }
                        """))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson()
                .isLenientlyEqualTo("""
                        { "code": "goal.invalid-period", "title": "Período inválido para a meta" }
                        """);
    }

    @Test
    void shouldChangeTheTarget() {
        given(service.changeTarget(5, 30))
                .willReturn(new GoalResponse(5, GoalType.BOOKS, GoalPeriod.YEAR, 2026, null, 30, 6, 20));

        assertThat(mvc.put()
                        .uri("/api/v1/goals/5")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "target": 30 }
                                """))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.target")
                .isEqualTo(30);
    }

    @Test
    void shouldAnswer404ForAnUnknownGoal() {
        given(service.changeTarget(99, 30)).willThrow(new NotFoundException("goal.not-found"));

        assertThat(mvc.put()
                        .uri("/api/v1/goals/99")
                        .header(REQUESTED_BY, MINHA_LIVRARIA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "target": 30 }
                                """))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.code")
                .isEqualTo("goal.not-found");
    }

    @Test
    void shouldDeleteAGoalWith204() {
        assertThat(mvc.delete().uri("/api/v1/goals/5").header(REQUESTED_BY, MINHA_LIVRARIA))
                .hasStatus(HttpStatus.NO_CONTENT);

        then(service).should().delete(5);
    }

    private MvcTestResult post(String body) {
        return mvc.post()
                .uri("/api/v1/goals")
                .header(REQUESTED_BY, MINHA_LIVRARIA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .exchange();
    }
}
