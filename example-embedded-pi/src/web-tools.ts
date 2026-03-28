/**
 * Web access tools for pi-coding-agent
 */
import { createToolSchema } from "./index.js";
import fetch from "node-fetch";

/**
 * HTTP GET request tool
 */
export const httpGetTool = createToolSchema({
  name: "http_get",
  description: "Make an HTTP GET request to fetch content from a URL",
  properties: {
    url: {
      type: "string",
      description: "The URL to fetch",
    },
    headers: {
      type: "object",
      description: "Optional HTTP headers",
    },
  },
  required: ["url"],
});

httpGetTool.execute = async (toolCallId: string, params: any) => {
  const { url, headers = {} } = params;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EmbeddedPi/1.0)",
        ...headers,
      },
    });

    const contentType = response.headers.get("content-type") || "";
    let result;

    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    return {
      success: true,
      url,
      status: response.status,
      contentType,
      content: result,
    };
  } catch (error) {
    return {
      success: false,
      url,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Simple web search tool (uses a public search API)
 */
export const webSearchTool = createToolSchema({
  name: "web_search",
  description: "Search the web for information",
  properties: {
    query: {
      type: "string",
      description: "The search query",
    },
    numResults: {
      type: "number",
      description: "Number of results to return (default: 5)",
    },
  },
  required: ["query"],
});

webSearchTool.execute = async (toolCallId: string, params: any) => {
  const { query, numResults = 5 } = params;

  // Note: This is a placeholder. In a real implementation,
  // you would use a search API like Google Custom Search, Bing Search, etc.
  return {
    success: true,
    query,
    note: "Web search requires a search API key (Google/Bing/etc.)",
    placeholder_results: [
      {
        title: "Search API Setup Required",
        url: "https://developers.google.com/custom-search/v1/overview",
        snippet: "To enable real web search, configure a search API provider.",
      },
    ],
  };
};

/**
 * Get all web tools
 */
export function createWebTools() {
  return [httpGetTool, webSearchTool];
}
