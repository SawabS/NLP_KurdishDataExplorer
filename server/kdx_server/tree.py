"""Convert saved BERTopic hierarchy nodes into Plotly-ready arrays."""
from __future__ import annotations

from collections import defaultdict
import pandas as pd


def build_tree(hierarchy: list[dict], docs: pd.DataFrame, has_labels: bool, depth: int = -1) -> dict:
    samples = {
        int(tid): str(group["text"].iloc[0])[:120]
        for tid, group in docs[docs["topic"] != -1].groupby("topic")
    }
    leaf_counts: dict[int, dict[str, int]] = {}
    if has_labels and "label" in docs:
        labeled = docs[(docs["topic"] != -1) & docs["label"].notna()]
        leaf_counts = {
            int(tid): group["label"].value_counts().astype(int).to_dict()
            for tid, group in labeled.groupby("topic")
        }

    node_by_id = {str(node["id"]): node for node in hierarchy}
    children: dict[str, list[str]] = defaultdict(list)
    for node in hierarchy:
        parent = str(node.get("parent", ""))
        if parent in node_by_id:
            children[parent].append(str(node["id"]))

    memo: dict[str, dict[str, int]] = {}

    def label_counts(node_id: str) -> dict[str, int]:
        if node_id not in memo:
            node = node_by_id[node_id]
            if node.get("is_leaf"):
                memo[node_id] = leaf_counts.get(int(node["topic_id"]), {})
            else:
                aggregate: dict[str, int] = {}
                for child in children[node_id]:
                    for label, count in label_counts(child).items():
                        aggregate[label] = aggregate.get(label, 0) + count
                memo[node_id] = aggregate
        return memo[node_id]

    levels: dict[str, int] = {}

    def level(node_id: str) -> int:
        if node_id not in levels:
            parent = str(node_by_id[node_id].get("parent", ""))
            levels[node_id] = 1 if parent not in node_by_id else level(parent) + 1
        return levels[node_id]

    rows = []
    for node in hierarchy:
        node_id = str(node["id"])
        if depth > 0 and level(node_id) > depth:
            continue
        topic_id = node.get("topic_id")
        counts = label_counts(node_id) if has_labels else {}
        rows.append({
            "id": node_id,
            "parent": str(node.get("parent", "")),
            "label": node.get("label") or node_id,
            "value": int(node.get("count", 0)),
            "kind": "topic" if node.get("is_leaf") else "group",
            "category": max(counts, key=counts.get) if counts else ("(unlabeled)" if has_labels else "(group)"),
            "topic_id": None if topic_id is None else int(topic_id),
            "sample": samples.get(int(topic_id), "") if topic_id is not None else "",
        })
    return {
        "ids": [row["id"] for row in rows],
        "parents": [row["parent"] for row in rows],
        "labels": [row["label"] for row in rows],
        "values": [row["value"] for row in rows],
        "kinds": [row["kind"] for row in rows],
        "categories": [row["category"] for row in rows],
        "topic_ids": [row["topic_id"] for row in rows],
        "samples": [row["sample"] for row in rows],
        "branchvalues": "total",
    }
