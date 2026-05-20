const dotenv = require('dotenv');
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = process.env.PORT || 3000;
const NUTRITION_API_URL = process.env.NUTRITION_API_URL || '';
const NUTRITION_API_KEY = process.env.NUTRITION_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

console.log('Nutrition API Configuration:');
console.log('- Gemini API Key set:', Boolean(GEMINI_API_KEY));
console.log('- Custom API URL set:', Boolean(NUTRITION_API_URL));
console.log('- Custom API Key set:', Boolean(NUTRITION_API_KEY));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper to use Gemini 2.5 Flash for high-fidelity nutrition analysis
async function fetchGeminiNutrition({ meal, imageFile }) {
  if (!GEMINI_API_KEY) {
    return null;
  }

  try {
    const parts = [
      { text: "Analyze the nutrition of this meal. Estimate the calories (kcal), protein (g), carbohydrates (g), and fat (g) for the entire portion. Return ONLY a JSON object containing these keys: 'calories' (number), 'protein' (number), 'carbs' (number), 'fat' (number), and 'meal' (string, a short premium descriptive title of the meal like 'Avocado Toast with Salmon')." }
    ];

    if (imageFile) {
      parts.push({
        inlineData: {
          mimeType: imageFile.mimetype,
          data: imageFile.buffer.toString('base64'),
        }
      });
    }

    if (meal) {
      parts.push({ text: `User-provided meal description/context: ${meal}` });
    }

    console.log('[Gemini API] Requesting AI nutrition analysis...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              calories: { type: "INTEGER" },
              protein: { type: "NUMBER" },
              carbs: { type: "NUMBER" },
              fat: { type: "NUMBER" },
              meal: { type: "STRING" }
            },
            required: ["calories", "protein", "carbs", "fat", "meal"]
          }
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Gemini API] Error response:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      console.error('[Gemini API] Empty text candidate returned.');
      return null;
    }

    const parsed = JSON.parse(textResponse);
    return {
      calories: parsed.calories ?? 0,
      protein: parsed.protein ?? 0,
      carbs: parsed.carbs ?? 0,
      fat: parsed.fat ?? 0,
      raw: {
        meal: parsed.meal,
        source: 'Gemini 2.5 Flash'
      }
    };
  } catch (error) {
    console.error('[Gemini API] Connection failed:', error);
    return null;
  }
}

async function fetchExternalNutrition({ meal, imageFile }) {
  if (!NUTRITION_API_URL || !NUTRITION_API_KEY) {
    return null;
  }

  const headers = {
    Authorization: `Bearer ${NUTRITION_API_KEY}`,
    Accept: 'application/json',
  };

  try {
    let response;
    if (imageFile) {
      const formData = new FormData();
      // Convert Node Buffer to Blob for standard web fetch compatibility
      const fileBlob = new Blob([imageFile.buffer], { type: imageFile.mimetype });
      formData.append('image', fileBlob, imageFile.originalname);
      if (meal) formData.append('meal', meal);

      response = await fetch(NUTRITION_API_URL, {
        method: 'POST',
        headers,
        body: formData,
      });
    } else {
      const url = new URL(NUTRITION_API_URL);
      url.searchParams.set('meal', meal);
      response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });
    }

    if (!response.ok) {
      console.error('[External API] Returned error status:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return {
      calories: data.calories ?? data.energy_kcal ?? 0,
      protein: data.protein_g ?? data.protein ?? 0,
      carbs: data.carbohydrate_g ?? data.carbs ?? data.carbohydrates ?? 0,
      fat: data.fat_g ?? data.fat ?? 0,
      raw: data,
    };
  } catch (fetchError) {
    console.error('[External API] Fetch failed:', fetchError);
    return null;
  }
}

function estimateNutrition(meal) {
  const lower = meal ? meal.toLowerCase() : '';
  if (lower.includes('salad')) {
    return { calories: 220, protein: 8, carbs: 12, fat: 14, item: 'Mixed Salad' };
  }
  if (lower.includes('chicken')) {
    return { calories: 420, protein: 34, carbs: 10, fat: 18, item: 'Grilled Chicken Meal' };
  }
  if (lower.includes('pizza')) {
    return { calories: 520, protein: 22, carbs: 54, fat: 24, item: 'Pepperoni Pizza Slice' };
  }
  if (lower.includes('rice')) {
    return { calories: 360, protein: 7, carbs: 68, fat: 6, item: 'Brown Rice Plate' };
  }
  if (lower.includes('burger')) {
    return { calories: 610, protein: 28, carbs: 48, fat: 33, item: 'Double Cheeseburger' };
  }
  return { calories: 300, protein: 12, carbs: 25, fat: 16, item: meal || 'Meal estimation' };
}

app.get('/api/nutrition', async (req, res) => {
  const meal = (req.query.meal || '').trim();
  if (!meal) {
    return res.status(400).json({ error: 'Please provide a meal description.' });
  }

  // 1. Try Gemini
  const geminiData = await fetchGeminiNutrition({ meal });
  if (geminiData) {
    return res.json(geminiData);
  }

  // 2. Try custom external API
  const externalData = await fetchExternalNutrition({ meal });
  if (externalData) {
    return res.json(externalData);
  }

  // 3. Fallback to smart local estimation
  const data = estimateNutrition(meal);
  return res.json({
    calories: data.calories,
    protein: data.protein,
    carbs: data.carbs,
    fat: data.fat,
    raw: { meal: data.item, source: 'Local Fallback Engine' },
  });
});

app.post('/api/nutrition', upload.single('image'), async (req, res) => {
  const meal = (req.body.meal || '').trim();
  const hasImage = Boolean(req.file);
  if (!hasImage && !meal) {
    return res.status(400).json({ error: 'Please upload an image or provide a meal description.' });
  }

  // 1. Try Gemini
  const geminiData = await fetchGeminiNutrition({ meal, imageFile: req.file });
  if (geminiData) {
    return res.json(geminiData);
  }

  // 2. Try custom external API
  const externalData = await fetchExternalNutrition({ meal, imageFile: req.file });
  if (externalData) {
    return res.json(externalData);
  }

  // 3. Fallback to smart local estimation
  const data = estimateNutrition(meal || 'Uploaded Meal Image');
  return res.json({
    calories: data.calories,
    protein: data.protein,
    carbs: data.carbs,
    fat: data.fat,
    raw: {
      meal: data.item,
      imageUploaded: hasImage,
      filename: req.file ? req.file.originalname : null,
      source: 'Local Fallback Engine',
    },
  });
});

app.get('/api/status', (req, res) => {
  const isKeyActive = Boolean(GEMINI_API_KEY) && GEMINI_API_KEY !== 'YOUR_GEMINI_API_' && GEMINI_API_KEY !== '';
  res.json({ geminiActive: isKeyActive });
});

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
