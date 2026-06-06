import Groq from 'groq-sdk';

// Groq client for backend use (fast LLM calls from Node)
export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// AI service base URL (Python FastAPI)
export const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Helper to call AI service
export const callAIService = async (endpoint: string, data: object) => {
  const res = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`AI service error: ${res.status}`);
  return res.json();
};
