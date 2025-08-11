from pydantic import BaseModel, Field
from typing import Optional, Union

class ResponseSchema(BaseModel):
    status: str = Field(..., description="The status of the response, e.g., 'success' or 'error'.")
    message: str = Field(..., description="A message providing additional information about the response.")
    data: Optional[Union[list,dict]] = Field(None, description="Optional data payload included in the response.")