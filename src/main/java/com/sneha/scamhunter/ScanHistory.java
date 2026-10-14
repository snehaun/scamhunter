
package com.sneha.scamhunter;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "scan_history")
public class ScanHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String message;

    private Integer riskScore;

    private String riskLevel;

    @Column(columnDefinition = "TEXT")
    private String analysis;

    private LocalDateTime scannedAt;

    public ScanHistory() {
    }

    public ScanHistory(
            String message,
            Integer riskScore,
            String riskLevel,
            String analysis) {

        this.message = message;
        this.riskScore = riskScore;
        this.riskLevel = riskLevel;
        this.analysis = analysis;
        this.scannedAt = LocalDateTime.now();
    }

    @PrePersist
    public void beforeSave() {
        if (scannedAt == null) {
            scannedAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Integer getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(Integer riskScore) {
        this.riskScore = riskScore;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public String getAnalysis() {
        return analysis;
    }

    public void setAnalysis(String analysis) {
        this.analysis = analysis;
    }

    public LocalDateTime getScannedAt() {
        return scannedAt;
    }

    public void setScannedAt(LocalDateTime scannedAt) {
        this.scannedAt = scannedAt;
    }
}
