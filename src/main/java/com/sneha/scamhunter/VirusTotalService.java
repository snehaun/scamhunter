
package com.sneha.scamhunter;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Service
public class VirusTotalService {

    private final RestClient restClient = RestClient.builder()
            .baseUrl("https://www.virustotal.com/api/v3")
            .build();

    public Map<?, ?> checkUrl(String url) {

        String apiKey = System.getenv("VIRUSTOTAL_API_KEY");

        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "VirusTotal API key is not configured."
            );
        }

        // Validate the URL before sending it to the external service.
        URI parsedUrl;

        try {
            parsedUrl = URI.create(url.trim());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid URL format.");
        }

        String scheme = parsedUrl.getScheme();

        if (parsedUrl.getHost() == null
                || scheme == null
                || !(scheme.equalsIgnoreCase("http")
                || scheme.equalsIgnoreCase("https"))) {
            throw new IllegalArgumentException(
                    "Please provide a valid HTTP or HTTPS URL."
            );
        }

        // VirusTotal identifies URLs using URL-safe Base64 without padding.
        String urlId = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(
                        url.trim().getBytes(StandardCharsets.UTF_8)
                );

        try {
            Map<?, ?> result = restClient.get()
                    .uri("/urls/{urlId}", urlId)
                    .header("x-apikey", apiKey)
                    .retrieve()
                    .body(Map.class);

            if (result == null) {
                throw new IllegalStateException(
                        "VirusTotal returned an empty response."
                );
            }

            return result;

        } catch (RestClientResponseException ex) {

            int status = ex.getStatusCode().value();

            if (status == 404) {
                throw new IllegalStateException(
                        "This URL has not been found in VirusTotal. "
                                + "A separate scan request may be needed."
                );
            }

            if (status == 401 || status == 403) {
                throw new IllegalStateException(
                        "VirusTotal rejected the API key or access."
                );
            }

            if (status == 429) {
                throw new IllegalStateException(
                        "VirusTotal API rate limit reached. Try again later."
                );
            }

            throw new IllegalStateException(
                    "VirusTotal request failed with HTTP status "
                            + status + "."
            );
        }
    }
}
