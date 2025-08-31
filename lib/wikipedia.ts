// Wikipedia API integration for fetching real content and images

interface WikipediaPage {
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  images: string[];
  url: string;
}

interface WikipediaSearchResult {
  query: {
    pages: {
      [key: string]: {
        pageid: number;
        title: string;
        extract?: string;
        thumbnail?: {
          source: string;
          width: number;
          height: number;
        };
        images?: Array<{
          title: string;
        }>;
      };
    };
  };
}

export class WikipediaAPI {
  private static baseURL = 'https://en.wikipedia.org/api/rest_v1';
  private static apiURL = 'https://en.wikipedia.org/w/api.php';

  /**
   * Find the most relevant Wikipedia page based on title and geographic coordinates
   */
  private static async getGeoContextualPage(title: string, coordinates: { lat: number; lon: number }): Promise<string | null> {
    try {
      console.log(`🌍 Searching for geo-contextual Wikipedia page: "${title}" near ${coordinates.lat}, ${coordinates.lon}`);
      
      // Use Wikipedia's geosearch to find pages near the coordinates
      const geoSearchResponse = await fetch(
        `${this.apiURL}?action=query&format=json&list=geosearch&gscoord=${coordinates.lat}|${coordinates.lon}&gsradius=10000&gslimit=10&origin=*`
      );
      
      if (!geoSearchResponse.ok) return null;
      
      const geoData = await geoSearchResponse.json();
      const geoResults = geoData.query?.geosearch || [];
      
      // Also search for pages with the title
      const searchResponse = await fetch(
        `${this.apiURL}?action=query&format=json&list=search&srsearch=${encodeURIComponent(title)}&srlimit=10&origin=*`
      );
      
      if (!searchResponse.ok) return null;
      
      const searchData = await searchResponse.json();
      const searchResults = searchData.query?.search || [];
      
      console.log(`📍 Found ${geoResults.length} geo results and ${searchResults.length} search results`);
      
      // Try to find matches between geographic results and title search results
      const geoTitles = new Set(geoResults.map((result: any) => result.title.toLowerCase()));
      
      // First, look for exact or close matches in geographic results
      for (const searchResult of searchResults) {
        const searchTitle = searchResult.title.toLowerCase();
        if (geoTitles.has(searchTitle)) {
          console.log(`✅ Found geo-contextual match: "${searchResult.title}"`);
          return searchResult.title;
        }
      }
      
      // If no direct match, look for partial matches (contains the search term)
      for (const geoResult of geoResults) {
        const geoTitle = geoResult.title.toLowerCase();
        const searchTerm = title.toLowerCase();
        if (geoTitle.includes(searchTerm) || searchTerm.includes(geoTitle)) {
          console.log(`🎯 Found partial geo match: "${geoResult.title}"`);
          return geoResult.title;
        }
      }
      
      // If still no match, return the closest geographic result if it's relevant
      if (geoResults.length > 0) {
        const closest = geoResults[0];
        console.log(`📍 Using closest geographic result: "${closest.title}" (${closest.dist}m away)`);
        return closest.title;
      }
      
      console.log(`❌ No geo-contextual match found for "${title}"`);
      return null;
      
    } catch (error) {
      console.error('Error in geo-contextual search:', error);
      return null;
    }
  }

  static async getFullArticle(title: string): Promise<{title: string; content: string; url: string} | null> {
    try {
      const response = await fetch(
        `${this.baseURL}/page/html/${encodeURIComponent(title)}`
      );
      
      if (!response.ok) return null;
      
      const htmlContent = await response.text();
      
      return {
        title,
        content: htmlContent,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
      };
    } catch (error) {
      console.error('Error fetching full article:', error);
      return null;
    }
  }

  static async getPageSummary(title: string, coordinates?: { lat: number; lon: number }): Promise<WikipediaPage | null> {
    try {
      // If coordinates are provided, first try to find the best geographic match
      if (coordinates) {
        const geoResult = await this.getGeoContextualPage(title, coordinates);
        if (geoResult) {
          title = geoResult;
        }
      }

      // Get page summary
      const summaryResponse = await fetch(
        `${this.baseURL}/page/summary/${encodeURIComponent(title)}`
      );
      
      if (!summaryResponse.ok) return null;
      
      const summaryData = await summaryResponse.json();
      
      // Get page images
      const imagesResponse = await fetch(
        `${this.apiURL}?action=query&format=json&prop=images&titles=${encodeURIComponent(title)}&imlimit=10&origin=*`
      );
      
      let images: string[] = [];
      if (imagesResponse.ok) {
        const imagesData: WikipediaSearchResult = await imagesResponse.json();
        const pages = Object.values(imagesData.query?.pages || {});
        if (pages.length > 0 && pages[0].images) {
          // Get actual image URLs
          const imagePromises = pages[0].images.slice(0, 5).map(async (img) => {
            try {
              const imgResponse = await fetch(
                `${this.apiURL}?action=query&format=json&titles=${encodeURIComponent(img.title)}&prop=imageinfo&iiprop=url&origin=*`
              );
              const imgData = await imgResponse.json();
              const imgPages = Object.values(imgData.query?.pages || {});
              if (imgPages.length > 0 && (imgPages[0] as any).imageinfo) {
                return (imgPages[0] as any).imageinfo[0].url;
              }
            } catch (e) {
              return null;
            }
            return null;
          });
          
          const imageUrls = await Promise.all(imagePromises);
          images = imageUrls.filter(url => url && !url.includes('.svg')); // Filter out SVGs
        }
      }

      return {
        title: summaryData.title,
        extract: summaryData.extract || '',
        thumbnail: summaryData.thumbnail,
        images: images,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
      };
    } catch (error) {
      console.error('Error fetching Wikipedia data:', error);
      return null;
    }
  }

