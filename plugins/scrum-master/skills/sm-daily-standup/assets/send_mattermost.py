import os
import json
import argparse
import urllib.request
import urllib.error

def load_env(env_path):
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        env_vars[parts[0].strip()] = parts[1].strip()
    return env_vars

def main():
    parser = argparse.ArgumentParser(description="Send Daily Standup Report to Mattermost")
    parser.add_argument("--project-root", required=True, help="Path to the project root directory")
    args = parser.parse_args()

    project_root = os.path.abspath(args.project_root)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # repo_root is 5 levels up: scripts -> sm-daily-standup -> skills -> scrum-master -> plugins -> repo_root
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(script_dir)))))

    # Load ENVs
    env_vars = load_env(os.path.join(repo_root, ".env"))
    project_env = load_env(os.path.join(project_root, ".env"))
    env_vars.update(project_env)

    mattermost_url = env_vars.get("MATTERMOST_WEBHOOK_URL")
    
    if not mattermost_url:
        print("Error: MATTERMOST_WEBHOOK_URL not found in .env")
        return

    # Check trace path first, then fallback to workspace/sprint root
    report_path = os.path.join(project_root, "workspace", "sprint", "trace", "daily-standup-report.md")
    if not os.path.exists(report_path):
        report_path = os.path.join(project_root, "workspace", "sprint", "daily-standup-report.md")
    
    if not os.path.exists(report_path):
        print(f"Error: Report file not found at {report_path}")
        return

    try:
        with open(report_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        payload = {"text": content}
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(mattermost_url, data=data, headers={"Content-Type": "application/json"})
        
        with urllib.request.urlopen(req) as response:
            print("Successfully sent report to Mattermost.")
    except Exception as e:
        print(f"Failed to send to Mattermost: {e}")

if __name__ == "__main__":
    main()
