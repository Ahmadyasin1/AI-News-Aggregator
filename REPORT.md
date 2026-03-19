# AI News Aggregator Project Report

**Student Name:** Ahmad Yasin
**Founder:** @Nexariza Ai
**Registration:** L1F22BSAI0052
**Subject:** Generative AI

## 1. Project Objective
The primary objective of this project is to build an intelligent, cutting-edge AI-powered news aggregation application. The system is designed to autonomously fetch and scrape news, technical articles, and video content from multiple distinct sources (specifically YouTube channels and AI industry blogs like OpenAI and Anthropic). Upon gathering this data, the application applies advanced Natural Language Processing (NLP) techniques to interpret, summarize, and semantically rank the content based on a configured user profile. The core requirement achieved is establishing a seamless, fully dockerized data pipeline starting from ingestion, moving through database storage, AI processing, and culminating in real-time user-facing outputs via both a full-fledged React dashboard and an automated, ultra-rich daily email digest.

As an advanced real-world use case designed to represent out-of-the-box product readiness, this application focuses heavily on reliability, modularity, and deployment-readiness, utilizing the Hugging Face Inference API as a replacement for proprietary endpoints to demonstrate cost-effective and highly optimized GenAI integration.

## 2. Architecture Overview
The project follows a robust, modular microservices-inspired architecture built for local development via Docker and immediate cloud deployment. The data flow operates as follows:

1. **Data Ingestion (Scrapers):** Utilizing a Registry Pattern, base scrapers independently fetch RSS feeds and YouTube channel transcripts.
2. **Database Storage:** The raw text and metadata are securely inserted into a structured PostgreSQL database.
3. **AI Processing Layer:** A suite of lightweight AI Agents (`DigestAgent`, `CuratorAgent`, `EmailAgent`) intercept new database records. Each serves a specific purpose: markdown conversion, semantic summarization, and LLM-powered ranking.
4. **Curation:** The LLM ranks the digests on a score of 1.0 to 10.0, validating technical depth and personal relevance.
5. **Output Generation:** The highly ranked items are served via standard REST endpoints to the React frontend, and concurrently, a cron-scheduled service automatically crafts an HTML email digest of the top ten news items for prompt delivery at 8:00 AM daily.

The architecture strictly adheres to clear separation of concerns, decoupling the database connection setup from the data-fetching and AI inference logic.

## 3. Tools and Frameworks Used
To achieve enterprise-grade stability and real-time execution, I utilized a comprehensive technology stack:
- **Backend Framework:** FastAPI (Python 3.12+) specifically chosen for its high-performance asynchronous execution and self-documenting features.
- **Frontend Framework:** React via Vite, styled for a premium and heavily branded user interface that stands out.
- **Database:** PostgreSQL managed via SQLAlchemy ORM.
- **AI / LLM Integration:** Hugging Face Inference API. Instead of relying on local `transformers` pipelines which severely bloat Docker images, this uses the remote `meta-llama/Llama-3.2-3B-Instruct` endpoint. This achieves the requirement for using "free Hugging Face models" optimally.
- **Containerization:** Docker & Docker Compose for encapsulating the frontend, backend, and PostgreSQL environments.
- **Task Scheduling:** `apscheduler` implemented natively within the FastAPI backend to operate as a self-contained cron mechanism triggering the email generation at 8:00 AM daily.
- **Package Management:** UV, an extremely fast Python package and project manager.

## 4. What Was Reproduced from the Video?
The foundation of the project successfully mirrors the core tutorial requirements:
1. **Database Integration:** Establishing the PostgreSQL integration via SQLAlchemy and defining clear Pydantic schemas.
2. **Containerization:** Crafting a clear `docker-compose.yml` to spin up the local development instance.
3. **Ingestion Pipeline:** Successfully pulling content from minimum two sources.
4. **LLM Fundamentals:** Invoking AI prompts to interpret unstructured text and store the derived insights back into the postgres relations.

## 5. What Was Changed or Improved (The Original Feature)
As my distinct, original extension to the core project, I implemented an **ultra-rich Daily Email Digest sent automatically via a background scheduler**. 
While the base project provided a rudimentary foundation, I expanded the backend to include `apscheduler` embedded within the `main.py` entrypoint. This transforms the application into a persistent, real-time background service. At 8:00 AM every single day, the system autonomously queries the newest data, invokes the `CuratorAgent` and `EmailAgent`, curates precisely the top 10 articles mathematically ranked by the LLM, and formats them into a branded, premium HTML email template delivered securely via an SMTP pipeline.

Furthermore, I extensively refactored the base AI logic to natively support Hugging Face models using direct HTTP requests to the Inference API. This guarantees a dramatically faster Docker build process and eliminates bulky local model downloads. Finally, as Founder @Nexariza Ai, I overhauled the user interface and email templates to include premium personal branding, elevating the assignment from a typical academic submission to a polished product showcase.

## 6. Key Challenges and Fixes
1. **Hugging Face Model Parsing Reliability:** Free tier models occasionally output erratic JSON structuring unlike rigid proprietary models. 
   *Fix:* I implemented a heuristic fallback in `BaseAgent` and the `DigestAgent` capable of extracting valid JSON blocks via string index substring matching or falling back to regex when standard `json.loads` encounters exceptions.
2. **Task Scheduling within Docker:** Operating cron jobs inside Docker typically requires a secondary image or crond.
   *Fix:* I maintained a minimal topology by embedding `BackgroundScheduler` directly into the FastAPI event loop / `main.py` executor, bypassing OS-level cron complexities entirely.

## 7. Reflection on Learnings
Developing this project significantly reinforced my understanding of applied Generative AI system architectures. I learned how crucial it is to construct deterministic wrappers around non-deterministic LLM requests—ensuring that even if an AI model hallucinates formatting, the backend pipeline safely catches the error and persists. Additionally, adapting an existing pipeline to leverage Hugging Face APIs demonstrated the tangible engineering trade-offs between local inference (heavy compute, free privacy) versus remote inference (network dependency, lightweight containerization). Ultimately, delivering this end-to-end full-stack AI platform validates my capabilities in designing resilient data ingestion pipelines and actionable AI-driven user experiences.
