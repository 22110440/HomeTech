package com.hometech.hometech;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EntityScan("com.hometech.hometech.model")
@EnableJpaRepositories("com.hometech.hometech.Repository")
public class HomeTechApplication {

	public static void main(String[] args) {
		SpringApplication.run(HomeTechApplication.class, args);
	}

}
