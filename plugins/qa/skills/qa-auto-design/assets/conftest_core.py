# ==========================================================
# conftest_core.py — Core Logging Hooks, Env Loader & JIT Data Grounding
# ==========================================================
# Cung cấp:
# 1. Cơ chế nạp môi trường phân tầng (load_hierarchical_env)
# 2. EnvConfig quản lý hạn mức & ánh xạ biên BVA tượng trưng
# 3. TestLogCollector & fixture ghi log trung thực 100% test cases (PASSED & FAILED)
# 4. Context manager fixture `step` cho BDD step logging
# 5. JIT Data Grounding fixtures (market_fixture, valid_order_symbol, order_book_fixture)
# 6. Pytest hook pytest_runtest_makereport xuất test-output.log và chụp ảnh lỗi
# ==========================================================

import os
import json
import time
import uuid
import glob
from pathlib import Path
from contextlib import contextmanager
import pytest
from dotenv import load_dotenv, find_dotenv

# ==========================================================
# CƠ CHẾ NẠP MÔI TRƯỜNG PHÂN TẦNG (Cascading Env Load)
# ==========================================================
def load_hierarchical_env():
    """
    Nạp cấu hình môi trường phân tầng:
    0. Central agent-skills/.env (kho credentials tập trung trên máy)
    1. Root .env của project hiện tại (nền tảng)
    2. Sibling task .env cùng domain (kế thừa nếu thiếu API_KEY, SECRET,...)
    3. Task-local .env (ưu tiên ghi đè cao nhất)
    """
    current_dir = Path(__file__).resolve().parent  # steps/ or assets/
    task_test_dir = current_dir.parent             # workspace/issues/{issueKey}/test/
    workspace_dir = task_test_dir.parent.parent    # workspace/
    project_root = workspace_dir.parent            # repo root của project hiện tại

    # 0. Nạp từ Central agent-skills/.env
    agent_env_candidates = [
        os.getenv("AGENT_SKILLS_ENV_PATH"),
        os.getenv("AGENT_SKILLS_PATH", "") + "/.env" if os.getenv("AGENT_SKILLS_PATH") else None,
        next(
            (p for p in [
                project_root.parent / "agent-skills" / ".env",
                project_root.parent.parent / "agent-skills" / ".env",
            ] if Path(p).exists()), None
        ),
        project_root.parent / "agent-skills" / ".env",
        project_root / ".env" if project_root.name == "agent-skills" else None,
    ]
    for candidate in agent_env_candidates:
        if candidate and Path(candidate).exists():
            load_dotenv(candidate, override=False)
            break

    # 1. Nạp từ Project Root
    root_env = project_root / ".env"
    if root_env.exists():
        load_dotenv(root_env, override=False)

    # 2. Kế thừa từ Sibling Tasks
    if not os.getenv("API_KEY") or not os.getenv("API_SECRET"):
        sibling_envs = glob.glob(str(workspace_dir / "*" / "test" / ".env"))
        for sib in sibling_envs:
            if Path(sib).resolve() != (task_test_dir / ".env").resolve():
                load_dotenv(sib, override=False)
                if os.getenv("API_KEY") and os.getenv("API_SECRET"):
                    break

    # 3. Nạp Task-local .env (Ưu tiên ghi đè cao nhất)
    local_env = task_test_dir / ".env"
    if local_env.exists():
        load_dotenv(local_env, override=True)
    else:
        load_dotenv(find_dotenv(usecwd=True))

load_hierarchical_env()

