const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cheerio = require('cheerio');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

const OLLAMA_API = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'deepseek-r1:1.5b';

function validateStructure(data) {
    const template = {
        title: "Untitled Website",
        description: "No description available",
        keywords: ["general"],
        projects: [{
            name: "Main Project",
            description: "Primary project or service"
        }],
        contact: {
            email: "info@example.com",
            social_media: ["https://example.com/social"]
        },
        word_frequency: {
            most_common_words: ["website", "content"],
            frequencies: { "website": 1, "content": 1 }
        }
    };

    // Deep merge with validation
    const merged = JSON.parse(JSON.stringify(template));
    
    const mergeObjects = (target, source) => {
        Object.keys(source).forEach(key => {
            if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
                target[key] = mergeObjects(target[key] || {}, source[key]);
            } else if (source[key] !== undefined && source[key] !== null) {
                target[key] = source[key];
            }
        });
        return target;
    };

    return mergeObjects(merged, data);
}

async function getStructuredData(content) {
    const prompt = `[INST]
    Generate STRICT VALID JSON response. Follow these rules:
    1. Use double quotes only
    2. Escape internal quotes with \\
    3. Maintain this exact structure:
    {
        "title": "string (from heading)",
        "description": "string (first meaningful paragraph)",
        "keywords": ["array", "of", "5-10", "terms"],
        "projects": [{"name": "string", "description": "string"}],
        "contact": {"email": "string", "social_media": ["url1", "url2"]},
        "word_frequency": {"most_common_words": ["list"], "frequencies": {"word": count}}
    }

    Content to analyze:
    ${content.substring(0, 3500)}
    [/INST]

    {\n`;

    try {
        const response = await axios.post(OLLAMA_API, {
            model: MODEL_NAME,
            prompt: prompt,
            format: 'json',
            stream: false,
            options: {
                temperature: 0.1,
                num_predict: 2500,
                top_k: 40,
                top_p: 0.8,
                stop: ['}\n']
            }
        });

        const rawResponse = response.data.response;
        console.log('Raw Model Response:', rawResponse); // Debug log

        // Enhanced JSON cleaning
        let jsonString = rawResponse
            .replace(/^[^{]*/, '') // Remove leading non-JSON
            .replace(/[^}]*$/, '') // Remove trailing non-JSON
            .replace(/'/g, '"')    // Convert single quotes
            .replace(/(\w+):/g, '"$1":') // Quote keys
            .replace(/\\"/g, '"')  // Unescape quotes
            .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
            .replace(/"\s*:/g, '":') // Fix spacing after keys
            .replace(/:\s*([^"\s{]+)/g, ': "$1"'); // Quote unquoted values

        // Balance brackets
        const openCount = (jsonString.match(/{/g) || []).length;
        const closeCount = (jsonString.match(/}/g) || []).length;
        if (openCount > closeCount) jsonString += '}'.repeat(openCount - closeCount);

        // Multi-stage parsing attempts
        try {
            return validateStructure(JSON.parse(jsonString));
        } catch (primaryError) {
            console.warn('Primary parse failed, trying recovery...');
            
            // Attempt to find valid JSON substring
            const jsonMatch = jsonString.match(/{[\s\S]*?}(?=\s*[^{]*$)/);
            if (jsonMatch) {
                try {
                    return validateStructure(JSON.parse(jsonMatch[0]));
                } catch (e) {
                    console.warn('Substring parse failed:', e.message);
                }
            }

            // Final fallback: Manual extraction
            const manualData = {
                title: jsonString.match(/"title"\s*:\s*"([^"]*)"/)?.[1],
                description: jsonString.match(/"description"\s*:\s*"([^"]*)"/)?.[1],
                keywords: jsonString.match(/"keywords"\s*:\s*\[([^\]]*)\]/)?.[1]
                    .split(',')
                    .map(k => k.trim().replace(/"/g, ''))
                    .filter(k => k)
            };

            return validateStructure(manualData);
        }
    } catch (error) {
        console.error('Processing error:', error.message);
        return validateStructure({});
    }
}

app.post('/scrape', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url || !/^https?:\/\/\S+$/i.test(url.trim())) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const targetUrl = url.trim();
        
        const websiteResponse = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            },
            timeout: 30000,
            maxRedirects: 5
        });

        const $ = cheerio.load(websiteResponse.data);
        
        // Improved content extraction
        const content = [
            $('h1, h2, h3').text(),
            $('article').text(),
            $('main').text(),
            $('p').not('footer p, nav p').text()
        ].join(' ')
         .replace(/\s+/g, ' ')
         .replace(/[^\w\s.,!?\-@]/g, '')
         .trim()
         .substring(0, 4000);

        if (content.length < 300) {
            return res.status(400).json({
                error: 'Insufficient content',
                extracted: content.substring(0, 200) + '...'
            });
        }

        const structuredData = await getStructuredData(content);
        res.json(structuredData);

    } catch (error) {
        const statusMap = {
            ECONNABORTED: 504,
            ENOTFOUND: 404,
            ECONNREFUSED: 503
        };
        
        res.status(statusMap[error.code] || 500).json({
            error: error.message.includes('timeout') 
                ? 'Website response timed out' 
                : error.message,
            details: error.config?.url ? `Failed to process ${error.config.url}` : undefined
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});