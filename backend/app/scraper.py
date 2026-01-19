import asyncio
import requests
from bs4 import BeautifulSoup
from typing import Optional, Tuple
from urllib.parse import urlparse
import re


class WebScraper:
    """Web scraper for extracting content from URLs."""
    
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        }
    
    async def scrape_url(self, url: str) -> Tuple[str, str]:
        """
        Scrape content from a URL.
        Returns tuple of (title, content).
        """
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.get(url, headers=self.headers, timeout=30)
            )
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, "html.parser")
            
            # Extract title
            title = self._extract_title(soup, url)
            
            # Remove unwanted elements
            for element in soup.find_all(["script", "style", "nav", "header", "footer", "aside", "form"]):
                element.decompose()
            
            # Extract main content
            content = self._extract_content(soup)
            
            if not content.strip():
                raise ValueError("No content could be extracted from the URL")
            
            return title, content
            
        except requests.RequestException as e:
            raise ValueError(f"Failed to fetch URL: {str(e)}")
        except Exception as e:
            raise ValueError(f"Failed to scrape URL: {str(e)}")
    
    def _extract_title(self, soup: BeautifulSoup, url: str) -> str:
        """Extract page title."""
        # Try meta title
        if soup.title and soup.title.string:
            return soup.title.string.strip()
        
        # Try h1
        h1 = soup.find("h1")
        if h1:
            return h1.get_text().strip()
        
        # Fallback to domain
        parsed = urlparse(url)
        return parsed.netloc
    
    def _extract_content(self, soup: BeautifulSoup) -> str:
        """Extract main content from page."""
        # Try common content containers
        content_selectors = [
            "article",
            "main",
            '[role="main"]',
            ".content",
            ".post-content",
            ".article-content",
            ".entry-content",
            "#content",
            ".markdown-body",
            ".prose",
        ]
        
        for selector in content_selectors:
            element = soup.select_one(selector)
            if element:
                text = self._clean_text(element.get_text())
                if len(text) > 200:  # Ensure we have meaningful content
                    return text
        
        # Fallback to body
        body = soup.find("body")
        if body:
            return self._clean_text(body.get_text())
        
        return ""
    
    def _clean_text(self, text: str) -> str:
        """Clean extracted text."""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove leading/trailing whitespace
        text = text.strip()
        return text


# Singleton instance
scraper = WebScraper()
