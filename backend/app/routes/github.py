import logging
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.dependencies import get_current_user
from app.database import get_db
from app.services.github_service import github_service

logger = logging.getLogger("prepr.routes.github")

router = APIRouter(prefix="/api/v1/github", tags=["GitHub Integration"])

# In-memory backup store for test suites or offline modes
_in_memory_github_links: Dict[str, Dict[str, Any]] = {}


class LinkGitHubRequest(BaseModel):
    github_username: str = Field(..., min_length=1, max_length=40, description="Candidate GitHub handle")


@router.get("/repos/{username}")
async def get_github_repositories(username: str):
    """Public endpoint to preview repositories for a given GitHub handle."""
    repos = await github_service.fetch_candidate_repositories(username)
    if not repos:
        # Check if username might be invalid or rate-limited
        return {
            "status": "not_found_or_empty",
            "username": username,
            "total": 0,
            "repos": [],
            "message": f"No public repositories found for GitHub username '{username}'."
        }

    return {
        "status": "success",
        "username": username,
        "total": len(repos),
        "repos": repos
    }


@router.post("/link")
async def link_github_account(
    request: LinkGitHubRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Link a GitHub username to candidate's profile and synchronize repos into MongoDB."""
    user_id = current_user.get("firebase_uid") or current_user.get("uid")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to identify candidate from authentication token."
        )

    cleaned_user = request.github_username.strip().lstrip("@")
    repos = await github_service.fetch_candidate_repositories(cleaned_user)

    # In-memory store
    _in_memory_github_links[user_id] = {
        "github_username": cleaned_user,
        "repos": repos,
    }

    from app.database import db_manager
    if db_manager.db is not None:
        try:
            await db_manager.db.users.update_one(
                {"firebase_uid": user_id},
                {
                    "$set": {
                        "github_username": cleaned_user,
                        "github_repos": repos,
                    }
                },
                upsert=True
            )
            logger.info(f"[GitHubRoute] Successfully linked GitHub '{cleaned_user}' to user '{user_id}'")
        except Exception as e:
            logger.error(f"[GitHubRoute] Error saving GitHub link to MongoDB: {e}")

    return {
        "status": "linked",
        "github_username": cleaned_user,
        "total_repos": len(repos),
        "repos": repos
    }


@router.get("/linked")
async def get_linked_github_account(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieve candidate's linked GitHub account and cached repositories."""
    user_id = current_user.get("firebase_uid") or current_user.get("uid")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth context.")

    from app.database import db_manager
    if db_manager.db is not None:
        try:
            doc = await db_manager.db.users.find_one({"firebase_uid": user_id})
            if doc and doc.get("github_username"):
                return {
                    "status": "linked",
                    "github_username": doc.get("github_username"),
                    "repos": doc.get("github_repos", [])
                }
        except Exception as e:
            logger.warning(f"[GitHubRoute] DB query error on linked GitHub: {e}")

    # Fallback to in-memory store
    mem = _in_memory_github_links.get(user_id)
    if mem:
        return {
            "status": "linked",
            "github_username": mem.get("github_username"),
            "repos": mem.get("repos", [])
        }

    return {
        "status": "unlinked",
        "github_username": None,
        "repos": []
    }


@router.delete("/unlink")
async def unlink_github_account(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Remove candidate's linked GitHub profile from MongoDB."""
    user_id = current_user.get("firebase_uid") or current_user.get("uid")
    if user_id:
        _in_memory_github_links.pop(user_id, None)

    from app.database import db_manager
    if db_manager.db is not None and user_id:
        await db_manager.db.users.update_one(
            {"firebase_uid": user_id},
            {
                "$unset": {
                    "github_username": "",
                    "github_repos": ""
                }
            }
        )

    return {"status": "unlinked"}
