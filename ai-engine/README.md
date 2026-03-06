# ShadowTest AI Engine 🤖

The cognitive core of the ShadowTest platform. Uses high-reasoning language models to simulate human-like interactions with any web interface.

## ✨ Features

- **Behavioral Simulation**: Driven by **Claude 3.5 Sonnet**, simulating persona-specific observations and decisions.
- **Autonomous Scraping**: Real-time context gathering using **BeautifulSoup** and **HTTPX**.
- **Reasoning Loop**: Implements the *Observation → Interpretation → Decision → Action → Outcome* sequence.
- **Microservices-Native**: Built with **FastAPI** to handle background simulation tasks asynchronously.

## 🛠️ Tech Stack

- **Runtime**: Python 3.9+
- **Core Framework**: FastAPI
- **LLM Provider**: Anthropic (Claude 3.5 Sonnet)
- **Scraping**: BeautifulSoup4 & HTTPX
- **Async Processing**: Python Asyncio with FastAPI BackgroundTasks

## 🚀 Getting Started

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
2.  **Environment Variables**:
    Create a `.env` file with your `ANTHROPIC_API_KEY`.
3.  **Run Server**:
    ```bash
    python main.py
    ```

---

*Part of the [ShadowTest](./../README.md) Infrastructure*
