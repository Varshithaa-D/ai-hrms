import { Router, Request, Response } from 'express';

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ── 1. Explicit Health Check ──
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/health`);
    const data = await response.json();
    res.json(data);
  } catch {
    res.status(503).json({ status: 'AI Service offline' });
  }
});

// ── 2. UNIVERSAL JSON PROXY ──
// This automatically handles EXS, Copilot, Interview, Scorecard, JD Generator, etc!
router.all('*', async (req: Request, res: Response): Promise<void> => {
  console.log(`=== 🤖 AI ROUTE HIT: ${req.path} ===`);
  try {
    const response = await fetch(`${AI_SERVICE_URL}/ai${req.path}`, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      // Only attach a body if it's not a GET request
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error(`AI proxy error on ${req.path}:`, error);
    res.status(500).json({ message: 'AI Service is offline or unreachable' });
  }
});

export default router;