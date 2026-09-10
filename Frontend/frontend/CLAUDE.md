@AGENTS.md

## NBA Predictor Frontend

A Next.js application for displaying AI-powered NBA game predictions and accuracy analytics. Built with React 19, TypeScript, Tailwind CSS, and Recharts for data visualization.

**Features:**
- Real-time game predictions with confidence levels
- Season accuracy tracking and trend analytics
- Monthly accuracy trends chart
- Responsive design for mobile and desktop

**API Integration:**
- `/predictions/today` - Get today's game predictions
- `/accuracy` - Get overall accuracy metrics
- `/accuracy/trend` - Get monthly accuracy trends

**Getting Started:**
1. Set up `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server
4. Navigate to `http://localhost:3000`

