import logging
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger("prepr.github")


class GitHubService:
    """Service to fetch, parse, and format public candidate repositories for AI interview synthesis."""

    def __init__(self):
        # In-memory cache to respect GitHub API rate limits (username -> repos)
        self._cache: Dict[str, Dict[str, Any]] = {}

    async def fetch_candidate_repositories(
        self,
        username: str,
        max_repos: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Fetch public repositories for a GitHub user.
        Sorts by most recently updated and filters out irrelevant forks if originals exist.
        """
        cleaned_user = username.strip().lstrip("@")
        if not cleaned_user:
            return []

        # Check cache
        if cleaned_user.lower() in self._cache:
            logger.info(f"[GitHubService] Returning cached repositories for '{cleaned_user}'")
            return self._cache[cleaned_user.lower()]["repos"]

        url = f"https://api.github.com/users/{cleaned_user}/repos?sort=updated&per_page=20"
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Prepr-Interview-Platform",
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 404:
                    logger.warning(f"[GitHubService] GitHub user '{cleaned_user}' not found (404)")
                    return []
                if response.status_code != 200:
                    logger.warning(
                        f"[GitHubService] GitHub API returned status {response.status_code} for user '{cleaned_user}'"
                    )
                    return []

                raw_repos = response.json()
                if not isinstance(raw_repos, list):
                    return []

                # Clean and structure repositories
                parsed: List[Dict[str, Any]] = []
                for r in raw_repos:
                    # Prefer original repositories over empty forks
                    parsed.append({
                        "name": r.get("name", "Untitled Repo"),
                        "full_name": r.get("full_name", ""),
                        "description": r.get("description") or "No description provided",
                        "language": r.get("language") or "General Code",
                        "stars": r.get("stargazers_count", 0),
                        "forks": r.get("forks_count", 0),
                        "is_fork": r.get("fork", False),
                        "html_url": r.get("html_url", ""),
                        "topics": r.get("topics", []),
                        "updated_at": r.get("updated_at", ""),
                    })

                # Sort: Non-forks first, then by stars desc, then recent
                sorted_repos = sorted(
                    parsed,
                    key=lambda x: (not x["is_fork"], x["stars"]),
                    reverse=True
                )[:max_repos]

                # Cache result
                self._cache[cleaned_user.lower()] = {
                    "repos": sorted_repos,
                    "count": len(sorted_repos)
                }

                logger.info(f"[GitHubService] Fetched {len(sorted_repos)} repositories for '{cleaned_user}'")
                return sorted_repos

        except Exception as e:
            logger.error(f"[GitHubService] Exception fetching GitHub repositories for '{cleaned_user}': {e}")
            return []

    def format_repositories_for_prompt(self, repos: List[Dict[str, Any]]) -> str:
        """
        Format repositories into a clean, concise prompt context block for Gemini.
        """
        if not repos:
            return ""

        lines = ["Verified Public GitHub Codebases & Projects:"]
        for i, r in enumerate(repos[:5], 1):
            desc = r['description']
            if len(desc) > 120:
                desc = desc[:117] + "..."
            topics_str = f" [Topics: {', '.join(r['topics'][:3])}]" if r.get("topics") else ""
            lines.append(
                f"{i}. {r['name']} (Language: {r['language']}, Stars: {r['stars']}){topics_str}: {desc}"
            )

        return "\n".join(lines)


# Singleton instance
github_service = GitHubService()
