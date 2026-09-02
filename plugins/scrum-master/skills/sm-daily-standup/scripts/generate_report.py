import os
import json
import yaml
import math
import argparse
import datetime
from datetime import timezone, timedelta
import urllib.request
import urllib.error
import urllib.parse

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
    parser = argparse.ArgumentParser(description="Generate Daily Standup Report")
    parser.add_argument("--project-root", required=True, help="Path to the project root directory")
    args = parser.parse_args()

    project_root = args.project_root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    plugin_dir = os.path.dirname(script_dir) # sm-daily-standup is the plugin dir in this context? No, plugin_dir is agent-skills.
    # Actually, script is in plugin_dir/skills/sm-daily-standup/scripts/generate_report.py
    # So plugin_dir is 3 levels up
    plugin_root = os.path.dirname(os.path.dirname(os.path.dirname(script_dir)))

    # 1. Read config
    config_path = os.path.join(plugin_root, "sm-config.yaml")
    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    anchor_start_date_str = config["sprint_settings"]["anchor_start_date"]
    duration_days = config["sprint_settings"]["duration_days"]
    team = config["team"]
    board_id = config["jira_board"]["id"]

    # Calculate Sprint
    anchor_start_date = datetime.datetime.strptime(anchor_start_date_str, "%Y-%m-%d").date()
    today = datetime.date.today()
    days_since_anchor = (today - anchor_start_date).days
    sprint_index = math.floor(days_since_anchor / duration_days)
    current_sprint_start = anchor_start_date + datetime.timedelta(days=sprint_index * duration_days)
    current_sprint_end = current_sprint_start + datetime.timedelta(days=duration_days - 1)
    day_in_sprint = days_since_anchor - (sprint_index * duration_days) + 1

    # Load ENVs
    env_vars = load_env(os.path.join(plugin_root, ".env"))
    project_env = load_env(os.path.join(project_root, ".env"))
    env_vars.update(project_env) # Override with project env

    atlassian_base_url = env_vars.get("ATLASSIAN_BASE_URL")
    atlassian_email = env_vars.get("ATLASSIAN_EMAIL")
    atlassian_api_token = env_vars.get("ATLASSIAN_API_TOKEN")
    mattermost_url = env_vars.get("MATTERMOST_WEBHOOK_URL")

    if not all([atlassian_base_url, atlassian_email, atlassian_api_token]):
        print("Missing Jira credentials in .env")
        return

    # Helper for Jira API
    import base64
    auth_str = f"{atlassian_email}:{atlassian_api_token}"
    b64_auth_str = base64.b64encode(auth_str.encode('ascii')).decode('ascii')
    
    def jira_get(url):
        req = urllib.request.Request(url, headers={
            "Authorization": f"Basic {b64_auth_str}",
            "Accept": "application/json"
        })
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())

    # Get active sprint
    sprint_url = f"{atlassian_base_url}/rest/agile/1.0/board/{board_id}/sprint?state=active"
    sprint_data = jira_get(sprint_url)
    
    if not sprint_data.get("values"):
        print("No active sprint found.")
        return
        
    sprint_info = sprint_data["values"][0]
    sprint_id = sprint_info["id"]
    
    # Try to extract number from name
    sprint_name = sprint_info["name"]
    name_parts = sprint_name.split()
    sprint_num = name_parts[-1] if name_parts else sprint_name

    # Get issues (adding customfield_10022 which is Story Points for this workspace)
    issues_url = f"{atlassian_base_url}/rest/agile/1.0/board/{board_id}/sprint/{sprint_id}/issue?maxResults=200&fields=summary,status,assignee,customfield_10016,customfield_10022,timeoriginalestimate,priority,created,updated&expand=changelog"
    issues_data = jira_get(issues_url)
    issues = issues_data.get("issues", [])

    total_tickets = len(issues)
    done_count = 0
    in_progress_count = 0
    ready_to_test_count = 0
    open_count = 0
    
    committed_points = 0.0
    completed_points = 0.0
    
    done_issues = []
    in_progress_issues = []
    ready_to_test_issues = []
    open_issues = []
    stuck_issues = []
    
    # Build dev stats from team
    dev_stats = {}
    for member in team:
        dev_stats[member["name"]] = {"tickets": 0, "points": 0.0, "role": member["role"]}
    
    today_dt = datetime.datetime.now(timezone(timedelta(hours=7)))
    
    for issue in issues:
        key = issue["key"]
        fields = issue.get("fields", {})
        title = fields.get("summary", "")
        status_name = fields.get("status", {}).get("name", "")
        status_category = fields.get("status", {}).get("statusCategory", {}).get("name", "")
        
        assignee_name = fields.get("assignee", {}).get("displayName", "Unassigned") if fields.get("assignee") else "Unassigned"
        
        # Check customfield_10022 first (Story Points), then fallback to customfield_10016
        pts = fields.get("customfield_10022")
        if pts is None:
            pts = fields.get("customfield_10016")

        if pts is None or not isinstance(pts, (int, float)):
            # Fallback to timeoriginalestimate (in seconds, 1 day = 28800s)
            time_est = fields.get("timeoriginalestimate")
            if time_est is not None:
                pts = round(float(time_est) / 28800.0, 1)
            else:
                pts = 0.0
        else:
            pts = float(pts)
            
        priority_name = fields.get("priority", {}).get("name", "") if fields.get("priority") else ""
            
        committed_points += pts
        
        updated_str = fields.get("updated", "")
        
        # Calculate time in status using changelog
        status_changed_str = fields.get("created", "")
        changelog = issue.get("changelog", {}).get("histories", [])
        # Sort chronologically by created date (oldest first)
        changelog.sort(key=lambda x: x.get("created", ""))
        for history in reversed(changelog):
            found = False
            for item in history.get("items", []):
                if item.get("field") == "status":
                    status_changed_str = history.get("created")
                    found = True
                    break
            if found:
                break
                
        days_in_status = 0
        if status_changed_str:
            try:
                updated_dt = datetime.datetime.strptime(status_changed_str, "%Y-%m-%dT%H:%M:%S.%f%z")
                days_in_status = (today_dt - updated_dt).days
            except ValueError:
                days_in_status = 0
                
        warning = "⚠️" if days_in_status > 4 else ""
        if days_in_status > 4 and status_category != "Done":
            stuck_issues.append({
                "key": key,
                "title": title,
                "status": status_name,
                "priority": priority_name,
                "assignee": assignee_name,
                "days": days_in_status,
                "level": "🔴 Nghiêm trọng" if days_in_status > 7 else "🟡 Cảnh báo"
            })
            
        issue_data = {
            "key": key,
            "title": title,
            "priority": priority_name,
            "assignee": assignee_name,
            "pts": pts,
            "days": days_in_status,
            "warning": warning,
            "date": updated_str[:10] if updated_str else ""
        }
        
        status_lower = status_name.lower()
        
        if status_category == "Done" or status_lower in ["done", "closed", "resolved"]:
            done_count += 1
            completed_points += pts
            done_issues.append(issue_data)
        elif status_lower in ["in progress", "coding", "doing", "ready to merge"]:
            in_progress_count += 1
            in_progress_issues.append(issue_data)
        elif status_lower in ["ready to test", "ready for qa", "testing"]:
            ready_to_test_count += 1
            ready_to_test_issues.append(issue_data)
        else:
            open_count += 1
            open_issues.append(issue_data)
            
        if status_category != "Done":
            if assignee_name in dev_stats:
                dev_stats[assignee_name]["tickets"] += 1
                dev_stats[assignee_name]["points"] += pts

    done_percent = round((done_count / total_tickets * 100) if total_tickets else 0, 1)
    completed_points_percent = round((completed_points / committed_points * 100) if committed_points else 0, 1)
    
    # Read template
    template_path = os.path.join(os.path.dirname(script_dir), "templates", "daily-standup-report.md")
    with open(template_path, "r", encoding="utf-8") as f:
        template = f.read()
        
    template = template.replace("{N}", sprint_num)
    template = template.replace("{sprint_start_date}", current_sprint_start.strftime("%Y-%m-%d"))
    template = template.replace("{sprint_end_date}", current_sprint_end.strftime("%Y-%m-%d"))
    template = template.replace("{today}", today.strftime("%Y-%m-%d"))
    template = template.replace("{report_time}", today_dt.strftime("%H:%M:%S"))
    template = template.replace("{day_X}", str(day_in_sprint))
    template = template.replace("{total_days}", str(duration_days))
    
    template = template.replace("{total_tickets}", str(total_tickets))
    template = template.replace("{done_count}", str(done_count))
    template = template.replace("{done_percent}", str(done_percent))
    template = template.replace("{in_progress_count}", str(in_progress_count))
    template = template.replace("{ready_to_test_count}", str(ready_to_test_count))
    template = template.replace("{open_count}", str(open_count))
    template = template.replace("{committed_points}", str(committed_points))
    template = template.replace("{completed_points}", str(completed_points))
    template = template.replace("{completed_points_percent}", str(completed_points_percent))
    
    def format_table(issues_list, is_done=False):
        if not issues_list:
            return "✅ Không có ticket nào."
        lines = []
        for i, iss in enumerate(issues_list, 1):
            if is_done:
                lines.append(f"| {i} | {iss['key']} | {iss['title']} | {iss['priority']} | {iss['assignee']} | {iss['pts']} | {iss['date']} |")
            else:
                lines.append(f"| {i} | {iss['key']} | {iss['title']} | {iss['priority']} | {iss['assignee']} | {iss['pts']} | {iss['days']} ngày | {iss['warning']} |")
        return "\n".join(lines)
        
    template = template.replace("| 1 | {KEY-1}  | {title}  | {prio}  | {assignee} | {pts}    | {date}            |", format_table(done_issues, is_done=True))
    template = template.replace("| 1 | {KEY-2}  | {title}   | {prio}  | {assignee} | {pts}    | {X ngày}                 | {⚠️ nếu > 3 ngày} |", format_table(in_progress_issues))
    template = template.replace("| 1 | {KEY-3}  | {title}   | {prio}  | {assignee} | {pts}   | {X ngày}             | {⚠️ nếu > 3 ngày} |", format_table(ready_to_test_issues))
    template = template.replace("| 1 | {KEY-4}  | {title}   | {prio}  | {assignee} | {pts}    | {X ngày}           | {⚠️ nếu > 3 ngày} |", format_table(open_issues))
    
    if not stuck_issues:
        stuck_str = "✅ Không có ticket nào bị treo quá 3 ngày."
        template = template.replace("| 1 | {KEY-X}  | {title}   | {status}             | {prio}  | {assignee} | {X ngày}            | 🔴 Nghiêm trọng / 🟡 Cảnh báo |", stuck_str)
    else:
        stuck_lines = []
        for i, iss in enumerate(stuck_issues, 1):
            stuck_lines.append(f"| {i} | {iss['key']} | {iss['title']} | {iss['status']} | {iss['priority']} | {iss['assignee']} | {iss['days']} ngày | {iss['level']} |")
        template = template.replace("| 1 | {KEY-X}  | {title}   | {status}             | {prio}  | {assignee} | {X ngày}            | 🔴 Nghiêm trọng / 🟡 Cảnh báo |", "\n".join(stuck_lines))
        
    # Remove proposals table if not generated
    proposals_text = "✅ Không có vấn đề hoặc rủi ro nào được ghi nhận."
    template = template.replace("{proposals}", proposals_text)

    app_dev = dev_stats.get("Phan Hữu Thắng", {"tickets": 0, "points": 0.0})
    web_dev = dev_stats.get("Lương Tuấn Linh", {"tickets": 0, "points": 0.0})
    
    template = template.replace("| Phan Hữu Thắng  | Developer APP | {n}         | {pts}         | Chuyên trách APP – Không cân bằng |", 
                                f"| Phan Hữu Thắng  | Developer APP | {app_dev['tickets']} | {app_dev['points']} | Chuyên trách APP – Không cân bằng |")
    template = template.replace("| Lương Tuấn Linh | Developer WEB | {n}         | {pts}         | Chuyên trách WEB – Không cân bằng |", 
                                f"| Lương Tuấn Linh | Developer WEB | {web_dev['tickets']} | {web_dev['points']} | Chuyên trách WEB – Không cân bằng |")
                                
    dat = dev_stats.get("Trịnh Quốc Đạt", {"tickets": 0, "points": 0.0})
    son = dev_stats.get("Nguyễn Thành Sơn", {"tickets": 0, "points": 0.0})
    
    total_be_pts = dat["points"] + son["points"]
    total_be_tickets = dat["tickets"] + son["tickets"]
    
    dat_pt_pct = round(dat["points"] / total_be_pts * 100) if total_be_pts else 50
    son_pt_pct = round(son["points"] / total_be_pts * 100) if total_be_pts else 50
    
    dat_tk_pct = round(dat["tickets"] / total_be_tickets * 100) if total_be_tickets else 50
    son_tk_pct = round(son["tickets"] / total_be_tickets * 100) if total_be_tickets else 50
    
    diff_pt = abs(dat_pt_pct - son_pt_pct)
    diff_tk = abs(dat_tk_pct - son_tk_pct)
    
    is_imbalanced = diff_pt > 20 or diff_tk > 20
    delta_ticket = abs(dat["tickets"] - son["tickets"])
    delta_pts = abs(dat["points"] - son["points"])
    delta_pct = max(diff_pt, diff_tk)
    
    template = template.replace("| Trịnh Quốc Đạt   | {n}                | {pts}           | {percent}%           |",
                                f"| Trịnh Quốc Đạt | {dat['tickets']} | {dat['points']} | {dat_tk_pct}% (TK) / {dat_pt_pct}% (Pts) |")
    template = template.replace("| Nguyễn Thành Sơn | {n}                | {pts}           | {percent}%           |",
                                f"| Nguyễn Thành Sơn | {son['tickets']} | {son['points']} | {son_tk_pct}% (TK) / {son_pt_pct}% (Pts) |")
    template = template.replace("| **Chênh lệch**   | **{delta_ticket}** | **{delta_pts}** | **{delta_percent}%** |",
                                f"| **Chênh lệch** | **{delta_ticket}** | **{delta_pts}** | **{delta_pct}%** |")
                                
    if is_imbalanced:
        overloaded = "Trịnh Quốc Đạt" if dat["points"] > son["points"] else "Nguyễn Thành Sơn"
        underloaded = "Nguyễn Thành Sơn" if overloaded == "Trịnh Quốc Đạt" else "Trịnh Quốc Đạt"
        
        transfer_issue = None
        for iss in (in_progress_issues + open_issues):
            if iss["assignee"] == overloaded:
                transfer_issue = iss
                break
                
        if transfer_issue:
            suggestion = f"⚠️ **Mất cân bằng** (chênh lệch > 20%): *Đề xuất chuyển ticket {transfer_issue['key']} ({transfer_issue['pts']} pts) từ {overloaded} sang {underloaded} để cân bằng khối lượng.*"
        else:
            suggestion = f"⚠️ **Mất cân bằng** (chênh lệch > 20%): *Cần rà soát chuyển ticket từ {overloaded} sang {underloaded} để cân bằng khối lượng.*"
            
        template = template.replace("> - ✅ **Cân bằng** (chênh lệch ≤ 20%): Phân bổ hợp lý, không cần điều chỉnh.\n> - ⚠️ **Mất cân bằng** (chênh lệch > 20%): *Đề xuất chuyển ticket {KEY-Y} ({pts} pts) từ {người_quá_tải} sang {người_rảnh_hơn} để cân bằng khối lượng.*", suggestion)
    else:
        template = template.replace("> - ✅ **Cân bằng** (chênh lệch ≤ 20%): Phân bổ hợp lý, không cần điều chỉnh.\n> - ⚠️ **Mất cân bằng** (chênh lệch > 20%): *Đề xuất chuyển ticket {KEY-Y} ({pts} pts) từ {người_quá_tải} sang {người_rảnh_hơn} để cân bằng khối lượng.*", "> - ✅ **Cân bằng** (chênh lệch ≤ 20%): Phân bổ hợp lý, không cần điều chỉnh.")

    template = template.replace("{timestamp}", today_dt.strftime("%Y-%m-%d %H:%M:%S"))
    
    # Save report
    sprint_dir = os.path.join(project_root, "workspace", "sprint")
    os.makedirs(sprint_dir, exist_ok=True)
    report_path = os.path.join(sprint_dir, "daily-standup-report.md")
    
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(template)
        
    print(f"Report saved to {report_path}")
    
    # Send to mattermost
    if mattermost_url:
        try:
            payload = {"text": template}
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(mattermost_url, data=data, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req) as response:
                print("Successfully sent report to Mattermost.")
        except Exception as e:
            print(f"Failed to send to Mattermost: {e}")
            
if __name__ == "__main__":
    main()
