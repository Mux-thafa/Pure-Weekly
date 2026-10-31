import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { analyzeManuscriptHeuristics } from './src/utils/editorialLogic.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

app.post('/api/ai-check', async (req, res) => {
  const { title = '', subtitle = '', content = '', language = 'en', section = 'fiction' } = req.body || {};

  if (!content || typeof content !== 'string' || !content.trim()) {
    res.status(400).json({ error: 'Manuscript content is required for AI authenticity analysis.' });
    return;
  }

  const fallback = analyzeManuscriptHeuristics(content, title);
  const ai = getGeminiClient();

  if (!ai) {
    res.json({
      ...fallback,
      source: 'editorial-heuristics'
    });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Analyze the following literary submission for AI-generated vs. authentic human authorship.
Language: ${language}
Section: ${section}
Title: ${title}
Subtitle: ${subtitle}
Manuscript:
${content.slice(0, 6000)}`,
      config: {
        systemInstruction:
          'You are the Chief Literary Authenticity Auditor at Safwa Publishers. Estimate the percentage probability (0 to 100) that the submitted text was written by AI rather than a human author. Provide a concise 1-sentence editorial verdict and 2 brief linguistic signals.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aiScore: {
              type: Type.INTEGER,
              description: 'Estimated AI generation probability percentage from 0 to 100.'
            },
            aiVerdict: {
              type: Type.STRING,
              description: 'Concise 1-sentence editorial verdict on authorship authenticity.'
            },
            signals: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 brief stylistic or linguistic observations.'
            }
          },
          required: ['aiScore', 'aiVerdict', 'signals']
        }
      }
    });

    const rawText = (response.text ?? '').trim();
    const parsed = JSON.parse(rawText);
    const aiScore = Math.max(0, Math.min(100, Math.round(Number(parsed.aiScore ?? fallback.aiScore))));
    const aiVerdict = String(parsed.aiVerdict || fallback.aiVerdict).slice(0, 500);
    const signals = Array.isArray(parsed.signals)
      ? parsed.signals.map((s: unknown) => String(s)).slice(0, 3)
      : fallback.signals;

    res.json({
      aiScore,
      aiVerdict,
      signals,
      source: 'gemini-3.8-flash'
    });
  } catch (_error) {
    // Graceful fallback if API key is invalid or quota is exceeded
    res.json({
      ...fallback,
      source: 'editorial-heuristics'
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Safwa Publishers server listening on http://localhost:${PORT}`);
  });
}

startServer();
