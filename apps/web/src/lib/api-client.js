/**
 * API Client for Fresh Backoffice
 * Handles all HTTP requests with authentication via HttpOnly cookies
 */

const API_BASE = "/api";

class ApiClient {
  async request(endpoint, options = {}) {
    const headers = { ...options.headers };
    if (!options.isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: "include", // Ensures HttpOnly cookies are attached securely
    });

    // Handle 401 Unauthorized - redirect to login
    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      !endpoint.includes("/auth/") &&
      endpoint !== "/auth/me"
    ) {
      window.location.href = "/login";
    }

    const data = await response.json();

    if (!response.ok) {
      // Handle:
      // - { error: "message" }
      // - { message: "message" }
      // - { error: { message, code, details } } (our standard API shape)
      const errorMessage =
        (typeof data?.error === "string" ? data.error : data?.error?.message) ||
        data?.message ||
        "Request failed";
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  get(endpoint, params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, value);
      }
    });
    const query = searchParams.toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url);
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  postFormData(endpoint, formData) {
    return this.request(endpoint, {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  patch(endpoint, data) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  delete(endpoint, data) {
    return this.request(endpoint, {
      method: "DELETE",
      ...(data !== undefined && { body: JSON.stringify(data) }),
    });
  }
}

export const api = new ApiClient();
export default api;
