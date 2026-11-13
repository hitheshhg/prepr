import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.services.github_service import github_service
from app.dependencies import get_current_user

MOCK_USER = {
    "uid": "github_tester_user",
    "firebase_uid": "github_tester_user",
    "email": "hithesh.test@prepr.ai",
    "display_name": "Hithesh H G",
}

SAMPLE_REPOS = [
    {
        "name": "prepr",
        "description": "Autonomous Multimodal Framework for Adaptive Technical Interview Assessment",
        "language": "Python",
        "stars": 42,
        "forks": 5,
        "is_fork": False,
        "html_url": "https://github.com/hitheshhg/prepr",
        "topics": ["ai", "fastapi", "react"],
        "updated_at": "2026-11-13T10:00:00Z"
    },
    {
        "name": "distributed-cache",
        "description": "In-memory distributed key-value cache with Raft consensus",
        "language": "Go",
        "stars": 18,
        "forks": 2,
        "is_fork": False,
        "html_url": "https://github.com/hitheshhg/distributed-cache",
        "topics": ["distributed-systems", "raft"],
        "updated_at": "2026-11-10T10:00:00Z"
    }
]


def test_format_repositories_for_prompt():
    """Verify repository list converts cleanly into prompt context."""
    formatted = github_service.format_repositories_for_prompt(SAMPLE_REPOS)
    assert "Verified Public GitHub Codebases & Projects:" in formatted
    assert "1. prepr (Language: Python, Stars: 42)" in formatted
    assert "2. distributed-cache (Language: Go, Stars: 18)" in formatted
    assert "Autonomous Multimodal Framework" in formatted


@pytest.mark.asyncio
async def test_github_routes_require_auth():
    """Verify unauthenticated access to link and linked endpoints is blocked with 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r1 = await client.post("/api/v1/github/link", json={"github_username": "hitheshhg"})
        assert r1.status_code == 401

        r2 = await client.get("/api/v1/github/linked")
        assert r2.status_code == 401

        r3 = await client.delete("/api/v1/github/unlink")
        assert r3.status_code == 401


@pytest.mark.asyncio
async def test_github_public_preview_and_auth_flow(monkeypatch):
    """Verify public repo preview, account linking, fetching linked repos, and unlinking."""
    # Mock GitHub Service fetch so tests don't hit external GitHub API rate limits
    async def mock_fetch(self, username, max_repos=10):
        if username == "hitheshhg":
            return SAMPLE_REPOS
        return []

    monkeypatch.setattr(github_service, "fetch_candidate_repositories", mock_fetch.__get__(github_service))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Public preview endpoint
        res = await client.get("/api/v1/github/repos/hitheshhg")
        assert res.status_code == 200
        data = res.json()
        assert data["username"] == "hitheshhg"
        assert data["total"] == 2
        assert data["repos"][0]["name"] == "prepr"

        # 2. Authenticated Link
        app.dependency_overrides[get_current_user] = lambda: MOCK_USER
        try:
            link_res = await client.post(
                "/api/v1/github/link",
                json={"github_username": "hitheshhg"}
            )
            assert link_res.status_code == 200
            assert link_res.json()["status"] == "linked"
            assert link_res.json()["github_username"] == "hitheshhg"

            # 3. Retrieve linked status
            get_res = await client.get("/api/v1/github/linked")
            assert get_res.status_code == 200
            assert get_res.json()["github_username"] == "hitheshhg"

            # 4. Unlink
            del_res = await client.delete("/api/v1/github/unlink")
            assert del_res.status_code == 200
            assert del_res.json()["status"] == "unlinked"
        finally:
            app.dependency_overrides.pop(get_current_user, None)
