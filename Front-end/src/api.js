const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

if (!API_BASE_URL) {
  throw new Error("VITE_API_URL is missing. Configure it in Front-end/.env");
}

export default API_BASE_URL;