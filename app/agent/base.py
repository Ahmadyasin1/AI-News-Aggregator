import os
import json
from abc import ABC
from dotenv import load_dotenv

load_dotenv()


class BaseAgent(ABC):
    def __init__(self, model: str):
        self.model = model
        self.provider = os.getenv("LLM_PROVIDER", "huggingface").lower()
        self.hf_model = os.getenv("HF_MODEL", "gpt2")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")

    def generate_text(self, prompt: str, max_tokens: int = 512, temperature: float = 0.7) -> str:
        if self.provider == "openai" and self.openai_api_key and self.openai_api_key != "dummy_key_not_used":
            try:
                from openai import OpenAI
                client = OpenAI(api_key=self.openai_api_key)
                response = client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                if response.choices:
                    return response.choices[0].message.content
                return ""
            except Exception as e:
                print(f"OpenAI generate_text error: {e}")
                return ""

        # Using Hugging Face Inference API
        try:
            import requests
            hf_token = os.getenv("HF_TOKEN")
            if not hf_token:
                print("Warning: No HF_TOKEN provided, falling back to local/unauthenticated (may rate limit).")
            
            headers = {"Authorization": f"Bearer {hf_token}"} if hf_token else {}
            api_url = f"https://router.huggingface.co/hf-inference/models/{self.hf_model}"
            
            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": max_tokens,
                    "temperature": max(0.01, temperature),
                    "return_full_text": False
                }
            }
            
            response = requests.post(api_url, headers=headers, json=payload)
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and len(result) > 0:
                    return result[0].get("generated_text", "").strip()
                elif isinstance(result, dict) and "generated_text" in result:
                    return result["generated_text"].strip()
                elif isinstance(result, dict) and "error" in result:
                    print(f"HF API Error: {result['error']}")
            else:
                print(f"HF API Error {response.status_code}: {response.text}")
                
        except Exception as e:
            print(f"Hugging Face API generate_text error: {e}")
        return ""

    @staticmethod
    def parse_json_output(text: str):
        try:
            return json.loads(text)
        except Exception:
            # Try to extract JSON substring
            start = text.find("{")
            end = text.rfind("}")
            if start >= 0 and end > start:
                try:
                    return json.loads(text[start:end+1])
                except Exception:
                    pass
            return None

