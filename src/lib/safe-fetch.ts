/**
 * Safe JSON fetch wrapper that handles HTML error responses
 */
export async function safeFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  
  // Check if response is ok; if not, try to parse error details
  if (!res.ok) {
    const text = await res.text();
    // If the response looks like JSON, parse it; otherwise use status message
    const data = text.startsWith('{') ? JSON.parse(text) : { error: `Server error: ${res.status}` };
    throw new Error(data.error || text || `HTTP ${res.status}`);
  }
  
  // Parse as JSON
  const data: T = await res.json();
  return data;
}