# ==========================================================
# DYNAMIC ENVIRONMENT CONFIG & SYMBOLIC BOUNDARIES (EnvConfig)
# ==========================================================
class EnvConfig:
    """Quản lý cấu hình môi trường tập trung và ánh xạ biên động từ .env."""

    @staticmethod
    def get_max_connector(tier: str) -> int:
        """Hạn mức kết nối socket đồng thời theo tier."""
        tier_normalized = tier.strip().lower()
        key = f"{tier_normalized.upper()}_USER_MAX_CONNECTOR"
        defaults = {"normal": 10, "vip": 25, "ultimate": 50}
        return int(os.getenv(key, defaults.get(tier_normalized, 10)))

    @staticmethod
    def get_max_stream(tier: str) -> int:
        """Hạn mức số stream/mã chứng khoán theo dõi theo tier."""
        tier_normalized = tier.strip().lower()
        key = f"{tier_normalized.upper()}_USER_MAX_STREAM"
        defaults = {"normal": 200, "vip": 400, "ultimate": 400}
        return int(os.getenv(key, defaults.get(tier_normalized, 200)))

    @staticmethod
    def get_rate_limit(tier: str) -> int:
        """Ngưỡng tần suất gửi tin nhắn/yêu cầu (msg/s) theo tier."""
        tier_normalized = tier.strip().lower()
        key = f"{tier_normalized.upper()}_USER_RATE_LIMIT"
        defaults = {"normal": 10, "vip": 50, "ultimate": 200}
        return int(os.getenv(key, defaults.get(tier_normalized, 10)))

    @classmethod
    def resolve_boundary(cls, tier: str, metric_type: str, boundary_pos: str) -> int:
        """
        Ánh xạ vị trí biên tượng trưng từ Gherkin sang giá trị số nguyên thực tế:
        - TAI_HAN_MUC / AT_LIMIT: đúng bằng limit
        - VUOT_HAN_MUC / OVER_LIMIT: limit + 1
        - DUOI_HAN_MUC / BELOW_LIMIT: max(1, limit - 1)
        - TRONG_NGUONG / WITHIN_LIMIT: đúng bằng ngưỡng (limit)
        - VUOT_NGUONG / BEYOND_LIMIT: vượt ngưỡng (limit + 5 hoặc limit * 1.2)
        """
        m_type = metric_type.strip().upper()
        if m_type in ("CONNECTOR", "SOCKET", "CONNECTION"):
            limit = cls.get_max_connector(tier)
        elif m_type in ("STREAM", "TOPIC", "SYMBOL"):
            limit = cls.get_max_stream(tier)
        elif m_type in ("RATE_LIMIT", "MESSAGE", "TAN_SUAT"):
            limit = cls.get_rate_limit(tier)
        else:
            raise ValueError(f"Loại hạn mức không hợp lệ: {metric_type}")

        b_pos = boundary_pos.strip().upper()
        if b_pos in ("TAI_HAN_MUC", "AT_LIMIT", "LIMIT"):
            return limit
        elif b_pos in ("VUOT_HAN_MUC", "OVER_LIMIT"):
            return limit + 1
        elif b_pos in ("DUOI_HAN_MUC", "BELOW_LIMIT"):
            return max(1, limit - 1)
        elif b_pos in ("TRONG_NGUONG", "WITHIN_LIMIT"):
            return limit
        elif b_pos in ("VUOT_NGUONG", "BEYOND_LIMIT"):
            return limit + max(1, int(limit * 0.2))
        else:
            try:
                return int(boundary_pos)
            except ValueError:
                raise ValueError(f"Không thể giải quyết vị trí biên: '{boundary_pos}'")

# ==========================================================
# CLI OPTIONS REGISTRATION
# ==========================================================
def pytest_addoption(parser):
    """Đăng ký các tùy chọn CLI cơ bản."""
    try:
        parser.addoption(
            "--env-target",
            action="store",
            default=os.getenv("ENV_TARGET", "uat"),
            help="Target environment (uat, sandbox, staging, dev)"
        )
    except Exception:
        pass  # Đã đăng ký từ plugin khác

# ==========================================================
# LOGGING INTERCEPTOR & EVIDENCE COLLECTOR
# ==========================================================
class TestLogCollector:
    """
    Thu thập toàn bộ Request Payload và Response Body của từng testcase (REST & WebSocket).
    Hoạt động độc lập trên từng test method để ghi lại bằng chứng kiểm thử 100% trung thực.
    """
    def __init__(self, test_name: str):
        self.test_name = test_name
        self.step_records = []
        self.http_records = []
        self.ws_records = []

    def record_step(self, step_name: str, status: str = "PASSED", details: any = None, elapsed_ms: float = 0.0):
        step_num = len(self.step_records) + 1
        self.step_records.append({
            "step_num": step_num,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "name": step_name,
            "status": status,
            "details": details,
            "elapsed_ms": elapsed_ms,
        })

    def record_http(self, method: str, url: str, headers: dict, request_body: any,
                    status_code: int, response_time_ms: float, response_headers: dict, response_body: any):
        masked_headers = {}
        for k, v in (headers or {}).items():
            if k.lower() in ("authorization", "x-api-key", "api-key", "api-secret"):
                masked_headers[k] = "***masked***"
            else:
                masked_headers[k] = v

        self.http_records.append({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "method": method.upper(),
            "url": url,
            "headers": masked_headers,
            "request_body": request_body,
            "status_code": status_code,
            "response_time_ms": response_time_ms,
            "response_headers": dict(response_headers or {}),
            "response_body": response_body,
        })

    def record_ws(self, event_type: str, url: str = None, channel: str = None,
                  payload: any = None, latency_ms: float = 0.0):
        self.ws_records.append({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "event_type": event_type,
            "url": url,
            "channel": channel,
            "payload": payload,
            "latency_ms": latency_ms,
        })

@pytest.fixture(autouse=True)
def test_log_collector(request):
    """Fixture tự động cấp TestLogCollector cho từng testcase."""
    collector = TestLogCollector(request.node.name)
    request.node._log_collector = collector
    yield collector

