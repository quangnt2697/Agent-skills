#!/usr/bin/env python3
"""
Push refined spec to Jira issue.

Usage:
    python jira-push-refined-spec.py --issue-key PROJ-123 --spec-file path/to/spec.md
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv


def load_env():
    """Load environment variables from .env file."""
    # Try workspace root first
    workspace_root = Path.cwd()
    env_path = workspace_root / ".env"

    if not env_path.exists():
        # Try parent directories
        for parent in workspace_root.parents:
            env_path = parent / ".env"
            if env_path.exists():
                break

    if not env_path.exists():
        print("❌ Error: .env file not found")
        print("Please create .env file with:")
        print("  ATLASSIAN_BASE_URL=https://your-domain.atlassian.net")
        print("  ATLASSIAN_EMAIL=your-email@company.com")
        print("  ATLASSIAN_API_TOKEN=your-api-token")
        sys.exit(1)

    load_dotenv(env_path)

    base_url = os.getenv("ATLASSIAN_BASE_URL")
    email = os.getenv("ATLASSIAN_EMAIL")
    token = os.getenv("ATLASSIAN_API_TOKEN")

    if not all([base_url, email, token]):
        print("❌ Error: Missing environment variables")
        print("Required: ATLASSIAN_BASE_URL, ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN")
        sys.exit(1)

    return base_url.rstrip("/"), email, token


def markdown_to_jira_wiki(md_content: str) -> str:
    """Convert markdown to Jira Wiki Markup."""
    lines = md_content.split("\n")
    jira_lines = []
    in_code_block = False
    in_table = False

    for line in lines:
        # Code blocks
        if line.startswith("```"):
            in_code_block = not in_code_block
            if in_code_block:
                lang = line[3:].strip()
                jira_lines.append(f"{{code:{lang if lang else 'none'}}}")
            else:
                jira_lines.append("{code}")
            continue

        if in_code_block:
            jira_lines.append(line)
            continue

        # Headers
        if line.startswith("# "):
            jira_lines.append(f"h1. {line[2:]}")
        elif line.startswith("## "):
            jira_lines.append(f"h2. {line[3:]}")
        elif line.startswith("### "):
            jira_lines.append(f"h3. {line[4:]}")
        elif line.startswith("#### "):
            jira_lines.append(f"h4. {line[5:]}")

        # Lists
        elif line.strip().startswith("- "):
            indent = len(line) - len(line.lstrip())
            marker = "*" * (indent // 2 + 1)
            jira_lines.append(f"{marker} {line.strip()[2:]}")
        elif line.strip().startswith("* "):
            indent = len(line) - len(line.lstrip())
            marker = "*" * (indent // 2 + 1)
            jira_lines.append(f"{marker} {line.strip()[2:]}")

        # Bold/Italic
        else:
            # Convert **bold** to *bold*
            line = line.replace("**", "*")
            # Convert *italic* to _italic_
            # (but be careful not to double-convert bold)

            # Tables - simple conversion
            if "|" in line and not in_table:
                in_table = True
            elif in_table and not "|" in line:
                in_table = False

            jira_lines.append(line)

    return "\n".join(jira_lines)


def push_to_jira(base_url: str, email: str, token: str, issue_key: str, spec_file: Path):
    """Push refined spec to Jira."""

    if not spec_file.exists():
        print(f"❌ Error: Spec file not found: {spec_file}")
        sys.exit(1)

    # Read spec file
    with open(spec_file, "r", encoding="utf-8") as f:
        spec_content = f.read()

    # Convert to Jira Wiki Markup
    jira_content = markdown_to_jira_wiki(spec_content)

    # Update Jira description
    print(f"📝 Updating {issue_key} description...")

    url = f"{base_url}/rest/api/3/issue/{issue_key}"
    auth = (email, token)
    headers = {"Content-Type": "application/json"}

    payload = {
        "fields": {
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": jira_content
                            }
                        ]
                    }
                ]
            }
        }
    }

    response = requests.put(url, auth=auth, headers=headers, json=payload)

    if response.status_code not in [200, 204]:
        print(f"❌ Failed to update description: {response.status_code}")
        print(response.text)
        sys.exit(1)

    print("✅ Description updated")

    # Add comment
    print(f"💬 Adding comment...")

    comment_url = f"{base_url}/rest/api/3/issue/{issue_key}/comment"

    comment_payload = {
        "body": {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": f"✅ Spec đã được refine bởi ba-refine skill\n\n"
                        },
                        {
                            "type": "text",
                            "text": f"🔗 Local file: {spec_file}\n",
                            "marks": [{"type": "code"}]
                        },
                        {
                            "type": "text",
                            "text": f"📅 Refined date: {datetime.now().isoformat()}"
                        }
                    ]
                }
            ]
        }
    }

    response = requests.post(comment_url, auth=auth, headers=headers, json=comment_payload)

    if response.status_code not in [200, 201]:
        print(f"⚠️  Failed to add comment: {response.status_code}")
        print(response.text)
    else:
        print("✅ Comment added")

    # Add label
    print(f"🏷️  Adding label...")

    # Get current labels
    get_url = f"{base_url}/rest/api/3/issue/{issue_key}"
    response = requests.get(get_url, auth=auth)

    if response.status_code == 200:
        current_labels = response.json().get("fields", {}).get("labels", [])

        if "refined-by-agent" not in current_labels:
            current_labels.append("refined-by-agent")

            label_payload = {
                "fields": {
                    "labels": current_labels
                }
            }

            response = requests.put(url, auth=auth, headers=headers, json=label_payload)

            if response.status_code not in [200, 204]:
                print(f"⚠️  Failed to add label: {response.status_code}")
            else:
                print("✅ Label added: refined-by-agent")
        else:
            print("✅ Label already exists: refined-by-agent")

    # Create push log
    log_dir = spec_file.parent
    log_file = log_dir / "push-log.json"

    log_entry = {
        "issueKey": issue_key,
        "pushDate": datetime.now().isoformat(),
        "localFile": str(spec_file),
        "jiraUrl": f"{base_url}/browse/{issue_key}"
    }

    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(log_entry, f, indent=2, ensure_ascii=False)

    print(f"✅ Push log created: {log_file}")
    print(f"\n🔗 View updated task: {base_url}/browse/{issue_key}")


def main():
    parser = argparse.ArgumentParser(
        description="Push refined spec to Jira issue"
    )
    parser.add_argument(
        "--issue-key",
        required=True,
        help="Jira issue key (e.g., PROJ-123)"
    )
    parser.add_argument(
        "--spec-file",
        required=True,
        help="Path to refined spec markdown file"
    )

    args = parser.parse_args()

    base_url, email, token = load_env()
    spec_file = Path(args.spec_file)

    push_to_jira(base_url, email, token, args.issue_key, spec_file)


if __name__ == "__main__":
    main()
