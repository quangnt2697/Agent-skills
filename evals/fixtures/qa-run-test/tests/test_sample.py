"""
Sample test suite for qa-run-test eval
"""
import pytest


def test_user_login_success():
    """Test successful login with valid credentials"""
    username = "testuser"
    password = "password123"

    # Simulate API call
    response = {"status": "success", "token": "abc123"}

    assert response["status"] == "success"
    assert "token" in response


def test_user_login_invalid_credentials():
    """Test login fails with invalid credentials"""
    username = "testuser"
    password = "wrongpassword"

    # Simulate API call
    response = {"status": "error", "message": "Invalid credentials"}

    assert response["status"] == "error"
    assert "Invalid credentials" in response["message"]


def test_order_creation_valid_data():
    """Test order creation with valid data"""
    order_data = {
        "symbol": "VNM",
        "quantity": 100,
        "price": 50000
    }

    # Simulate API call
    response = {"status": "success", "orderId": "ORD-12345"}

    assert response["status"] == "success"
    assert "orderId" in response


def test_order_creation_invalid_quantity():
    """Test order creation with quantity=0 should be rejected"""
    order_data = {
        "symbol": "VNM",
        "quantity": 0,  # Invalid: should be > 0
        "price": 50000
    }

    # Simulate API call - THIS SHOULD FAIL (bug in app code)
    response = {"status": "success", "orderId": "ORD-12345"}  # Wrong! Should be error

    # This assertion will FAIL, demonstrating a bug
    assert response["status"] == "error", "Expected API to reject order with quantity=0"
    assert response.get("errorCode") == "INVALID_QUANTITY"


@pytest.mark.skip(reason="Payment gateway not available in test environment")
def test_payment_processing():
    """Test payment processing (skipped in test env)"""
    pass


def test_websocket_connection():
    """Test WebSocket connection"""
    import time

    # Simulate connection with delay
    time.sleep(0.5)

    connected = True
    assert connected == True
