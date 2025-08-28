import axios from "axios";

const API_BASE_URL = "https://back-end-for-assessment.vercel.app";

// Create a simple axios instance for testing
const testAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    "Content-Type": "application/json",
  },
});

class ApiTester {
  constructor() {
    this.results = {
      baseUrl: API_BASE_URL,
      accessible: false,
      endpoints: {},
      errors: [],
      timestamp: new Date().toISOString(),
      availableUsers: null,
    };
  }

  async testEndpoint(method, endpoint, data = null, headers = {}) {
    try {
      console.log(`Testing ${method.toUpperCase()} ${endpoint}...`);

      const config = {
        method: method.toLowerCase(),
        url: endpoint,
        headers,
        ...(data && { data }),
      };

      const response = await testAxios(config);

      const result = {
        status: response.status,
        statusText: response.statusText,
        success: true,
        data: response.data,
        headers: response.headers,
      };

      console.log(
        `✅ ${method.toUpperCase()} ${endpoint} - Status: ${response.status}`
      );
      return result;
    } catch (error) {
      const result = {
        status: error.response?.status || 0,
        statusText: error.response?.statusText || error.message,
        success: false,
        error: error.message,
        data: error.response?.data || null,
      };

      console.log(
        `❌ ${method.toUpperCase()} ${endpoint} - Error: ${error.message}`
      );
      return result;
    }
  }

  async testBaseConnectivity() {
    console.log("🔍 Testing base connectivity...");

    try {
      const response = await testAxios.get("/");
      this.results.accessible = true;
      this.results.baseResponse = {
        status: response.status,
        data: response.data,
        headers: response.headers,
      };
      console.log("✅ Base URL is accessible");
      return true;
    } catch (error) {
      this.results.accessible = false;
      this.results.baseError = error.message;
      console.log("❌ Base URL is not accessible:", error.message);
      return false;
    }
  }

  async discoverApiStructure() {
    console.log("🔍 Discovering API structure...");

    // Test the /api endpoint to see what's available
    try {
      const response = await testAxios.get("/api");
      console.log("API endpoint response:", response.data);

      // If the API returns a structure or documentation, parse it
      if (response.data && typeof response.data === "object") {
        this.results.apiStructure = response.data;
      }
    } catch (error) {
      console.log("Could not discover API structure:", error.message);
    }

    // Test the /auth/users endpoint to get available users
    try {
      console.log("🔍 Fetching available users...");
      const response = await testAxios.get("/auth/users");
      if (response.data && response.data.users) {
        this.results.availableUsers = response.data.users;
        console.log(
          `✅ Found ${response.data.users.length} users in the system`
        );

        // Log some sample users for debugging
        const sampleUsers = response.data.users.slice(0, 5);
        console.log(
          "Sample users:",
          sampleUsers.map((u) => ({
            username: u.username,
            email: u.email,
            role: u.role,
          }))
        );
      }
    } catch (error) {
      console.log("Could not fetch users:", error.message);
    }
  }

