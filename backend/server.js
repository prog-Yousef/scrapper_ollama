const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

const OLLAMA_API = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'deepseek-r1:1.5b';

async function getStructuredData(content) {
    const prompt = `[INST]
    Analyze this website content and extract:
    1. Main title/heading
    2. Primary description
    3. 5-7 key keywords
    4. List of projects (name, description, technologies)
    5. Contact information (if available)
    6. List frequency of words in the text and the most common words

    Format as strict JSON:
    {
        "title": "",
        "description": "",
        "keywords": [],
        "projects": [
            {
                "name": "",
                "description": "",
                "technologies": []
            }
        ],
        "contact": {
            "email": "",
            "social_media": []
        },
        "word_frequency": {
            "most_common_words": [],
            "frequencies": {}
        }
    }
    [/INST]

    Website Content:
    ${content.substring(0, 2500)}`;

    try {
        const response = await axios.post(OLLAMA_API, {
            model: MODEL_NAME,
            prompt: prompt,
            format: 'json',
            stream: false,
            options: {
                temperature: 0.1,
                num_predict: 600,
                top_k: 40,
                top_p: 0.9
            }
        });

        const rawResponse = response.data.response;
        const jsonStart = rawResponse.indexOf('{');
        const jsonEnd = rawResponse.lastIndexOf('}') + 1;

        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error('Invalid JSON response from Ollama');
        }

        const jsonResponse = rawResponse.substring(jsonStart, jsonEnd);
        return JSON.parse(jsonResponse);
    } catch (error) {
        console.error('Error processing data:', error.message);
        throw new Error('Failed to process website content');
    }
}

app.post('/scrape', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'No URL provided' });
        }

        const websiteResponse = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const websiteContent = typeof websiteResponse.data === 'object' 
            ? JSON.stringify(websiteResponse.data) 
            : websiteResponse.data;

        const structuredData = await getStructuredData(websiteContent);
        res.json(structuredData);
    } catch (error) {
        console.error('Server error:', error.message);
        res.status(500).json({ 
            error: error.response?.data?.error || error.message || 'Unknown error occurred'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});