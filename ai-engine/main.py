import os
import asyncio
import httpx
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import anthropic
from bs4 import BeautifulSoup
from typing import Optional

load_dotenv()

app = FastAPI(title="ShadowTest AI Engine")

# Configuration
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
API_URL = os.environ.get("API_URL", "http://localhost:4000/api")

# Initialize Anthropic client
anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

class SimulationRequest(BaseModel):
    project_id: str
    persona_id: str
    task: str
    simulation_id: str
    product_url: Optional[str] = None
    persona_traits: Optional[str] = None

class Scraper:
    @staticmethod
    async def get_page_content(url: str) -> str:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                # Remove script and style elements
                for script_or_style in soup(["script", "style"]):
                    script_or_style.decompose()
                
                # Get text and clean up whitespace
                text = soup.get_text()
                lines = (line.strip() for line in text.splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                text = '\n'.join(chunk for chunk in chunks if chunk)
                
                return text[:5000] # Limit context size
        except Exception as e:
            return f"Error fetching page content: {str(e)}"

async def send_step_to_backend(simulation_id: str, step_data: dict):
    """Notify Node.js backend about a simulation step."""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{API_URL}/simulations/{simulation_id}/steps",
                json=step_data
            )
    except Exception as e:
        print(f"Failed to send step to backend: {e}")

async def run_simulation_loop(request: SimulationRequest):
    """
    Real Simulation Loop using Anthropic Claude.
    """
    print(f"Starting real simulation {request.simulation_id}")
    
    # 1. Fetch initial context
    page_content = "No URL provided."
    if request.product_url:
        page_content = await Scraper.get_page_content(request.product_url)
    
    # 2. Construct Prompt for Claude
    system_prompt = f"""
    You are a synthetic user persona testing a product.
    Persona Traits: {request.persona_traits or 'Average user'}
    Your Task: {request.task}
    
    Current Page Content:
    ---
    {page_content}
    ---
    
    Reason through the next 5 steps to accomplish the task. 
    For each step, provide:
    1. Observation: What you see on the page.
    2. Interpretation: What you understand from it.
    3. Decision: What you decide to do next.
    4. Action: The specific action you take.
    5. Outcome: What you expect to happen.
    
    Output format MUST be a list of JSON objects with keys: type (observation, interpretation, decision, action, outcome) and content.
    """

    try:
        message = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=1000,
            temperature=0,
            system="You are an expert UX tester. Always output valid JSON lists.",
            messages=[
                {"role": "user", "content": system_prompt}
            ]
        )
        
        # Simple extraction logic (MVP assumes Claude follows instructions)
        import json
        import re
        
        # Try to find JSON list in the response
        content_text = message.content[0].text
        json_match = re.search(r'\[.*\]', content_text, re.DOTALL)
        
        if json_match:
            steps = json.loads(json_match.group())
            for i, step in enumerate(steps):
                await asyncio.sleep(1) # Small delay for realism
                await send_step_to_backend(request.simulation_id, {
                    "step_number": i + 1,
                    **step
                })
        
        # Final update to status
        async with httpx.AsyncClient() as client:
            await client.patch(f"{API_URL}/simulations/{request.simulation_id}", json={"status": "COMPLETED"})

    except Exception as e:
        print(f"Simulation {request.simulation_id} failed: {e}")
        async with httpx.AsyncClient() as client:
            await client.patch(f"{API_URL}/simulations/{request.simulation_id}", json={"status": "FAILED"})

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ShadowTest AI Engine", "ready": ANTHROPIC_API_KEY is not None}

@app.post("/simulate/start")
def start_simulation(request: SimulationRequest, background_tasks: BackgroundTasks):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    background_tasks.add_task(run_simulation_loop, request)
    return {"status": "started", "simulation_id": request.simulation_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
