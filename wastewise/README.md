# WasteWise

WasteWise is an intelligent, AI-powered platform designed to help users identify, manage, and sustainably repurpose expired products, food peels, waste packaging, and old electronics. With a focus on safety and environmental impact, the application provides personalized and actionable suggestions utilizing multiple AI models and APIs.

## 🌟 Key Features

*   **Smart AI Image Scanning:** Upload or capture an image of your waste. The system automatically detects the product type, extracts relevant metadata (brand, ingredients, condition, etc.), and auto-fills the analysis form.
*   **Multi-Category Support:** Handles four primary categories of waste:
    *   Expired Products (dairy, cosmetics, packaged food, etc.)
    *   Food Peels & Scraps
    *   Waste Packaging (glass, plastic, cardboard, etc.)
    *   Old Electronics (phones, laptops, appliances)
*   **Resilient AI Pipeline:** Integrates multiple AI models to ensure high availability:
    *   **Primary Vision:** Gemini Vision API for deep image analysis.
    *   **Vision Fallback:** Automatic fallback to Groq (`meta-llama/llama-4-scout-17b-16e-instruct`) if Gemini hits rate limits.
    *   **Fast-Track Mode:** A smart, heuristic-based fallback system that provides instant suggestions if AI APIs time out or fail.
*   **Safety First:** Includes a robust Safety Gate that checks for toxic components (e.g., avocado for pets, mould detection) and warns against unsafe repurposing, ensuring user and animal safety.
*   **Modern, Premium UI:** Built with React, Tailwind CSS, and a custom design system featuring glassmorphism, micro-animations, and responsive layouts.

## 🚀 Tech Stack

### Frontend
*   **Framework:** React (via Vite)
*   **Routing:** React Router v6
*   **State Management:** Zustand
*   **Styling:** Custom CSS with Tailwind CSS concepts
*   **Icons:** Lucide React
*   **Notifications:** React Hot Toast

### Backend
*   **Server:** Node.js with Express
*   **Database:** MySQL (connection pool configured)
*   **File Uploads:** Multer (Memory Storage)
*   **AI Integrations:**
    *   Google Gemini (Vision and Web Search)
    *   Groq (Fast reasoning and Vision fallback)
    *   OpenRouter (Deep reasoning)
    *   Tavily (Web Search)

## 🛠️ Project Structure

```
WASTE-WISE/
├── frontend/             # React SPA
│   ├── src/
│   │   ├── components/   # Reusable UI components (Buttons, Cards, Forms)
│   │   ├── pages/        # Main route views (Home, Scan, Login, etc.)
│   │   ├── utils/        # API helpers and frontend utilities
│   │   ├── index.css     # Global styles and design tokens
│   │   └── App.jsx       # Root component and routing
│   └── package.json
├── backend/              # Express API Server
│   ├── controllers/      # Route handlers
│   ├── middleware/       # Auth and file upload middleware
│   ├── routes/           # Express router definitions
│   ├── services/         # AI services (Gemini, Groq, FastTrack, Pipeline)
│   ├── utils/            # Helper functions (weather, distance, etc.)
│   └── package.json
└── README.md
```

## ⚙️ Setup and Installation

### Prerequisites
*   Node.js (v18+ recommended)
*   MySQL Server

### 1. Database Setup
1. Open your MySQL client (e.g., phpMyAdmin).
2. Create a database named `wastewise`.
3. Import the `backend/database-schema.sql` file to create the necessary tables.

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory with the following variables:
```env
# Server config
NODE_ENV=development
PORT=5000

# Database config
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wastewise

# Authentication
JWT_SECRET=your_super_secret_jwt_key

# External APIs
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
TAVILY_API_KEY=your_tavily_api_key
```

Create a `.env` file in the `frontend/` directory:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 4. Run the Application
Start the backend server:
```bash
cd backend
npm run dev
# Server will start on http://localhost:5000
```

Start the frontend development server (in a new terminal):
```bash
cd frontend
npm run dev
# App will be accessible at http://localhost:5173
```

## 💡 How It Works

1. **Upload:** User uploads an image on the Scan Page via the **Quick AI Image Scan**.
2. **Analysis:** The frontend sends the image as `multipart/form-data` to the backend `/api/scan/vision` endpoint.
3. **AI Processing:** 
   * The backend calls Gemini to extract product details. 
   * If Gemini fails (e.g., 429 error), it seamlessly falls back to Groq's Vision model.
4. **Auto-Fill:** The extracted data (category, name, ingredients, expiry, risks) is returned to the frontend to instantly auto-fill the user's form.
5. **Submission:** The user completes any remaining fields (like quantity) and submits.
6. **Deep Pipeline:** The backend runs the full `analysisPipeline`, passing through decomposition, safety gates, and generating tailored suggestions (composting, recycling, animal feed warnings).

## 🛡️ License

This project is open-source and available under the MIT License.
