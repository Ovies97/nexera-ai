from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class AssetResponse(BaseModel):
    model_url: str
    explanation: str

class CommandRequest(BaseModel):
    command: str

class CommandIntent(BaseModel):
    action: str
    target: Optional[str] = None
    steps: List[str] = []
    explanation: str
    meta: Dict[str, Any] = {}
