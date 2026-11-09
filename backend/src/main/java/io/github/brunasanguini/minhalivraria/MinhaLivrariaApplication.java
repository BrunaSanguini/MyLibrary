package io.github.brunasanguini.minhalivraria;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MinhaLivrariaApplication {

    public static void main(String[] args) {
        SpringApplication.run(MinhaLivrariaApplication.class, args);
    }
}
