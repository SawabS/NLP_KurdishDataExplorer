"""LLM-generated human-readable topic labels.

BERTopic's c-TF-IDF keywords ("نییە_ئەمە_خۆت_شتێک") are precise but unreadable
to a general user. This asks a chat model to name each hierarchy node — both
real topics (leaves) and their merged groups (internal nodes) — from its top
keywords plus one representative document, in a handful of batched JSON calls
per run rather than one call per topic.

Leaf node ids in the saved hierarchy are exactly the BERTopic topic ids (see
``topics.hierarchy_nodes``), so one label dict keyed by node id covers both
the flat topic list and the hierarchy tree.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict

import pandas as pd

from . import llm

NODES_PER_CALL = 30
EXAMPLE_CHARS = 200


def _representative_docs(hierarchy: list[dict], docs: pd.DataFrame) -> dict[str, str]:
    """One example document text per node — the node's own text for leaves,
    and its largest-count descendant leaf's text for internal groups."""
    first_by_topic = (
        docs[docs["topic"] != -1].groupby("topic")["text"].first().astype(str).to_dict()
    )
    by_id = {node["id"]: node for node in hierarchy}
    children: dict[str, list[str]] = defaultdict(list)
    for node in hierarchy:
        parent = node.get("parent") or ""
        if parent in by_id:
            children[parent].append(node["id"])

    memo: dict[str, str] = {}

    def resolve(node_id: str) -> str:
        if node_id in memo:
            return memo[node_id]
        node = by_id[node_id]
        if node.get("is_leaf"):
            text = first_by_topic.get(int(node["topic_id"]), "")
        else:
            kids = children.get(node_id, [])
            best = max(kids, key=lambda cid: by_id[cid].get("count", 0), default=None)
            text = resolve(best) if best is not None else ""
        memo[node_id] = text
        return text

    return {node["id"]: resolve(node["id"]) for node in hierarchy}


def _keywords(node: dict, topic_words: dict) -> list[str]:
    if node.get("is_leaf") and node.get("topic_id") is not None:
        words = topic_words.get(str(node["topic_id"]), [])
        return [word for word, _ in words[:8]]
    parts = [p for p in str(node.get("full_label", "")).replace("_", " ").split() if not p.isdigit()]
    seen: list[str] = []
    for part in parts:
        if part not in seen:
            seen.append(part)
    return seen[:8]


def _parse_json_object(content: str) -> dict:
    match = re.search(r"\{.*\}", content.strip(), re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}


def label_hierarchy(hierarchy: list[dict], docs: pd.DataFrame, topic_words: dict) -> dict[str, str]:
    """Return {node_id: short human-readable label} for every hierarchy node.

    Never raises for a bad/partial LLM response — nodes the model skips or
    mislabels simply fall back to the existing keyword-based label at the
    call site, same as a missing ``hierarchy.json`` falls back to no tree.
    """
    if not hierarchy:
        return {}
    examples = _representative_docs(hierarchy, docs)
    labels: dict[str, str] = {}
    for start in range(0, len(hierarchy), NODES_PER_CALL):
        chunk = hierarchy[start:start + NODES_PER_CALL]
        lines = []
        for node in chunk:
            keywords = ", ".join(_keywords(node, topic_words)) or "(none)"
            example = examples.get(node["id"], "")[:EXAMPLE_CHARS]
            lines.append(f'Node {node["id"]}: keywords=[{keywords}] example="{example}"')
        prompt = (
            "You are naming clusters discovered by topic modeling a document corpus.\n"
            "Each node below is one cluster: its top keywords and one example document.\n"
            "For each node, write a short, specific, human-readable name (2-6 words, "
            "no numbering, no quotes, no leading article) that a general reader would "
            "understand at a glance — describe what the cluster is ABOUT, don't just "
            "restate the keywords. Write the name in the SAME language as the example "
            "document (do not translate it).\n\n"
            + "\n".join(lines)
            + '\n\nRespond with ONLY a JSON object mapping each node id (as a string) '
            'to its name, e.g. {"0": "...", "1": "..."}. No other text, no markdown fences.'
        )
        content = llm.chat_complete(
            [{"role": "user", "content": prompt}], json_mode=True, temperature=0.3,
        )
        parsed = _parse_json_object(content)
        for node in chunk:
            label = parsed.get(node["id"])
            if isinstance(label, str) and label.strip():
                labels[node["id"]] = label.strip()
    return labels
