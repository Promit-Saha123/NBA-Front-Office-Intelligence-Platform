export interface Game {
  game_id: string;
  game_date: string;
  home_team: string;
  away_team: string;
  predicted_winner: string;
  home_win_probability: number;
  away_win_probability: number;
  confidence: "High" | "Medium" | "Low";
}

export interface Accuracy {
  overall_accuracy: number;
  last_30_days_accuracy: number;
  total_games_predicted: number;
  correct_predictions: number;
}

export interface AccuracyTrend {
  month: string;
  acc: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchWithErrorHandling<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `API Error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      0,
      error instanceof Error ? error.message : "Unknown error occurred"
    );
  }
}

export const api = {
  getPredictionsToday: async (): Promise<Game[]> => {
    return fetchWithErrorHandling(`${API_URL}/predictions/today`);
  },

  getAccuracy: async (): Promise<Accuracy> => {
    return fetchWithErrorHandling(`${API_URL}/accuracy`);
  },

  getAccuracyTrend: async (): Promise<AccuracyTrend[]> => {
    return fetchWithErrorHandling(`${API_URL}/accuracy/trend`);
  },
};
