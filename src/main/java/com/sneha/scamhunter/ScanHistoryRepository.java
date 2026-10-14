
package com.sneha.scamhunter;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ScanHistoryRepository
        extends JpaRepository<ScanHistory, Long> {
            long countByRiskLevelIgnoreCase(String riskLevel);
}
