// File_name: src\utils\apiClient.ts
import { BASE_URL } from "../config/constants";

const apiClient = {
    get: async (endpoint: string) => {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return response.json();
    }
  };