@pytest.fixture
def step(test_log_collector):
    """Fixture context manager ghi log chi tiết từng step thực hiện (Given / When / Then / And)."""
    @contextmanager
    def _step(step_name: str):
        start = time.perf_counter()
        try:
            yield
            elapsed_ms = (time.perf_counter() - start) * 1000
            test_log_collector.record_step(step_name, status="PASSED", elapsed_ms=elapsed_ms)
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start) * 1000
            test_log_collector.record_step(step_name, status="FAILED", details=str(e), elapsed_ms=elapsed_ms)
            raise
    return _step

@pytest.fixture
def unique_id():
    """Sinh ID unique cho mỗi test method. Format: auto_[timestamp]_[random]."""
    return f"auto_{int(time.time())}_{uuid.uuid4().hex[:6]}"

@pytest.fixture(scope="session")
def target_environment():
    """Tự động nhận diện môi trường từ BASE_URL và điều hướng đúng Database."""
    base_url = os.getenv("BASE_URL", "")
    raw = base_url.lower()
    if "sandbox" in raw or "sb-openapi" in raw or "sb-openapi-uat" in raw:
        return {
            "name": "sandbox",
            "base_url": base_url,
            "db_id": int(os.getenv("METABASE_DB_OPENAPI_SANDBOX_ID", "655")),
            "db_name": "openapi-sandbox",
        }
    return {
        "name": "openapi",
        "base_url": base_url,
        "db_id": int(os.getenv("METABASE_DB_OPENAPI_ID", "535")),
        "db_name": "openapi",
    }

# ==========================================================
# JIT DATA GROUNDING FIXTURES (Metabase UAT / TimescaleDB)
# ==========================================================
@pytest.fixture(scope="session")
def market_fixture():
    """Nạp dữ liệu thị trường thật được export tại test/fixtures/market_data.json."""
    test_dir = Path(__file__).resolve().parent.parent
    fixture_file = test_dir / "fixtures" / "market_data.json"
    if fixture_file.exists():
        try:
            with open(fixture_file, "r", encoding="utf-8") as f:
                payload = json.load(f)
                return payload.get("data", payload)
        except Exception as e:
            print(f"⚠️ Lỗi đọc fixture {fixture_file}: {e}")
    return {}

@pytest.fixture(scope="session")
def valid_order_symbol(market_fixture):
    """
    Lấy mã chứng khoán hợp lệ kèm giá trần/sàn/tham chiếu thật từ fixture.
    Hỗ trợ hàm tính giá động theo price_type (JIT Data Grounding).
    """
    securities = market_fixture.get("securities", [])
    if securities and len(securities) > 0:
        sec = securities[0]
        ref = float(sec.get("reference_price") or 10000)
        ceil = float(sec.get("ceiling_price") or int(ref * 1.07))
        floor = float(sec.get("floor_price") or int(ref * 0.93))
        tick = float(100 if ref >= 50000 else (50 if ref >= 10000 else 10))
    else:
        ref, ceil, floor, tick = 72.2, 77.2, 67.2, 0.1

    def resolve_price(price_type: str = "AT_REF") -> float:
        pt = price_type.strip().upper()
        if pt in ("AT_REF", "REF", "THAM_CHIEU"):
            return ref
        elif pt in ("AT_CEILING", "CEILING", "TRAN"):
            return ceil
        elif pt in ("AT_FLOOR", "FLOOR", "SAN"):
            return floor
        elif pt in ("OVER_CEILING_1_TICK", "VUOT_TRAN_1_BUOC"):
            return ceil + tick
        elif pt in ("UNDER_FLOOR_1_TICK", "DUOI_SAN_1_BUOC"):
            return max(0.1, floor - tick)
        try:
            return float(price_type)
        except ValueError:
            return ref

    return {
        "symbol": securities[0].get("symbol", "FPT") if securities else "FPT",
        "market_id": securities[0].get("market_id", 6) if securities else 6,
        "board_id": securities[0].get("board_id", 2) if securities else 2,
        "reference_price": ref,
        "ceiling_price": ceil,
        "floor_price": floor,
        "tick_size": tick,
        "resolve_price": resolve_price,
    }

@pytest.fixture(scope="session")
def order_book_fixture(market_fixture):
    """Lấy dữ liệu sổ lệnh (toàn bộ bước giá bid/ask) từ fixture nếu có."""
    return market_fixture.get("order_book", {})

