import { search, SafeSearchType } from 'duck-duck-scrape';

export const webSearchToolDefinition = {
  type: 'function',
  function: {
    name: 'web_search',
    description: 'Search the internet for information when you do not know the answer or need current events.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to send to the search engine.'
        }
      },
      required: ['query']
    }
  }
};

export async function performWebSearch(query) {
  const maxRetries = 3;
  let delay = 2000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🔍 Performing web search for: ${query} (Attempt ${i + 1}/${maxRetries})`);
      const results = await search(query, {
        safeSearch: SafeSearchType.MODERATE 
      });

      if (!results.results || results.results.length === 0) {
        return "No results found.";
      }

      // Format top 5 results
      const topResults = results.results.slice(0, 5).map(r => 
        `Title: ${r.title}\nURL: ${r.url}\nDescription: ${r.description || 'No description'}`
      ).join('\n\n');

      return `Search Results for "${query}":\n\n${topResults}`;
    } catch (error) {
      console.error(`Web search error (Attempt ${i + 1}):`, error.message);
      
      if (i === maxRetries - 1) {
        return `Error performing web search: ${error.message}`;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; 
    }
  }
}
