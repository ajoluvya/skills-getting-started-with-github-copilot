"""Tests for the activities API endpoints."""
import json
import pytest


def test_root_redirect(client):
    """Test that root redirects to /static/index.html"""
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "/static/index.html"


def test_get_activities(client):
    """Test GET /activities returns all activities."""
    response = client.get("/activities")
    assert response.status_code == 200
    data = response.json()
    
    # Verify structure and some known activities
    assert isinstance(data, dict)
    assert "Chess Club" in data
    assert "Programming Class" in data
    assert "Gym Class" in data
    
    # Check Chess Club details
    chess = data["Chess Club"]
    assert chess["description"] == "Learn strategies and compete in chess tournaments"
    assert chess["max_participants"] == 12
    assert "michael@mergington.edu" in chess["participants"]
    assert "daniel@mergington.edu" in chess["participants"]


def test_signup_for_activity_success(client):
    """Test successful signup for an activity."""
    response = client.post(
        "/activities/Chess Club/signup",
        json={"email": "newstudent@mergington.edu"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "Signed up" in data["message"]
    assert "newstudent@mergington.edu" in data["message"]
    
    # Verify the student was added
    activities = client.get("/activities").json()
    assert "newstudent@mergington.edu" in activities["Chess Club"]["participants"]


def test_signup_duplicate(client):
    """Test that duplicate signup is rejected."""
    # First signup
    response1 = client.post(
        "/activities/Chess Club/signup",
        json={"email": "michael@mergington.edu"}
    )
    assert response1.status_code == 400
    assert "already signed up" in response1.json()["detail"]


def test_signup_nonexistent_activity(client):
    """Test signup for non-existent activity."""
    response = client.post(
        "/activities/Nonexistent Club/signup",
        json={"email": "student@mergington.edu"}
    )
    assert response.status_code == 404
    assert "Activity not found" in response.json()["detail"]


def test_unregister_success(client):
    """Test successful unregistration from an activity."""
    # First, signup a student
    client.post(
        "/activities/Basketball Club/signup",
        json={"email": "testuser@mergington.edu"}
    )
    
    # Now unregister them
    response = client.request(
        "DELETE",
        "/activities/Basketball Club/unregister",
        json={"email": "testuser@mergington.edu"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "Unregistered" in data["message"]
    
    # Verify they were removed
    activities = client.get("/activities").json()
    assert "testuser@mergington.edu" not in activities["Basketball Club"]["participants"]


def test_unregister_not_found(client):
    """Test unregister for participant not in activity."""
    response = client.request(
        "DELETE",
        "/activities/Chess Club/unregister",
        json={"email": "notamember@mergington.edu"}
    )
    assert response.status_code == 404
    assert "Participant not found" in response.json()["detail"]


def test_unregister_nonexistent_activity(client):
    """Test unregister from non-existent activity."""
    response = client.request(
        "DELETE",
        "/activities/Fake Club/unregister",
        json={"email": "student@mergington.edu"}
    )
    assert response.status_code == 404
    assert "Activity not found" in response.json()["detail"]
