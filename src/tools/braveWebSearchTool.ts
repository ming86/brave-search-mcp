/**
 * Brave Web Search tool implementation.
 * 
 * Provides comprehensive web search capabilities including:
 * - Web page results with title, description, and URL
 * - FAQ answers from relevant sources
 * - Discussion forum results (Reddit, Stack Overflow, etc.)
 * - News articles with recency indicators
 * - Video results with metadata
 * - AI summarization support (when summary: true)
 */

import { IBraveWebSearchParams } from '../types/index.js';
import { issueWebSearchRequest } from '../services/braveSearchApi.js';
import { stringify } from '../utils/stringify.js';
import type {
  Search,
  FAQ,
  Discussions,
  News,
  Videos,
  FormattedWebResults,
  FormattedFAQResults,
  FormattedDiscussionsResults,
  FormattedNewsResults,
  FormattedVideoResults,
} from '../types/braveSearch.js';

/**
 * Formats web search results for LLM consumption.
 * Extracts essential fields: url, title, description, extra_snippets.
 */
function formatWebResults(web: Search): FormattedWebResults {
  return (web.results || []).map(({ url, title, description, extra_snippets }) => ({
    url,
    title,
    description,
    extra_snippets,
  }));
}

/**
 * Formats FAQ results for LLM consumption.
 * Extracts: question, answer, title, url.
 */
function formatFAQResults(faq: FAQ): FormattedFAQResults {
  return (faq.results || []).map(({ question, answer, title, url }) => ({
    question,
    answer,
    title,
    url,
  }));
}

/**
 * Formats discussion forum results for LLM consumption.
 * Includes: url, forum data, goggle mutation indicator.
 */
function formatDiscussionsResults(discussions: Discussions): FormattedDiscussionsResults {
  return (discussions.results || []).map(({ url, data }) => ({
    mutated_by_goggles: discussions.mutated_by_goggles,
    url,
    data,
  }));
}

/**
 * Formats news article results for LLM consumption.
 * Includes: source, breaking/live indicators, age, url, title, description, extra_snippets.
 */
function formatNewsResults(news: News): FormattedNewsResults {
  return (news.results || []).map(
    ({ source, breaking, is_live, age, url, title, description, extra_snippets }) => ({
      mutated_by_goggles: news.mutated_by_goggles,
      source,
      breaking,
      is_live,
      age,
      url,
      title,
      description,
      extra_snippets,
    })
  );
}

/**
 * Formats video results for LLM consumption.
 * Includes: url, title, description, age, thumbnail, duration, views, creator, publisher, tags.
 */
function formatVideoResults(videos: Videos): FormattedVideoResults {
  return (videos.results || []).map(({ url, age, title, description, video, thumbnail }) => ({
    mutated_by_goggles: videos.mutated_by_goggles,
    url,
    title,
    description,
    age,
    thumbnail_url: thumbnail?.src,
    duration: video.duration,
    view_count: video.views,
    creator: video.creator,
    publisher: video.publisher,
    tags: video.tags,
  }));
}

/**
 * Content part returned by invokeBraveWebSearch.
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Executes a Brave Web Search and returns formatted results as content parts.
 * 
 * @param params - Search parameters
 * @returns Array of text content parts with formatted results
 * @throws Error if the search fails
 */
export async function invokeBraveWebSearch(params: IBraveWebSearchParams): Promise<TextContent[]> {
  try {
    // Issue API request
    const response = await issueWebSearchRequest(params);
    const { web, faq, discussions, news, videos, summarizer } = response;
    
    // Build result parts
    const resultParts: TextContent[] = [];
    
    // Add summarizer key if available
    if (summarizer) {
      resultParts.push({ type: 'text', text: `Summarizer key: ${summarizer.key}` });
    }
    
    // Check if we have any web results - this is required for processing other result types
    // This mirrors the MCP server behavior exactly
    if (!web || !Array.isArray(web.results) || web.results.length < 1) {
      return [{ type: 'text', text: 'No web results found' }];
    }
    
    // Format and add web results
    if (web && web.results?.length > 0) {
      for (const entry of formatWebResults(web)) {
        resultParts.push({ type: 'text', text: stringify(entry) });
      }
    }
    
    // Format and add FAQ results
    if (faq && faq.results?.length > 0) {
      for (const entry of formatFAQResults(faq)) {
        resultParts.push({ type: 'text', text: stringify(entry) });
      }
    }
    
    // Format and add discussion results
    if (discussions && discussions.results?.length > 0) {
      for (const entry of formatDiscussionsResults(discussions)) {
        resultParts.push({ type: 'text', text: stringify(entry) });
      }
    }
    
    // Format and add news results
    if (news && news.results?.length > 0) {
      for (const entry of formatNewsResults(news)) {
        resultParts.push({ type: 'text', text: stringify(entry) });
      }
    }
    
    // Format and add video results
    if (videos && videos.results?.length > 0) {
      for (const entry of formatVideoResults(videos)) {
        resultParts.push({ type: 'text', text: stringify(entry) });
      }
    }
    
    return resultParts;
    
  } catch (error) {
    // Convert errors to user-friendly messages
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred during search';
    
    throw new Error(
      `Brave Search failed: ${errorMessage}. ` +
      `Please check your API key configuration and try again.`
    );
  }
}