  static async searchPages(query: string, limit: number = 3): Promise<WikipediaPage[]> {
    try {
      const response = await fetch(
        `${this.apiURL}?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&origin=*`
      );
      
      if (!response.ok) return [];
      
      const data = await response.json();
      const results = data.query?.search || [];
      
      // Get full data for each result
      const pagePromises = results.map((result: any) => 
        this.getPageSummary(result.title)
      );
      
      const pages = await Promise.all(pagePromises);
      return pages.filter(page => page !== null) as WikipediaPage[];
    } catch (error) {
      console.error('Error searching Wikipedia:', error);
      return [];
    }
  }
}

// Element-specific Wikipedia topics for infrastructure and locations
export const WIKIPEDIA_TOPICS = {
  'nord-stream': {
    pipeline: 'Nord Stream',
    pipeline_sabotage: 'Nord Stream pipeline sabotage',
    compressor: 'Natural gas compressor station',
    terminal: 'Liquefied natural gas terminal',
    baltic: 'Baltic Sea',
    gazprom: 'Gazprom',
    methane: 'Methane emissions',
    vyborg: 'Vyborg',
    lubmin: 'Lubmin',
    ust_luga: 'Ust-Luga'
  },
  'svb-collapse': {
    bank: 'Silicon Valley Bank',
    fdic: 'Federal Deposit Insurance Corporation',
    venture: 'Venture capital',
    silicon_valley: 'Silicon Valley',
    first_republic: 'First Republic Bank',
    banking_regulation: 'Bank regulation in the United States'
  },
  'ukraine-conflict': {
    kyiv: 'Kyiv',
    mariupol: 'Mariupol',
    kharkiv: 'Kharkiv',
    zaporizhzhia_npp: 'Zaporizhzhia Nuclear Power Plant',
    donetsk: 'Donetsk Oblast',
    luhansk: 'Luhansk Oblast'
  }
};

// Function to get geographic data from Wikipedia articles
export async function getWikipediaMapData(title: string): Promise<any> {
  try {
    // Try to fetch the Wikipedia page content
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=revisions&titles=${encodeURIComponent(title)}&rvprop=content&rvslots=main&origin=*`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const pages = Object.values(data.query?.pages || {});
    
    if (pages.length === 0) return null;
    
    const page = pages[0] as any;
    const content = page.revisions?.[0]?.slots?.main?.['*'];
    
    if (!content) return null;
    
    // Look for coordinate data in Wikipedia markup
    const coordinateMatches = content.match(/\{\{coord\|([^}]+)\}\}/g);
    const coordinates = [];
    
    if (coordinateMatches) {
      for (const match of coordinateMatches) {
        const coordString = match.replace(/\{\{coord\|/, '').replace(/\}\}/, '');
        const parts = coordString.split('|');
        
        if (parts.length >= 2) {
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            coordinates.push({ lat, lng });
          }
        }
      }
    }
    
    // Look for external map data references
    const mapDataMatches = content.match(/\{\{ExternalData[^}]+\}\}/g);
    const externalMapRefs = [];
    
    if (mapDataMatches) {
      for (const match of mapDataMatches) {
        externalMapRefs.push(match);
      }
    }
    
    return {
      title: page.title,
      coordinates,
      externalMapRefs,
      hasMapData: coordinates.length > 0 || externalMapRefs.length > 0
    };
  } catch (error) {
    console.error('Error fetching Wikipedia map data:', error);
    return null;
  }
}

// Function to extract GeoJSON from Wikimedia Commons
export async function getWikimediaGeoJSON(mapTitle: string): Promise<any> {
  try {
    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=revisions&titles=Data:${encodeURIComponent(mapTitle)}&rvprop=content&rvslots=main&origin=*`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const pages = Object.values(data.query?.pages || {});
    
    if (pages.length === 0) return null;
    
    const page = pages[0] as any;
    const content = page.revisions?.[0]?.slots?.main?.['*'];
    
    if (!content) return null;
    
    try {
      // Try to parse as JSON (GeoJSON format)
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse map data as JSON:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error fetching Wikimedia GeoJSON:', error);
    return null;
  }
}