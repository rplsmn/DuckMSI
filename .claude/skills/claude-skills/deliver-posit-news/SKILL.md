---
name: deliver-posit-news
description: |
  Fetch and display news from Posit, including blog posts, podcast episodes, and events.
  Use when the user wants to see recent Posit news, blog updates, podcast episodes, or company announcements.

---

# Deliver Posit News

Fetch the latest Posit news from Posit blog posts, podcast episodes, and event announcements and present them to the user.

## Blogs to Fetch

| Blog | URL | Posts |
|------|-----|-------|
| Posit | https://posit.co/feed/ | 3 |
| Tidyverse | https://www.tidyverse.org/blog/ | 3 |
| Shiny | https://shiny.posit.co/blog/ | 3 |
| Quarto | https://quarto.org/docs/blog/ | 3 |

## Podcast to Fetch

| Podcast | URL |
|---------|-----|
| The Test Set | https://posit.co/thetestset/ |

## Events to Fetch

| Source | URL |
|--------|-----|
| Posit Events Sitemap | https://posit.co/events-sitemap.xml |
| Data Science Hangouts Sitemap | https://posit.co/hangouts-sitemap.xml |

## Instructions

1. First, run `date +%Y-%m-%d` to get today's date.

2. Use WebFetch to retrieve all blog URLs in parallel. For each blog, use this prompt:
   "Extract the [N] most recent blog posts with title, date, brief description, and URL."

3. Fetch the podcast page (`https://posit.co/thetestset/`) with prompt:
   "Extract the latest podcast episode with title, episode number, brief description, and URL."

4. Fetch events from both sitemaps:
   a. Fetch both sitemaps in parallel:
      - Events sitemap (`https://posit.co/events-sitemap.xml`) with prompt:
        "List the 10 most recently modified event URLs with their names (extract name from URL slug)."
      - Hangouts sitemap (`https://posit.co/hangouts-sitemap.xml`) with prompt:
        "List the 10 most recently modified hangout URLs with their names (extract name from URL slug)."
   b. Then, fetch individual event/hangout pages in parallel with prompt:
      "Extract the event name, date(s), and a one-sentence description."
   c. Combine all events and compare dates to today's date to categorize:
      - **Recent Events**: The 2 most recent events that have already occurred (before today)
      - **Upcoming Events**: The next 3 events that haven't happened yet (today or later)

5. For relative URLs, prepend the source's base URL to form complete links.

6. Present the results grouped by source in this format:
   ```
   ## Posit Blog (3 latest)

   - (YYYY-MM-DD) **Post Title**: Brief description. URL

   ## Tidyverse Blog (3 latest)

   - (YYYY-MM-DD) **Post Title**: Brief description. URL

   ## Shiny Blog (3 latest)

   - (YYYY-MM-DD) **Post Title**: Brief description. URL

   ## Quarto Blog (3 latest)

   - (YYYY-MM-DD) **Post Title**: Brief description. URL

   ## The Test Set Podcast (latest episode)

   - (ep DDD) **Episode Title**: Brief description. URL

   ## Recent Posit Events (2 most recent)

   - (YYYY-MM-DD) **Event Name**: Brief description. URL

   ## Upcoming Posit Events (next 3)

   - (YYYY-MM-DD) **Event Name**: Brief description. URL
   ```

7. If a URL cannot be retrieved, note the limitation and continue with other sources.

## Example Output

## Posit Blog (3 latest)

- (2025-01-10) **Announcing Positron 1.0**: Posit releases version 1.0 of Positron, the next-generation IDE for data science. https://posit.co/blog/announcing-positron-1-0/

## Tidyverse Blog (3 latest)

- (2025-01-08) **dplyr 1.2.0**: New features in dplyr including improved joins and better error messages. https://tidyverse.org/blog/2025/01/dplyr-1-2-0/

## Shiny Blog (3 latest)

- (2025-01-05) **Shiny for Python 1.0**: Shiny for Python reaches 1.0 with production-ready features. https://shiny.posit.co/blog/shiny-python-1-0/

## Quarto Blog (3 latest)

- (2025-01-03) **Quarto 1.5 Release**: New features for scientific publishing and improved PDF output. https://quarto.org/docs/blog/posts/2025-01-03-quarto-1.5/

## The Test Set Podcast (latest episode)

- (ep 012) **Marco Gorelli on Narwhals, Ecosystem Glue, and Boring Work**: Marco discusses Narwhals, a compatibility layer enabling apps to work seamlessly with Pandas, Polars, Arrow, and other dataframe libraries. https://posit.co/thetestset/episode/marco-gorelli-narwhals-ecosystem-glue-and-the-value-of-boring-work/

## Recent Posit Events (2 most recent)

- (2025-12-11) **Actuarial Technology Summit 2025**: Virtual summit focused on modernizing insurance technology stacks for actuaries. https://posit.co/events/actuarial-technology-summit-2025/
- (2025-11-06) **Data + AI World Tour Amsterdam**: Posit partners with Databricks to accelerate AI-powered workflows. https://posit.co/events/data-ai-world-tour-amsterdam/

## Upcoming Posit Events (next 3)

- (2026-01-15) **Data Science Hangout featuring Mine Çetinkaya-Rundel**: Discuss data science education and open, reproducible data science. https://posit.co/data-science-hangout/mine-cetinkaya-rundel/
- (2026-01-22) **Data Science Hangout featuring Allissa Dillman**: Discuss building inclusive learning programs and making data science approachable. https://posit.co/data-science-hangout/allissa-dillman/
- (2026-01-26) **Gen-AI Assisted Migration Webinar**: Learn how Gen-AI accelerated the transition to open-source data science tools. https://posit.co/events/gen-ai-assisted-migration-webinar/
