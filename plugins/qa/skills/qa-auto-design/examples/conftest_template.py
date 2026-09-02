# ==========================================================
# Pytest conftest.py mẫu — Root fixtures dùng chung
# ==========================================================
# File này đặt ở thư mục gốc project: conftest.py
# Cung cấp các fixture dùng chung cho toàn bộ test suite.
# ==========================================================

import os
import pytest
from dotenv import load_dotenv

# Load biến môi trường từ .env
load_dotenv()


# ============================
# AUTH FIXTURES
# ============================

@pytest.fixture(scope="session")
def base_url():
    """Base URL đọc từ .env, KHÔNG hardcode."""
    return os.getenv("BASE_URL", "https://sandbox.example.com")


@pytest.fixture(scope="session")
def auth_token():
    """Auth token đọc từ .env. Lấy 1 lần, tái sử dụng toàn session."""
    token = os.getenv("API_TOKEN")
    assert token, "API_TOKEN chưa được set trong .env"
    return token


@pytest.fixture(scope="session")
def auth_token_user_b():
    """Token cho user B — dùng trong test Data Isolation."""
    token = os.getenv("API_TOKEN_USER_B")
    assert token, "API_TOKEN_USER_B chưa được set trong .env"
    return token


# ============================
# DYNAMIC TEST DATA
# ============================

@pytest.fixture
def unique_id():
    """Sinh ID unique cho mỗi test method. Format: auto_[timestamp]_[random]."""
    import time
    import uuid
    return f"auto_{int(time.time())}_{uuid.uuid4().hex[:6]}"


# ============================
# BROWSER FIXTURES (UI only)
# ============================

@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """Override viewport mặc định thành 1920x1080."""
    return {
        **browser_context_args,
        "viewport": {"width": 1920, "height": 1080},
    }