# ==========================================================
# PYTEST HOOK: FULL LOGGING (PASSED & FAILED) & SCREENSHOT
# ==========================================================
@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    Hook thực thi sau mỗi testcase:
    1. Ghi toàn bộ Payload & Response của 100% test case (PASSED & FAILED) vào test-output.log.
    2. Chụp ảnh màn hình khi test case bị FAILED (cho Web UI và Mobile App).
    """
    outcome = yield
    report = outcome.get_result()

    if report.when == "call":
        result_dir = os.path.join(os.getcwd(), "test", "result")
        os.makedirs(result_dir, exist_ok=True)
        log_file = os.path.join(result_dir, "test-output.log")

        status_text = "PASSED" if report.passed else ("FAILED" if report.failed else "SKIPPED")
        duration = getattr(call, "duration", 0.0)

        collector = getattr(item, "_log_collector", None)
        log_lines = [
            f"\n{'='*80}",
            f"[TESTCASE]: {item.name} | [STATUS]: {status_text} | [DURATION]: {duration:.2f}s",
            f"{'-'*80}",
        ]

        steps_to_log = []
        if collector and collector.step_records:
            steps_to_log = collector.step_records
        else:
            doc = getattr(item.obj, "__doc__", "") or ""
            parsed_steps = []
            for line in doc.splitlines():
                stripped = line.strip()
                if any(stripped.startswith(kw) for kw in ("Given ", "When ", "Then ", "And ", "But ")):
                    parsed_steps.append(stripped)
            if parsed_steps:
                for idx, step_text in enumerate(parsed_steps, 1):
                    s_status = status_text if not report.failed or idx < len(parsed_steps) else "FAILED"
                    steps_to_log.append({
                        "step_num": idx,
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "name": step_text,
                        "status": s_status,
                    })

        if steps_to_log:
            log_lines.append("  [STEPS EXECUTED]:")
            for s in steps_to_log:
                status_icon = "✅ PASSED" if s["status"] == "PASSED" else ("❌ FAILED" if s["status"] == "FAILED" else "⏭️ SKIPPED")
                elapsed_str = f" ({s['elapsed_ms']:.1f}ms)" if s.get("elapsed_ms") else ""
                log_lines.append(f"    - Step {s['step_num']}: {s['name']} [{status_icon}]{elapsed_str}")
                if s.get("details"):
                    log_lines.append(f"      Details: {s['details']}")
            log_lines.append(f"  {'-'*40}")
        else:
            log_lines.append("  (Không có Step metadata được ghi nhận)")
            log_lines.append(f"  {'-'*40}")

        if collector and (collector.http_records or collector.ws_records):
            for idx, r in enumerate(collector.http_records, 1):
                log_lines.append(f"  [HTTP #{idx}] {r['timestamp']} {r['method']} {r['url']}")
                log_lines.append(f"  Request Headers: {json.dumps(r['headers'], ensure_ascii=False)}")
                if r['request_body'] is not None:
                    log_lines.append(f"  Request Payload: {json.dumps(r['request_body'], indent=2, ensure_ascii=False)}")
                log_lines.append(f"  Response Status: {r['status_code']} | Latency: {r['response_time_ms']:.1f}ms")
                log_lines.append(f"  Response Body: {json.dumps(r['response_body'], indent=2, ensure_ascii=False) if isinstance(r['response_body'], (dict, list)) else r['response_body']}")
                log_lines.append(f"  {'-'*40}")

            for idx, w in enumerate(collector.ws_records, 1):
                log_lines.append(f"  [WS #{idx}] {w['timestamp']} Event: {w['event_type']} | Channel: {w.get('channel')} | URL: {w.get('url')}")
                if w.get('payload') is not None:
                    log_lines.append(f"  Payload: {json.dumps(w['payload'], indent=2, ensure_ascii=False) if isinstance(w['payload'], (dict, list)) else w['payload']}")
                log_lines.append(f"  {'-'*40}")
        else:
            log_lines.append("  (Không có HTTP/WS interaction được ghi nhận qua LoggingSession)")

        if report.failed:
            log_lines.append(f"  [FAILURE REASON]: {report.longreprtext if hasattr(report, 'longreprtext') else str(report.longrepr)}")

        log_lines.append(f"{'='*80}\n")

        try:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write("\n".join(log_lines))
        except Exception as e:
            print(f"⚠️ Lỗi ghi file test-output.log: {e}")

        if report.failed:
            screenshots_dir = os.path.join(result_dir, "screenshots")
            os.makedirs(screenshots_dir, exist_ok=True)
            timestamp = int(time.time())
            screenshot_path = os.path.join(screenshots_dir, f"fail_{item.name}_{timestamp}.png")

            page = item.funcargs.get("page") or item.funcargs.get("mobile_page")
            if page and hasattr(page, "screenshot"):
                try:
                    page.screenshot(path=screenshot_path, full_page=True)
                except Exception:
                    pass

            driver = item.funcargs.get("appium_driver")
            if driver and hasattr(driver, "save_screenshot"):
                try:
                    driver.save_screenshot(screenshot_path)
                except Exception:
                    pass
