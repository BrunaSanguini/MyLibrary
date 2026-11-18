package io.github.brunasanguini.minhalivraria.openlibrary.client;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpTimeoutException;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

class OpenLibraryGatewayTest {

    @Test
    void shouldTakeASlowConnectionAsATimeoutAndNotAsNoConnection() {
        assertThat(OpenLibraryGateway.timedOut(failure(new HttpConnectTimeoutException("HTTP connect timed out"))))
                .isTrue();
        assertThat(OpenLibraryGateway.timedOut(failure(new HttpTimeoutException("request timed out"))))
                .isTrue();
        assertThat(OpenLibraryGateway.timedOut(failure(new SocketTimeoutException("Read timed out"))))
                .isTrue();
    }

    @Test
    void shouldTakeARefusedOrUnknownHostAsNoConnection() {
        assertThat(OpenLibraryGateway.timedOut(failure(new ConnectException("Connection refused"))))
                .isFalse();
        assertThat(OpenLibraryGateway.timedOut(failure(new UnknownHostException("openlibrary.org"))))
                .isFalse();
    }

    private static ResourceAccessException failure(Exception cause) {
        return new ResourceAccessException("I/O error on GET request", new IOException(cause));
    }
}
