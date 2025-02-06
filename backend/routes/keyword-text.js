const express = require('express');
const router = express.Router();
const axios = require('axios');

const OLLAMA_API = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'deepseek-r1:8b';

router.post('/', async (req, res) => {
    const { text } = req.body;
   
    try {
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const prompt = `[INST]
Extrahera endast relevanta nyckelord på svenska.
Returnera ENDAST en JSON-array med nyckelord.
Inga förklaringar eller tänkande ska inkluderas.
Format: ["nyckelord1", "nyckelord2", "nyckelord3"]
Text att analysera:
${text}
[/INST]`;

        const ollamaResponse = await axios.post(OLLAMA_API, {
            model: MODEL_NAME,
            prompt,
            stream: false,
            options: {
                temperature: 0.2,
                num_predict: 2500,
                top_k: 40,
                top_p: 0.9,
                stop: ["]"]
            }
        });

        const rawResponse = ollamaResponse.data.response.trim();
        let keywords = [];
       
        if (rawResponse) {
            try {
                // Filtrera bort allt innan den första [
                const jsonStartIndex = rawResponse.indexOf('[');
                if (jsonStartIndex !== -1) {
                    const jsonPart = rawResponse.substring(jsonStartIndex) + ']';
                    keywords = JSON.parse(jsonPart)
                        .filter(keyword => 
                            !keyword.includes('<think>') && 
                            !keyword.startsWith('so I') &&
                            !keyword.includes('```json') &&
                            keyword.trim().length > 0
                        );
                }
            } catch (e) {
                const cleanedResponse = rawResponse
                    .replace(/<think>[\s\S]*?<\/think>/g, '')  // Ta bort think-block
                    .replace(/```json/g, '')  // Ta bort json-markörer
                    .replace(/[\[\]"]/g, ''); // Ta bort hakparenteser och citattecken
                
                keywords = cleanedResponse
                    .split(',')
                    .map(k => k.trim())
                    .filter(k => k.length > 0 && !k.includes('<think>'));
            }
        }

        res.json({
            keywords: keywords
        });

    } catch (error) {
        res.status(500).json({
            error: error.message,
            keywords: []
        });
    }
});

module.exports = router