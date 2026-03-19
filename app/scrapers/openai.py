from typing import List
from .base import BaseScraper, Article


class OpenAIArticle(Article):
    pass


class OpenAIScraper(BaseScraper):
    @property
    def rss_urls(self) -> List[str]:
        return [
            "https://openai.com/news/rss.xml",
            "https://openai.com/blog/rss.xml",
            "https://www.technologyreview.com/feed/",
            "https://www.wired.com/feed/category/science/latest/rss",
            "https://www.technologyreview.com/feed/podcast/",
            "https://arstechnica.com/information-technology/rss.xml",
            "https://www.theverge.com/rss/index.xml",
        ]

    def get_articles(self, hours: int = 24) -> List[OpenAIArticle]:
        return [OpenAIArticle(**article.model_dump()) for article in super().get_articles(hours)]

  
if __name__ == "__main__":
    scraper = OpenAIScraper()
    articles: List[OpenAIArticle] = scraper.get_articles(hours=50)