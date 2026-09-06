"""Pydantic JSON Schema -> OpenAI-compatible strict tool schema.

``model_json_schema()`` emits ``$ref``/``$defs`` for nested models, which many
OpenAI-compatible servers (and every constrained-decoding grammar builder) reject.
This module does exactly three things (§5 of the architecture doc):

1. inline every ``$ref`` (depth-guarded, so a self-referential model fails loudly at
   import time rather than looping);
2. rewrite ``required`` to every property key — strict mode wants all keys present;
   optionality is carried by the ``anyOf: [{...}, {"type": "null"}]`` pydantic already
   emits correctly;
3. drop ``title`` and ``default`` — ``title`` is pure token waste on every request,
   ``default`` is rejected by strict validators.
"""

from src.agent.models import ToolArgs

_MAX_REF_DEPTH = 20


def _inline_refs(node, defs: dict, depth: int = 0):
    if depth > _MAX_REF_DEPTH:
        raise ValueError("Tool schema nests too deep — self-referential args model?")
    if isinstance(node, dict):
        if "$ref" in node:
            name = node["$ref"].rsplit("/", 1)[-1]
            return _inline_refs(defs[name], defs, depth + 1)
        return {k: _inline_refs(v, defs, depth + 1) for k, v in node.items() if k != "$defs"}
    if isinstance(node, list):
        return [_inline_refs(item, defs, depth + 1) for item in node]
    return node


def _strictify(node):
    if isinstance(node, dict):
        node = {k: _strictify(v) for k, v in node.items() if k not in ("title", "default")}
        if node.get("type") == "object" and "properties" in node:
            node["required"] = list(node["properties"].keys())
            node["additionalProperties"] = False
        return node
    if isinstance(node, list):
        return [_strictify(item) for item in node]
    return node


def openai_tool_schema(name: str, description: str, args_model: type[ToolArgs]) -> dict:
    raw = args_model.model_json_schema()
    parameters = _strictify(_inline_refs(raw, raw.get("$defs", {})))
    return {
        "type": "function",
        "function": {"name": name, "description": description, "parameters": parameters},
    }
