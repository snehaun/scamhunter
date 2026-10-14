
package com.sneha.scamhunter;

import org.springframework.stereotype.Service;
import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;

@Service
public class GeminiService {

    private final Client client;

    public GeminiService() {
        this.client = new Client();
    }

    public String analyzeMessage(String message) {

        String prompt = """
            You are a scam detection assistant.

            Analyze the following message for possible scams.

            Explain:
            1. Whether it appears safe, suspicious, or highly suspicious.
            2. The warning signs you found.
            3. What the recipient should do next.

            Do not assume a message is a scam based on one keyword alone.
            Consider the full context.

            Message:
            """ + message;

        GenerateContentResponse response =
                client.models.generateContent(
                      "gemini-3.5-flash-lite",
                        prompt,
                        null
                );

        return response.text();
    }
}
