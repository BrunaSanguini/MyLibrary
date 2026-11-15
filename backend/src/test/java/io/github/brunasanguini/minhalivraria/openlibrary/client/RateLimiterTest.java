package io.github.brunasanguini.minhalivraria.openlibrary.client;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class RateLimiterTest {

    private static final long INTERVAL = TimeUnit.MILLISECONDS.toNanos(334);

    private final List<Long> pauses = new ArrayList<>();
    private long now;

    /** A clock that only moves when the limiter waits or the test says so. */
    private final RateLimiter limiter = new RateLimiter(Duration.ofNanos(INTERVAL), () -> now, nanos -> {
        pauses.add(nanos);
        now += nanos;
    });

    @Test
    void shouldLetTheFirstCallThroughWithoutWaiting() {
        limiter.acquire();

        assertThat(pauses).isEmpty();
    }

    @Test
    void shouldMakeBackToBackCallsWaitTheWholeInterval() {
        limiter.acquire();
        limiter.acquire();
        limiter.acquire();

        assertThat(pauses).containsExactly(INTERVAL, INTERVAL);
    }

    @Test
    void shouldWaitOnlyWhatIsLeftOfTheInterval() {
        limiter.acquire();
        now += TimeUnit.MILLISECONDS.toNanos(300);

        limiter.acquire();

        assertThat(pauses).containsExactly(TimeUnit.MILLISECONDS.toNanos(34));
    }

    @Test
    void shouldNotWaitWhenTheIntervalHasAlreadyPassed() {
        limiter.acquire();
        now += TimeUnit.SECONDS.toNanos(2);

        limiter.acquire();

        assertThat(pauses).isEmpty();
    }

    @Test
    void shouldAllowThreeCallsPerSecondWhenAskedTo() {
        RateLimiter threePerSecond = RateLimiter.perSecond(3);

        long start = System.nanoTime();
        threePerSecond.acquire();
        threePerSecond.acquire();
        long elapsed = System.nanoTime() - start;

        assertThat(elapsed).isGreaterThanOrEqualTo(TimeUnit.MILLISECONDS.toNanos(330));
    }
}
