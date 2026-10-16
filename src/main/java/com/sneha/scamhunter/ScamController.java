
package com.sneha.scamhunter;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.*;
import java.util.regex.Pattern;



@RestController
@CrossOrigin(origins = {
    "http://localhost:5173",
    "https://scamhunter-kappa.vercel.app",
    "https://scamhunter-h98020oqu-sneha-nagargoje-s-projects.vercel.app"
})
@RequestMapping("/api/scam")
public class ScamController {

    private final GeminiService geminiService;
    private final VirusTotalService virusTotalService;
    private final ScanHistoryRepository scanHistoryRepository;
    

    public ScamController(
        GeminiService geminiService,
        VirusTotalService virusTotalService,
        ScanHistoryRepository scanHistoryRepository) {

    this.geminiService = geminiService;
    this.virusTotalService = virusTotalService;
    this.scanHistoryRepository = scanHistoryRepository;
}

    // 1. Rule-based scam analysis
    @PostMapping("/analyze")
    public Map<String, Object> analyze(
            @RequestBody Map<String, String> request) {

        String message = request.getOrDefault("message", "")
                .toLowerCase()
                .trim();

        if (message.isEmpty()) {
            return Map.of(
                    "error", "Please provide a message to analyze."
            );
        }

        List<String> warnings = new ArrayList<>();
        int score = 0;

        // OTP and verification scams
        if (message.contains("otp")
                || message.contains("one-time password")) {
            warnings.add("Mentions an OTP or one-time password");
            score += 30;
        }

        // Urgency and pressure tactics
        if (message.contains("urgent")
                || message.contains("immediately")
                || message.contains("act now")
                || message.contains("account will be blocked")) {
            warnings.add("Uses urgency or pressure tactics");
            score += 20;
        }

        // Fake prizes and rewards
        if (message.contains("you won")
                || message.contains("prize")
                || message.contains("reward")
                || message.contains("lottery")) {
            warnings.add("Contains a possible fake prize or reward");
            score += 20;
        }

        // Sensitive information
        if (message.contains("password")
                || message.contains("bank details")
                || message.contains("pin")
                || message.contains("cvv")) {
            warnings.add(
                    "Mentions sensitive financial or account information"
            );
            score += 30;
        }

        // Suspicious links
        if (Pattern.compile(
                "https?://|www\\.",
                Pattern.CASE_INSENSITIVE
        ).matcher(message).find()) {
            warnings.add("Contains a link that should be checked");
            score += 15;
        }

        // Requests for money
        if (message.contains("send money")
                || message.contains("pay a fee")
                || message.contains("processing fee")
                || message.contains("transfer money")) {
            warnings.add("Requests a payment or money transfer");
            score += 25;
        }

        score = Math.min(score, 100);

        String riskLevel;

        if (score >= 60) {
            riskLevel = "HIGH";
        } else if (score >= 25) {
            riskLevel = "MEDIUM";
        } else {
            riskLevel = "LOW";
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("riskScore", score);
        result.put("riskLevel", riskLevel);
        result.put("warnings", warnings);
        result.put(
                "message",
                "Rule-based analysis completed. Verify suspicious claims independently."
        );

        ScanHistory history = new ScanHistory(
        request.getOrDefault("message", ""),
        score,
        riskLevel,
        "Rule-based analysis completed."
);

ScanHistory savedHistory = scanHistoryRepository.save(history);
result.put("historyId", savedHistory.getId());

return result;
    }

    // 2. API health test
    @GetMapping("/test")
    public String test() {
        return "Scam Hunter API is working!";
    }

    // 3. Gemini AI scam analysis
    
@PostMapping("/ai-analyze")
public Map<String, Object> aiAnalyze(
        @RequestBody Map<String, Object> request) {

    String message = String.valueOf(
            request.getOrDefault("message", "")
    ).trim();

    if (message.isEmpty()) {
        return Map.of("error", "Please provide a message to analyze.");
    }

    try {
        String analysis = geminiService.analyzeMessage(message);

       Object rawId = request.get("historyId");
       System.out.println("DEBUG historyId received: " + rawId);

if (rawId != null) {
    Long historyId = Long.valueOf(rawId.toString());

    ScanHistory history = scanHistoryRepository.findById(historyId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Scan history record not found"
        ));

    history.setAnalysis(analysis);
    System.out.println("DEBUG saving analysis for record: " + history.getId());
    scanHistoryRepository.save(history);
}

        return Map.of(
                "analysis", analysis,
                "engine", "Gemini AI"
        );

    } catch (ResponseStatusException e) {
        throw e;
    } catch (Exception e) {
        System.err.println("Gemini AI analysis error: " + e.getMessage());

        return Map.of(
                "error", "Gemini AI analysis failed. Check the SERVER terminal.",
                "engine", "Gemini AI",
                "fallback", "Rule-based analysis remains available."
        );
    }
}


    // 4. VirusTotal URL check
    @PostMapping("/check-url")
    public Map<?, ?> checkUrl(
            @RequestBody Map<String, String> request) {

        String url = request.get("url");

        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException(
                    "Please provide a URL."
            );
        }

        if (!url.startsWith("https://")
                && !url.startsWith("http://")) {
            throw new IllegalArgumentException(
                    "URL must start with http:// or https://"
            );
        }

        return virusTotalService.checkUrl(url);
    }
    @GetMapping("/history")
public List<ScanHistory> getScanHistory() {
    return scanHistoryRepository.findAll(
            org.springframework.data.domain.Sort
                    .by(org.springframework.data.domain.Sort.Direction.DESC,
                            "scannedAt")
    );
}
@DeleteMapping("/history")
public String clearScanHistory() {
    scanHistoryRepository.deleteAll();
    return "Scan history cleared successfully";
}
@GetMapping("/history/{id}")
public ScanHistory getScanById(@PathVariable Long id) {
    return scanHistoryRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Scan history record not found"
        ));
}
@GetMapping("/stats")
public Map<String, Object> getStats() {
    return Map.of(
        "totalScans", scanHistoryRepository.count(),
        "highRisk",
            scanHistoryRepository.countByRiskLevelIgnoreCase("HIGH"),
        "mediumRisk",
            scanHistoryRepository.countByRiskLevelIgnoreCase("MEDIUM"),
        "lowRisk",
            scanHistoryRepository.countByRiskLevelIgnoreCase("LOW")
    );
}


}
