#!/usr/bin/env python3
"""
Project Manager for Discord Agent Bridge
- Tự động quét và phát hiện các dự án (Auto-discovery) trên máy Mac
- Nạp cấu hình alias/mapping từ projects.json và biến môi trường PROJECT_SCAN_DIRS
- Cung cấp tính năng tìm kiếm / Autocomplete cho Discord
- Đóng gói chỉ thị quét mã nguồn (Context & Scan Directives) để Agent tự động định vị file/folder
"""

import os
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Các file nhận diện một thư mục là Project Code
PROJECT_MARKERS = {
    ".git",
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "go.mod",
    "pom.xml",
    "build.gradle",
    "Cargo.toml",
    "Pipfile"
}

# Các thư mục cần bỏ qua khi quét
IGNORE_DIRS = {
    "node_modules",
    "venv",
    ".venv",
    "dist",
    "build",
    "target",
    ".idea",
    ".vscode",
    ".cache",
    ".pytest_cache",
    "__pycache__"
}


class ProjectManager:
    def __init__(self, workspace_root: Optional[Path] = None):
        self.workspace_root = workspace_root or Path(__file__).resolve().parents[2]
        self.config_file = Path(__file__).resolve().parent / "projects.json"
        self.scan_roots: List[Path] = []
        self.projects_cache: Dict[str, Path] = {}
        self.aliases_cache: Dict[str, str] = {}
        self.reload()

    def reload(self):
        """Nạp lại toàn bộ danh sách project từ cấu hình và hệ thống tệp"""
        self._load_scan_roots()
        self._load_config_file()
        self._discover_projects()

    def _load_scan_roots(self):
        """Xác định các thư mục gốc cần quét dự án"""
        env_dirs = os.getenv("PROJECT_SCAN_DIRS", "")
        roots = []

        if env_dirs:
            for p in env_dirs.split(","):
                clean = p.strip()
                if clean and Path(clean).is_dir():
                    roots.append(Path(clean))

        # Thư mục cha của workspace gốc (nếu có)
        parent_of_root = self.workspace_root.parent
        if parent_of_root.is_dir() and parent_of_root not in roots and parent_of_root != Path.home():
            roots.append(parent_of_root)

        # Thư mục cấp trên (ví dụ: thư mục chứa các projects khác)
        grandparent = parent_of_root.parent
        if grandparent.is_dir() and grandparent not in roots and grandparent != Path.home():
            roots.append(grandparent)

        self.scan_roots = roots

    def _load_config_file(self):
        """Nạp file projects.json nếu có"""
        self.aliases_cache = {}
        if self.config_file.exists():
            try:
                with open(self.config_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        for k, v in data.items():
                            clean_k = k.strip().lower()
                            self.aliases_cache[clean_k] = str(v).strip()
            except Exception as e:
                print(f"⚠️ Lỗi khi đọc {self.config_file}: {e}", flush=True)

    def _discover_projects(self):
        """Quét các thư mục để tìm project repositories"""
        discovered: Dict[str, Path] = {}

        # 1. Nạp từ aliases trước (ưu tiên cao nhất)
        for alias, path_str in self.aliases_cache.items():
            p = Path(path_str).expanduser().resolve()
            if p.is_dir():
                discovered[alias] = p

        # 2. Quét tự động trong scan_roots (độ sâu tối đa 3 tầng)
        for root in self.scan_roots:
            if not root.exists():
                continue

            try:
                # Quét trực tiếp cấp con
                self._scan_dir_recursive(root, discovered, current_depth=0, max_depth=3)
            except Exception as e:
                print(f"⚠️ Lỗi quét thư mục {root}: {e}", flush=True)

        self.projects_cache = discovered

    def _scan_dir_recursive(self, current_dir: Path, out_dict: Dict[str, Path], current_depth: int, max_depth: int):
        if current_depth > max_depth:
            return

        try:
            entries = list(os.scandir(current_dir))
        except (PermissionError, OSError):
            return

        has_marker = False
        sub_dirs = []

        for entry in entries:
            name = entry.name
            if name.startswith(".") and name != ".git":
                continue
            if name in IGNORE_DIRS:
                continue

            if entry.is_dir(follow_symlinks=False):
                if name in PROJECT_MARKERS:
                    has_marker = True
                sub_dirs.append(Path(entry.path))
            elif entry.is_file():
                if name in PROJECT_MARKERS:
                    has_marker = True

        # Nếu chính thư mục này có marker (và không phải là root scan gốc)
        if has_marker and current_depth > 0:
            proj_name = current_dir.name
            proj_name_lower = proj_name.lower()
            if proj_name_lower not in out_dict:
                out_dict[proj_name_lower] = current_dir

        # Tiếp tục đệ quy xuống các thư mục con
        for sub in sub_dirs:
            if sub.name != ".git":
                self._scan_dir_recursive(sub, out_dict, current_depth + 1, max_depth)

    def list_projects(self) -> Dict[str, Path]:
        """Trả về toàn bộ project đã nhận diện"""
        return self.projects_cache

    def resolve_project(self, query: str) -> Optional[Tuple[str, Path]]:
        """
        Tìm kiếm project theo tên, alias hoặc đường dẫn:
        Trả về (project_display_name, absolute_path)
        """
        if not query or not query.strip():
            return None

        clean_q = query.strip()
        lower_q = clean_q.lower()

        # 1. Kiểm tra trực tiếp xem có phải đường dẫn tồn tại trên máy không
        direct_path = Path(clean_q).expanduser().resolve()
        if direct_path.is_dir():
            return (direct_path.name, direct_path)

        # 2. Khớp chính xác với tên trong cache
        if lower_q in self.projects_cache:
            p = self.projects_cache[lower_q]
            return (p.name, p)

        # 3. Khớp prefix (ví dụ gõ 'openapi' tìm thấy 'openapi-tyk' trước 'my-openapi-lib')
        for k, p in self.projects_cache.items():
            if k.startswith(lower_q) or p.name.lower().startswith(lower_q):
                return (p.name, p)

        # 4. Khớp substring (ví dụ gõ 'order' tìm thấy 'order-service' hoặc 'my-order-app')
        for k, p in self.projects_cache.items():
            if lower_q in k or lower_q in p.name.lower():
                return (p.name, p)

        return None

    def search_projects(self, query: str, limit: int = 25) -> List[Tuple[str, str, str]]:
        """
        Dùng cho Autocomplete trên Discord:
        Trả về danh sách tuple: (label, project_name, path_str)
        """
        cur = query.lower().strip()
        results = []

        for name_key, p in sorted(self.projects_cache.items(), key=lambda x: x[0]):
            display_name = p.name
            path_str = str(p)
            rel_hint = f"~/{p.relative_to(Path.home())}" if str(p).startswith(str(Path.home())) else path_str

            if not cur or cur in name_key or cur in display_name.lower() or cur in path_str.lower():
                label = f"{display_name} ({rel_hint})"
                if len(label) > 100:
                    label = f"{display_name} (...{path_str[-60:]})"
                results.append((label[:100], display_name, path_str))
                if len(results) >= limit:
                    break

        return results

    def parse_command_args(self, text: str) -> Tuple[str, Optional[str], str]:
        """
        Phân tích chuỗi lệnh prefix đồng bộ:
        Hỗ trợ:
          !run <skill> -p <project> -d <des>
          !run <skill> -d <des> -p <project>
          !run <skill> -p <project> <des>
          !run <skill> <des>
        Trả về: (skill, project_name, des)
        """
        clean = re.sub(r"^!(?:run|agent)\s*", "", text.strip())

        # 1. Tìm project ((?:^|\s)(?:--project|-p|project:)\s+([^\s]+))
        project = None
        p_pattern = r'(?:^|\s)(?:--project|-p|project:)\s+([^\s]+)'
        p_match = re.search(p_pattern, clean)
        if p_match:
            project = p_match.group(1).strip().strip('"\'')
            clean = clean[:p_match.start()] + " " + clean[p_match.end():]
            clean = " ".join(clean.split()).strip()

        # 2. Tìm des ((?:^|\s)(?:--des|-d|des:)\s+(.*)$)
        des = ""
        d_pattern = r'(?:^|\s)(?:--des|-d|des:)\s+(.*)$'
        d_match = re.search(d_pattern, clean)
        if d_match:
            des = d_match.group(1).strip().strip('"\'')
            clean = clean[:d_match.start()].strip()

        # 3. Phân tách skill từ phần còn lại
        parts = clean.split(maxsplit=1)
        skill = parts[0] if parts else ""
        if not des and len(parts) > 1:
            des = parts[1].strip().strip('"\'')

        return skill, project, des

    def parse_project_from_text(self, text: str) -> Tuple[Optional[str], str]:
        """Backward-compatible helper"""
        skill, proj, des = self.parse_command_args(text)
        rem = f"{skill} {des}".strip()
        return proj, rem

    def build_project_directive(
        self,
        skill: str,
        project_name: str,
        project_path: Path,
        des: str = ""
    ) -> str:
        """
        Sinh prompt thông minh gắn bối cảnh Project và chỉ đạo Agent tự động scan code
        """
        task_focus = des.strip() if des and des.strip() else "Toàn bộ module liên quan đến tính năng/nhiệm vụ này"

        directive = (
            f"[BỐI CẢNH DỰ ÁN MỤC TIÊU - TARGET PROJECT CONTEXT]\n"
            f"• Tên Project: {project_name}\n"
            f"• Thư mục mã nguồn gốc trên máy: {project_path}\n"
            f"• Phạm vi quét / Yêu cầu nhiệm vụ: {task_focus}\n\n"
            f"[HƯỚNG DẪN QUAN TRỌNG DÀNH CHO AGENT]:\n"
            f"1. Thư mục mã nguồn của ứng dụng cần scan/review/audit/lấy code nằm trực tiếp tại: `{project_path}`.\n"
            f"2. BẮT BUỘC bắt đầu bằng việc tự chủ động quét thư mục và tìm kiếm file (sử dụng các công cụ `list_dir`, `grep_search` hoặc lệnh `git status`/`git diff` nếu là git repository) bên trong `{project_path}` để định vị chính xác các file/folder mã nguồn liên quan đến '{task_focus}'.\n"
            f"3. TUYỆT ĐỐI KHÔNG hỏi người dùng vị trí file nếu bạn có thể tự quét và tìm ra trong `{project_path}`.\n"
            f"4. Áp dụng đầy đủ quy trình và tiêu chuẩn của kỹ năng `{skill}` trên các file mã nguồn đã tìm thấy.\n"
            f"5. Toàn bộ tài liệu đặc tả, checklist kiểm thử, code test hoặc báo cáo kết quả vẫn xuất ra thư mục workspace chuẩn theo quy tắc phân cấp artifact của hệ thống.\n\n"
            f"[LỆNH THỰC THI CHÍNH]:\n"
            f"{skill} {des}".strip()
        )
        return directive
