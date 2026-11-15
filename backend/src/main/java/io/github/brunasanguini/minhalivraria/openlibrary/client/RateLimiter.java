package io.github.brunasanguini.minhalivraria.openlibrary.client;

import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.function.LongSupplier;

/**
 * Keeps a minimum interval between calls. The Open Library allows 3 requests per second to clients that identify
 * themselves with a contact and 1 per second to the others, which is simple enough not to need a library
 * (ADR-0004).
 *
 * <p>Callers wait in line: {@link #acquire()} only returns when the next call is allowed.
 */
public final class RateLimiter {

    private final long intervalNanos;
    private final LongSupplier nanoClock;
    private final Pause pause;

    private boolean used;
    private long nextSlot;

    public RateLimiter(Duration interval) {
        this(interval, System::nanoTime, RateLimiter::sleep);
    }

    RateLimiter(Duration interval, LongSupplier nanoClock, Pause pause) {
        this.intervalNanos = interval.toNanos();
        this.nanoClock = nanoClock;
        this.pause = pause;
    }

    public static RateLimiter perSecond(int requests) {
        return new RateLimiter(Duration.ofNanos(TimeUnit.SECONDS.toNanos(1) / requests));
    }

    public synchronized void acquire() {
        long now = nanoClock.getAsLong();
        if (!used) {
            used = true;
            nextSlot = now;
        }
        long wait = nextSlot - now;
        if (wait > 0) {
            pause.forNanos(wait);
        }
        nextSlot = Math.max(now, nextSlot) + intervalNanos;
    }

    private static void sleep(long nanos) {
        try {
            TimeUnit.NANOSECONDS.sleep(nanos);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting for the Open Library rate limit", e);
        }
    }

    /** How the limiter waits; tests replace it to run without sleeping. */
    @FunctionalInterface
    interface Pause {
        void forNanos(long nanos);
    }
}
