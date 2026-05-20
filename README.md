 Overview
Bite is a full-stack AI nutrition analyzer that estimates calories, protein, carbohydrates, and fat for any meal — in seconds. Just type a meal name or drag and drop a food photo, and Bite does the rest.
Powered by Google Gemini 2.5 Flash, Bite delivers accurate, real-world nutrition estimates with a daily tracking dashboard to help you stay on top of your macros.

✨ Features

🤖 AI-Powered Analysis — Uses Gemini 2.5 Flash to analyze meal descriptions and food images with high accuracy
📸 Image Upload — Drag & drop or browse to upload a meal photo; Gemini Vision identifies the food and estimates macros
✍️ Text Input — Describe your meal in natural language (e.g. "2 wheat chapatis, 1 bowl dal tadka, and stir-fried paneer")
⚡ Quick Sample Chips — One-click sample meals (Salad, Chicken, Pizza, Burger, Salmon Toast) for instant demos
📊 Macro Breakdown — Visual progress bars showing Calories, Protein, Carbs, and Fat against daily targets
📅 Daily Dashboard — Auto-logs every analyzed meal; tracks aggregate daily totals with running macro percentages
🌗 Dark / Light Mode — Persistent theme toggle saved to localStorage
🔄 Three-tier Fallback — Gemini AI → Custom Nutrition API → Smart Local Estimator (always returns a result)
📱 Responsive Design — Works seamlessly on desktop and mobile


🚀 Quick Start
Prerequisites

Node.js v18 or higher
A Google Gemini API Key (free tier available)

1. Clone the Repository
bashgit clone https://github.com/amrit8936/nutrition-analyzer.git
cd nutrition-analyzer
2. Set Up Environment Variables
bashcp .env.example .env
Open .env and configure your API key:
envPORT=3000


💡 Get a free Gemini API key at aistudio.google.com. No credit card required.

3. Install Dependencies & Run
bashnpm install
npm run dev
4. Open in Browser
http://localhost:5173
The React frontend (Vite, port 5173) proxies API requests to the Express backend (port 3000) automatically.

📁 Project Structure
nutrition-analyzer/
├── backend/
│   └── server.js          # Express API server
├── frontend/
│   ├── index.html         # React root HTML
│   ├── vite.config.mjs    # Vite + proxy configuration
│   └── src/
│       ├── main.jsx       # React entry point
│       ├── App.jsx        # Main application component
│       └── index.css      # Global styles
├── legacy/
│   ├── app.js             # Original vanilla JS prototype
│   ├── bite.js            # Legacy logic
│   └── styles.css         # Legacy styles
├── .env.example           # Environment variable template
├── package.json           # Dependencies and scripts
└── README.md

🔌 API Reference
GET /api/nutrition
Analyze a meal by text description.
ParameterTypeRequiredDescriptionmealstring✅ YesMeal description
Example:
bashcurl "http://localhost:3000/api/nutrition?meal=grilled+chicken+with+rice"
Response:
json{
  "calories": 420,
  "protein": 34,
  "carbs": 42,
  "fat": 9,
  "raw": {
    "meal": "Grilled Chicken Breast with Brown Rice",
    "source": "Gemini 2.5 Flash"
  }
}

POST /api/nutrition
Analyze a meal by image upload (with optional description).
FieldTypeRequiredDescriptionimagefile✅ (or meal)Food photo (multipart)mealstringOptionalExtra context
Example:
bashcurl -X POST http://localhost:3000/api/nutrition \
  -F "image=@/path/to/meal.jpg" \
  -F "meal=lunch plate"

GET /api/status
Check if the Gemini API key is active.
Response:
json{ "geminiActive": true }

🧠 How It Works
Bite uses a three-tier fallback system to guarantee a result every time:
User Input (text or image)
        │
        ▼
  ┌─────────────┐     ✅ Success
  │  Gemini AI  │ ──────────────────► Return AI result
  └─────────────┘
        │ ❌ No API key / error
        ▼
  ┌──────────────────┐  ✅ Success
  │ Custom API       │ ──────────────► Return external result
  └──────────────────┘
        │ ❌ Not configured / error
        ▼
  ┌───────────────────┐
  │ Local Estimator   │ ──────────────► Return smart estimate
  └───────────────────┘
The local estimator uses keyword matching (salad, chicken, pizza, rice, burger, etc.) to return realistic fallback values — so the app is always functional, even without any API key.

🛠 Tech Stack
LayerTechnologyFrontendReact 18, Vite 5BackendNode.js, Express 4AI EngineGoogle Gemini 2.5 Flash (Vision + Text)StylingVanilla CSS (custom properties, dark mode)File UploadMulter (in-memory storage)Dev ToolsConcurrently, dotenv

📜 Available Scripts
CommandDescriptionnpm run devStart both frontend (Vite) and backend concurrentlynpm run serverStart Express backend only (port 3000)npm run buildBuild React app to dist/ for productionnpm startServe production build via Express

🌐 Production Deployment

Build the frontend:

bashnpm run build

The Express server will automatically serve the dist/ folder. Start with:

bashnpm start

Make sure your .env file is set on the server with a valid GEMINI_API_KEY.


🤝 Contributing
Contributions are welcome! Please:

Fork the repository
Create a feature branch: git checkout -b feat/your-feature
Commit your changes: git commit -m "feat: add your feature"
Push and open a Pull Request


📄 License
This project is licensed under the MIT License — see the LICENSE file for details.

<div align="center">
Made with 🥗 by amrit8936
⭐ Star this repo if you found it useful!
</div>