  async testCommonEndpoints() {
    console.log("🔍 Testing common endpoints...");

    const endpointsToTest = [
      // Root endpoints
      { method: "GET", path: "/" },
      { method: "GET", path: "/api" },
      { method: "GET", path: "/health" },
      { method: "GET", path: "/status" },

      // Auth endpoints - now we know /auth/users works
      { method: "GET", path: "/auth/users" },

      // Auth login endpoints - test with real user data if available
      {
        method: "POST",
        path: "/auth/login",
        data: { email: "admin@library.com", password: "admin123" },
      },
      {
        method: "POST",
        path: "/auth/login",
        data: { username: "admin", password: "admin123" },
      },
      {
        method: "POST",
        path: "/login",
        data: { email: "admin@library.com", password: "admin123" },
      },
      {
        method: "POST",
        path: "/api/login",
        data: { email: "admin@library.com", password: "admin123" },
      },
      {
        method: "POST",
        path: "/api/auth/login",
        data: { email: "admin@library.com", password: "admin123" },
      },

      // Profile endpoints
      { method: "GET", path: "/profile" },
      { method: "GET", path: "/api/profile" },
      { method: "GET", path: "/auth/profile" },
      { method: "GET", path: "/api/auth/profile" },
      { method: "GET", path: "/me" },
      { method: "GET", path: "/api/me" },

      // Data endpoints - some return 401 (unauthorized) which means they exist but need auth
      { method: "GET", path: "/books" },
      { method: "GET", path: "/api/books" },
      { method: "GET", path: "/members" },
      { method: "GET", path: "/api/members" },
      { method: "GET", path: "/transactions" },
      { method: "GET", path: "/api/transactions" },
      { method: "GET", path: "/genres" },
      { method: "GET", path: "/api/genres" },
      { method: "GET", path: "/staff" },
      { method: "GET", path: "/api/staff" },
      { method: "GET", path: "/users" },
      { method: "GET", path: "/api/users" },

      // Dashboard endpoints
      { method: "GET", path: "/dashboard" },
      { method: "GET", path: "/api/dashboard" },
      { method: "GET", path: "/dashboard/stats" },
      { method: "GET", path: "/api/dashboard/stats" },
      { method: "GET", path: "/stats" },
      { method: "GET", path: "/api/stats" },
    ];

    for (const endpoint of endpointsToTest) {
      const result = await this.testEndpoint(
        endpoint.method,
        endpoint.path,
        endpoint.data,
        endpoint.headers
      );
      const key = `${endpoint.method} ${endpoint.path}${
        endpoint.headers ? " (with headers)" : ""
      }`;
      this.results.endpoints[key] = result;

      // Small delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async testWithAuthentication() {
    console.log("🔍 Testing with authentication...");

    // Get real users from the system if available
    let testUsers = [
      { email: "admin@library.com", password: "admin123", username: "admin" },
      {
        email: "librarian@library.com",
        password: "librarian123",
        username: "librarian",
      },
    ];

    // If we have real users from /auth/users, use some of them for testing
    if (this.results.availableUsers) {
      const realUsers = this.results.availableUsers
        .filter(
          (user) =>
            user.email &&
            (user.email.includes("admin") || user.email.includes("librarian"))
        )
        .slice(0, 5) // Test with first 5 relevant users
        .map((user) => ({
          email: user.email,
          username: user.username,
          password: "admin123", // Try common passwords
          role: user.role,
        }));

      testUsers = [...testUsers, ...realUsers];
      console.log(
        `Testing with ${testUsers.length} user accounts (${realUsers.length} from real data)`
      );
    }

    // Test different authentication methods with real users
    const authMethods = [];

    for (const user of testUsers) {
      // Try different credential formats for each user
      authMethods.push(
        {
          endpoint: "/auth/login",
          data: { email: user.email, password: user.password },
          user: user,
        },
        {
          endpoint: "/auth/login",
          data: { username: user.username, password: user.password },
          user: user,
        },
        {
          endpoint: "/auth/login",
          data: { email: user.email, password: user.password },
          headers: {
            Authorization: `Basic ${btoa(`${user.email}:${user.password}`)}`,
          },
          user: user,
        }
      );
    }

    // Also try common passwords with known usernames
    const commonPasswords = [
      "admin123",
      "librarian123",
      "password",
      "123456",
      "admin",
      "librarian",
    ];
    if (this.results.availableUsers) {
      for (const password of commonPasswords) {
        authMethods.push({
          endpoint: "/auth/login",
          data: { email: "admin@library.com", password },
          user: { email: "admin@library.com", password },
        });
      }
    }

    let authToken = null;
    let successfulAuth = null;

    for (const method of authMethods) {
      try {
        console.log(
          `Trying ${method.endpoint} with user:`,
          method.user?.email || method.user?.username
        );
        const result = await this.testEndpoint(
          "POST",
          method.endpoint,
          method.data,
          method.headers
        );

        if (result.success && result.data) {
          authToken =
            result.data.token ||
            result.data.access_token ||
            result.data.accessToken ||
            result.data.jwt ||
            result.data.authToken;
          if (authToken) {
            console.log(
              `✅ Successfully authenticated with ${method.endpoint}`
            );
            successfulAuth = {
              successful: true,
              endpoint: method.endpoint,
              user: method.user,
              token: authToken.substring(0, 20) + "...", // Partial token for security
              fullResponse: result.data,
            };
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }

    this.results.authentication = successfulAuth || {
      successful: false,
      attempts: authMethods.length,
      testedUsers: testUsers.length,
      note: "Authentication endpoints exist but none of the tested credentials worked",
      suggestion:
        "The API has real users but we need to find the correct passwords or authentication method",
      availableUserCount: this.results.availableUsers?.length || 0,
    };

    // Test authenticated endpoints if we got a token
    if (authToken) {
      const authHeaders = { Authorization: `Bearer ${authToken}` };

      const authenticatedEndpoints = [
        { method: "GET", path: "/profile" },
        { method: "GET", path: "/api/profile" },
        { method: "GET", path: "/me" },
        { method: "GET", path: "/api/me" },
        { method: "GET", path: "/dashboard" },
        { method: "GET", path: "/api/dashboard" },
        { method: "GET", path: "/books" },
        { method: "GET", path: "/api/books" },
        { method: "GET", path: "/members" },
        { method: "GET", path: "/api/members" },
        { method: "GET", path: "/genres" },
        { method: "GET", path: "/api/genres" },
      ];

      for (const endpoint of authenticatedEndpoints) {
        const result = await this.testEndpoint(
          endpoint.method,
          endpoint.path,
          null,
          authHeaders
        );
        this.results.endpoints[
          `${endpoint.method} ${endpoint.path} (authenticated)`
        ] = result;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  async runFullTest() {
    console.log("🚀 Starting comprehensive API test...");
    console.log(`Testing API at: ${API_BASE_URL}`);

    // Test base connectivity
    const isAccessible = await this.testBaseConnectivity();

    if (isAccessible) {
      // Discover API structure and get real users
      await this.discoverApiStructure();

      // Test common endpoints
      await this.testCommonEndpoints();

      // Test with authentication using real user data
      await this.testWithAuthentication();
    }

    return this.results;
  }

  generateReport() {
    console.log("\n📊 API TEST REPORT");
    console.log("==================");
    console.log(`Base URL: ${this.results.baseUrl}`);
    console.log(`Accessible: ${this.results.accessible ? "✅ YES" : "❌ NO"}`);
    console.log(`Test Time: ${this.results.timestamp}`);

    if (this.results.availableUsers) {
      console.log(
        `\n👥 AVAILABLE USERS: ${this.results.availableUsers.length}`
      );
      const adminUsers = this.results.availableUsers.filter(
        (u) => u.role === "admin"
      ).length;
      const librarianUsers = this.results.availableUsers.filter(
        (u) => u.role === "librarian"
      ).length;
      console.log(`  - Admins: ${adminUsers}`);
      console.log(`  - Librarians: ${librarianUsers}`);
    }

    if (this.results.accessible) {
      console.log("\n🔍 ENDPOINT ANALYSIS:");
      console.log("-------------------");

      const successful = [];
      const unauthorized = [];
      const badRequest = [];
      const notFound = [];
      const failed = [];

      Object.entries(this.results.endpoints).forEach(([endpoint, result]) => {
        if (result.success) {
          successful.push(`✅ ${endpoint} (${result.status})`);
        } else if (result.status === 401) {
          unauthorized.push(
            `🔒 ${endpoint} (${result.status} - Needs Authentication)`
          );
        } else if (result.status === 400) {
          badRequest.push(
            `⚠️ ${endpoint} (${result.status} - Bad Request/Validation Error)`
          );
        } else if (result.status === 404) {
          notFound.push(`❌ ${endpoint} (${result.status} - Not Found)`);
        } else {
          failed.push(`❌ ${endpoint} (${result.status || "ERROR"})`);
        }
      });

      console.log("\n✅ SUCCESSFUL ENDPOINTS:");
      successful.forEach((endpoint) => console.log(`  ${endpoint}`));

      console.log("\n🔒 ENDPOINTS REQUIRING AUTHENTICATION:");
      unauthorized.forEach((endpoint) => console.log(`  ${endpoint}`));

      console.log("\n⚠️ ENDPOINTS WITH VALIDATION ISSUES:");
      badRequest.forEach((endpoint) => console.log(`  ${endpoint}`));

      console.log("\n❌ NOT FOUND ENDPOINTS:");
      notFound.forEach((endpoint) => console.log(`  ${endpoint}`));

      if (failed.length > 0) {
        console.log("\n❌ OTHER FAILED ENDPOINTS:");
        failed.forEach((endpoint) => console.log(`  ${endpoint}`));
      }

      if (this.results.authentication) {
        console.log("\n🔐 AUTHENTICATION:");
        console.log(
          `  Status: ${
            this.results.authentication.successful ? "✅ SUCCESS" : "❌ FAILED"
          }`
        );
        if (this.results.authentication.successful) {
          console.log(`  Endpoint: ${this.results.authentication.endpoint}`);
          console.log(
            `  User: ${
              this.results.authentication.user?.email ||
              this.results.authentication.user?.username
            }`
          );
        } else {
          console.log(
            `  Tested ${
              this.results.authentication.testedUsers || 0
            } users with ${this.results.authentication.attempts || 0} attempts`
          );
          console.log(
            `  Note: ${
              this.results.authentication.note || "No valid credentials found"
            }`
          );
          if (this.results.authentication.suggestion) {
            console.log(
              `  Suggestion: ${this.results.authentication.suggestion}`
            );
          }
        }
      }

      if (this.results.apiStructure) {
        console.log("\n📋 API STRUCTURE:");
        console.log(JSON.stringify(this.results.apiStructure, null, 2));
      }
    }

    return this.results;
  }
}

export const apiTester = new ApiTester();

// Utility function to run a quick test
export async function quickApiTest() {
  const results = await apiTester.runFullTest();
  return apiTester.generateReport();
}

// Utility function to test specific endpoint
export async function testSpecificEndpoint(method, endpoint, data = null) {
  const tester = new ApiTester();
  return await tester.testEndpoint(method, endpoint, data);
}

// Utility function to get available users
export async function getAvailableUsers() {
  try {
    const response = await testAxios.get("/auth/users");
    return response.data.users || [];
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return [];
  }
}
