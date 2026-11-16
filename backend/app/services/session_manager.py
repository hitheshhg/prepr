import os
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from bson import ObjectId

from app.models.session import (
    QuestionItem,
    AnswerScores,
    AnswerEvaluation,
    TurnHistoryItem,
    CombinedTurnResponse,
    StartInterviewRequest,
    StartInterviewResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    SessionSummary,
)
from app.services.gemini_client import GeminiClient
from app.database import db_manager

logger = logging.getLogger("prepr.session_manager")

import os
import uuid
import random
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from bson import ObjectId

from app.models.session import (
    QuestionItem,
    AnswerScores,
    AnswerEvaluation,
    TurnHistoryItem,
    CombinedTurnResponse,
    StartInterviewRequest,
    StartInterviewResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    SessionSummary,
)
from app.services.gemini_client import GeminiClient
from app.database import db_manager

logger = logging.getLogger("prepr.session_manager")

# Path to prompts directory
PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "prompts")


def load_prompt_template(filename: str) -> str:
    path = os.path.join(PROMPTS_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _normalize_role(role_name: str) -> str:
    """Normalize role string into recognized technical tracks."""
    r = (role_name or "").lower()
    if any(k in r for k in ["front", "react", "vue", "angular", "ui", "web design"]):
        return "frontend"
    if any(k in r for k in ["back", "fastapi", "django", "node", "express", "golang", "go", "api", "database"]):
        return "backend"
    if any(k in r for k in ["devops", "cloud", "sre", "infra", "kubernetes", "k8s", "docker", "platform"]):
        return "devops"
    if any(k in r for k in ["data", "ml", "ai", "machine learning", "analytics", "nlp", "vision"]):
        return "data_ml"
    if any(k in r for k in ["full", "stack", "software engineer", "swe"]):
        return "full_stack"
    return "default"


ROLE_FALLBACK_QUESTIONS: Dict[str, List[Dict[str, Any]]] = {
    "full_stack": [
        {
            "category": "project_deep_dive",
            "text": "Walk me through the end-to-end request lifecycle of a full-stack feature you implemented, from React UI state transition down through API middleware, DB write, and back.",
            "context_note": "Evaluates full-stack architectural mastery, asynchronous workflows, and API design.",
            "hint": "Discuss client state management, HTTP/REST serialization, async backend handling, DB transactions, and optimistic UI updates."
        },
        {
            "category": "technical",
            "text": "How do you handle authentication, session persistence, and token rotation (e.g. JWT with refresh tokens) in an SPA communicating with a REST/GraphQL backend? What safeguards protect against XSS and CSRF?",
            "context_note": "Probes modern web security, HTTP-only cookies, token lifecycles, and CORS hygiene.",
            "hint": "HTTP-only Secure SameSite cookies, short-lived access tokens, refresh token rotation, Content Security Policy."
        },
        {
            "category": "system_design",
            "text": "How would you design a real-time collaborative workspace (similar to Google Docs or Miro) supporting concurrent edits, presence tracking, and conflict resolution?",
            "context_note": "Assesses distributed consensus, WebSockets, Operational Transformation (OT) or CRDTs.",
            "hint": "WebSockets/SSE, CRDTs vs OT, Redis pub/sub for broadcast, heartbeats for active presence."
        },
        {
            "category": "technical",
            "text": "In an asynchronous full-stack application, how do you handle database connection pooling and backpressure when traffic spikes 10x unexpectedly?",
            "context_note": "Evaluates resource bounds, pool starvation, rate limiting, and queueing theory.",
            "hint": "Max pool sizing, async connection queues, circuit breakers, rate limiters, read replicas."
        },
        {
            "category": "behavioral",
            "text": "Describe a situation where a tight delivery deadline conflicted with technical quality or test coverage. How did you negotiate and manage the trade-offs with stakeholders?",
            "context_note": "Assesses pragmatic engineering judgment, scope management, and professional communication.",
            "hint": "Documenting technical debt, defining MVP boundaries, prioritizing automated regression tests for critical paths."
        },
        {
            "category": "situational",
            "text": "A customer reports that their profile updates intermittently revert to stale data on page refresh. How do you isolate whether it's client-side cache invalidation, load balancer caching, or DB read replica lag?",
            "context_note": "Tests systematic distributed debugging and consistency models.",
            "hint": "Inspect network response headers, verify cache keys/ETags, check replication lag metrics, inspect read-after-write consistency."
        },
        {
            "category": "technical",
            "text": "Explain optimistic UI updates in modern client frameworks. What specific patterns do you use to cleanly roll back state when the backend transaction encounters a validation or network error?",
            "context_note": "Assesses frontend reliability, transaction rollback, and error UX.",
            "hint": "Snapshot previous state, dispatch rollback on error, notify user with actionable toast/dialog, retry queue."
        },
        {
            "category": "system_design",
            "text": "Design a scalable notification service that delivers millions of personalized email, SMS, and in-app notifications daily with guaranteed delivery order and deduplication.",
            "context_note": "Evaluates message brokers, idempotency keys, worker pools, and fallback channels.",
            "hint": "Kafka/RabbitMQ message queues, Redis idempotency keys, exponential backoff with dead letter queues."
        }
    ],
    "frontend": [
        {
            "category": "project_deep_dive",
            "text": "Explain how React's reconciliation engine and Fiber architecture determine when and how DOM nodes are mutated. How do you profile and debug unnecessary re-renders in a complex UI tree?",
            "context_note": "Probes deep understanding of Virtual DOM, Fiber nodes, work-in-progress trees, and performance profiling.",
            "hint": "React DevTools Profiler, useMemo, useCallback, React.memo, immutable state updates, key prop importance."
        },
        {
            "category": "technical",
            "text": "How do you optimize Core Web Vitals (Largest Contentful Paint, Interaction to Next Paint, Cumulative Layout Shift) on a content-heavy web application with third-party tracking scripts?",
            "context_note": "Tests browser rendering pipeline, critical CSS, asset prioritization, and layout stability.",
            "hint": "Font display swap, aspect ratio bounding boxes, deferring non-critical scripts, preloading hero assets."
        },
        {
            "category": "system_design",
            "text": "Design a scalable design system component library in TypeScript. How do you architect theme tokens, polymorphic components, and enforce accessibility (WCAG 2.1 AA)?",
            "context_note": "Evaluates enterprise frontend architecture, atomic design, semantic HTML, and ARIA roles.",
            "hint": "Design tokens, CSS variables, Radix/Headless UI primitives, automated a11y testing (axe-core)."
        },
        {
            "category": "technical",
            "text": "Compare CSS Grid, Flexbox, and Container Queries for responsive layouts. What is layout thrashing (forced synchronous layout), and how do you prevent it in animations?",
            "context_note": "Evaluates browser reflow/repaint cycles and modern layout paradigms.",
            "hint": "Transform/opacity GPU layer promotion, requestAnimationFrame, reading layout metrics after write batches."
        },
        {
            "category": "behavioral",
            "text": "Tell me about a time you advocated for a UX, performance, or accessibility improvement that product managers initially deprioritized. How did you build a data-driven case?",
            "context_note": "STAR format behavioral testing empathy, persistence, and business alignment.",
            "hint": "Lighthouse metrics, bounce rate correlation, accessibility compliance risks, A/B test results."
        },
        {
            "category": "situational",
            "text": "Users on lower-end mobile devices report that your web app experiences noticeable UI lag when scrolling through large paginated tables. How would you diagnose and eliminate this bottleneck?",
            "context_note": "Assesses DOM node minimization, virtualization, and memory profiling.",
            "hint": "Virtual list windowing (react-window), debouncing scroll listeners, Chrome Performance timeline profiling."
        }
    ],
    "backend": [
        {
            "category": "project_deep_dive",
            "text": "Walk me through the architecture of a high-throughput backend service you designed. How did you structure your domain models, dependency injection, and database transaction boundaries?",
            "context_note": "Assesses clean architecture, repository patterns, and unit of work consistency.",
            "hint": "Separation of concerns, ACID guarantees, transaction rollbacks, decoupled services."
        },
        {
            "category": "technical",
            "text": "Compare gRPC over HTTP/2 with RESTful JSON APIs. In what distributed microservice scenarios does gRPC deliver significant performance or developer velocity advantages?",
            "context_note": "Evaluates binary serialization, multiplexing, streaming, and strong type safety.",
            "hint": "Protobuf serialization speed, multiplexed TCP connections, bi-directional streaming, code generation."
        },
        {
            "category": "system_design",
            "text": "Design a distributed URL shortening service (like bit.ly) capable of sustaining 10,000 writes/sec and 100,000 reads/sec with low latency and 99.99% availability.",
            "context_note": "Classic scalable system design evaluating ID generation (Snowflake/Base62), caching, and DB partitioning.",
            "hint": "Base62 encoding, Redis LRU cache, hash range partitioning, read replicas, CDN edge redirection."
        },
        {
            "category": "technical",
            "text": "Explain database isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable). What concurrency anomalies does each mitigate, and what are their locking costs?",
            "context_note": "Probes deep relational database theory, multi-version concurrency control (MVCC), and deadlocks.",
            "hint": "Dirty reads, non-repeatable reads, phantom reads, write skew, snapshot isolation."
        },
        {
            "category": "behavioral",
            "text": "Tell me about a technical debt item in backend services that you proactively identified, justified to leadership, and refactored. What measurable gains resulted?",
            "context_note": "Evaluates initiative, continuous improvement, and quantifiable impact.",
            "hint": "Latency reduction, CPU utilization drop, error rate decrease, developer build time speedup."
        },
        {
            "category": "situational",
            "text": "Your production backend service encounters a progressive memory leak causing container restarts every few hours under normal load. Detail your triage and resolution playbook.",
            "context_note": "Assesses memory profiling, heap snapshots, unclosed sockets/file descriptors, and telemetry.",
            "hint": "Memory heap dumps, tracemalloc/pprof, checking unclosed connection pools or unbounded caches, canary rollback."
        }
    ],
    "devops": [
        {
            "category": "project_deep_dive",
            "text": "Describe a multi-stage container build and automated CI/CD pipeline you implemented. How did you harden security, eliminate vulnerabilities, and ensure fast build caching?",
            "context_note": "Evaluates container optimization, vulnerability scanning, and delivery velocity.",
            "hint": "Distroless/Alpine base images, Trivy scanning, non-root users, Docker layer caching, semantic versioning."
        },
        {
            "category": "technical",
            "text": "Explain the Kubernetes Pod lifecycle. What are the key distinctions between readiness and liveness probes, and what happens under the hood during a rolling update?",
            "context_note": "Assesses container orchestration, endpoint slicing, graceful termination signals (SIGTERM).",
            "hint": "Liveness triggers restart; readiness controls service traffic routing; terminationGracePeriodSeconds."
        },
        {
            "category": "system_design",
            "text": "Design a multi-region disaster recovery architecture for a critical enterprise service with an RPO of under 5 minutes and an RTO of under 15 minutes.",
            "context_note": "Evaluates cross-region database replication, DNS failover (Route 53 latency/health checks), and active-passive vs active-active.",
            "hint": "Async cross-region replication, global traffic load balancing, automated health checks, data sync checkpoints."
        },
        {
            "category": "technical",
            "text": "How do you manage Infrastructure as Code (IaC) with Terraform or OpenTofu? How do you prevent state lock contention and handle drift detection in multi-engineer teams?",
            "context_note": "Evaluates declarative infrastructure, remote state locking (S3 + DynamoDB), and CI/CD pipelines.",
            "hint": "Remote backend state locking, plan review in PRs, automated drift detection cron jobs."
        },
        {
            "category": "behavioral",
            "text": "Describe how you participated in or facilitated a blameless post-mortem following a high-severity production outage. What preventive measures were adopted?",
            "context_note": "Assesses blameless culture, 5-Whys root cause analysis, and preventative engineering.",
            "hint": "Focus on system vulnerabilities rather than human error, actionable remediation tickets with SLA deadlines."
        },
        {
            "category": "situational",
            "text": "During peak business hours, two nodes in your Kubernetes cluster transition into 'NotReady' status, causing pod eviction cascades. What are your immediate diagnostic steps?",
            "context_note": "Assesses rapid incident containment and command-line diagnostics.",
            "hint": "kubectl describe node, check kubelet logs, inspect disk/memory pressure conditions, cordon & drain."
        }
    ],
    "data_ml": [
        {
            "category": "project_deep_dive",
            "text": "Walk me through an end-to-end data processing or ML pipeline you engineered. How did you validate data quality, handle missing schema fields, and optimize throughput?",
            "context_note": "Evaluates data engineering rigor, ETL pipelines, schema enforcement, and latency.",
            "hint": "Great Expectations, Apache Spark/Airflow, feature validation, partition strategies."
        },
        {
            "category": "technical",
            "text": "How do you detect and mitigate data drift and concept drift in a deployed machine learning service? What automated alerting mechanisms do you establish?",
            "context_note": "Probes MLOps, statistical distribution monitoring (KS-test, PSI), and retraining pipelines.",
            "hint": "Population Stability Index, Kolmogorov-Smirnov test, monitoring prediction distribution vs ground truth."
        },
        {
            "category": "system_design",
            "text": "Design a real-time vector search and retrieval service that serves semantic embeddings for 10 million documents with sub-25ms p99 latency.",
            "context_note": "Assesses vector databases (Pinecone, Milvus, pgvector), HNSW indexing, and quantization.",
            "hint": "HNSW index, scalar quantization, embedding cache in Redis, sharded vector partitions."
        },
        {
            "category": "technical",
            "text": "Explain SQL window functions (ROW_NUMBER, DENSE_RANK, LAG, LEAD). When would you choose window functions over subqueries or self-joins for analytical aggregations?",
            "context_note": "Assesses advanced analytical query optimization and database execution plans.",
            "hint": "Partition by, order by clauses, eliminating redundant table scans, running totals and moving averages."
        },
        {
            "category": "behavioral",
            "text": "Tell me about a time when business stakeholders misunderstood model metrics (e.g. high accuracy on an imbalanced dataset). How did you guide them toward the right business KPI?",
            "context_note": "Evaluates technical communication, precision vs recall trade-offs, and PR-AUC.",
            "hint": "Cost of false positives vs false negatives, F1-score, ROC/PR curves, aligning with business revenue loss."
        },
        {
            "category": "situational",
            "text": "An automated overnight data ingestion job silently ingested corrupted records with unexpected null timestamps, poisoning downstream dashboards. How do you recover and ensure it never recurs?",
            "context_note": "Assesses data recovery, point-in-time rollbacks, and defensive schema constraints.",
            "hint": "Idempotent backfill, point-in-time recovery, pre-ingestion validation gates, circuit breaking data pipelines."
        }
    ],
    "default": [
        {
            "category": "project_deep_dive",
            "text": "Walk me through the most technically challenging software system or project you have built. What was the architectural design, and what were your specific personal technical contributions?",
            "context_note": "Foundational icebreaker evaluating architectural reasoning, ownership, and engineering depth.",
            "hint": "Explain system architecture, technical choices, difficulties overcome, and quantified impact."
        },
        {
            "category": "technical",
            "text": "How do you handle asynchronous operations and concurrent state management in your applications? What are the key pitfalls (e.g. race conditions, deadlocks) to avoid?",
            "context_note": "Probing concurrency, thread safety, and event-driven patterns.",
            "hint": "Discuss async/await, event loops, promises/futures, race conditions, atomic operations, and deadlocks."
        },
        {
            "category": "system_design",
            "text": "Design a high-throughput rate limiter for an API with millions of daily requests. What data structures, caching layers, and distributed algorithms would you select?",
            "context_note": "Evaluates distributed systems, Redis Token Bucket / Leaky Bucket algorithms, and horizontal scaling.",
            "hint": "Token bucket algorithm, Redis sliding window log, handling network latency, clock drift, and failover."
        },
        {
            "category": "technical",
            "text": "Explain database indexing strategies. When would a composite B-tree index hurt query and write performance rather than help it?",
            "context_note": "Evaluating database internals, write amplification, and query planner optimization.",
            "hint": "B-Tree structure, column cardinality, write latency overhead, table scan vs index scan, index prefix rule."
        },
        {
            "category": "behavioral",
            "text": "Tell me about a time when you strongly disagreed with a teammate's architectural or code decision. How did you resolve the conflict constructively?",
            "context_note": "STAR format behavioral evaluation: Situation, Task, Action, Result.",
            "hint": "Focus on data-driven benchmarking, objective trade-off evaluation, prototyping, and team consensus."
        },
        {
            "category": "situational",
            "text": "Suppose a critical production service starts throwing 500 errors right after a deployment, but the automated rollback fails. What are your immediate troubleshooting steps?",
            "context_note": "Assessing incident response, logging, metrics, and post-mortem mindset.",
            "hint": "Check logs/APM, isolate traffic, feature flags, hotfix pipeline, communication with stakeholders."
        },
        {
            "category": "technical",
            "text": "Explain the trade-offs between monolithic architectures and microservices. What specific organizational or technical signals indicate it is time to decouple services?",
            "context_note": "Evaluates systemic architecture, team boundaries (Conway's Law), and distributed complexity.",
            "hint": "Deployment independence, blast radius reduction, operational overhead, network latency, distributed transactions."
        },
        {
            "category": "system_design",
            "text": "How would you design a distributed cache invalidation mechanism across multiple edge locations to prevent stale data while maintaining fast read speeds?",
            "context_note": "Assesses cache coherence, TTLs, write-through vs write-behind, and event-driven invalidation.",
            "hint": "Pub/sub event bus, webhook invalidations, stale-while-revalidate, versioned cache keys."
        }
    ]
}


class InterviewSessionManager:
    """Manages interview lifecycle, turn evaluation, adaptive difficulty, and persistence."""

    def __init__(self):
        self.gemini = GeminiClient()
        # In-memory session store fallback for isolated tests or disconnected DB
        self._in_memory_sessions: Dict[str, Dict[str, Any]] = {}
        self._in_memory_answers: Dict[str, List[Dict[str, Any]]] = {}

    def _select_fallback_question(
        self,
        role: str,
        category: str,
        asked_texts: List[str]
    ) -> Dict[str, Any]:
        """
        Dynamically select an unasked fallback question matching candidate role and category.
        Uses randomized selection to guarantee interview uniqueness across sessions.
        """
        track = _normalize_role(role)
        pool = ROLE_FALLBACK_QUESTIONS.get(track, []) + ROLE_FALLBACK_QUESTIONS.get("default", [])

        # Filter out questions already asked
        asked_lower = [q.lower().strip() for q in asked_texts if q]
        unasked = [
            q for q in pool
            if not any(
                q["text"].lower().strip() in a or a in q["text"].lower().strip()
                for a in asked_lower
            )
        ]

        # 1. Best match: unasked question matching the target category
        matching_cat = [q for q in unasked if q.get("category") == category]
        if matching_cat:
            return random.choice(matching_cat)

        # 2. Next: any unasked question in candidate's track
        track_unasked = [q for q in ROLE_FALLBACK_QUESTIONS.get(track, []) if q in unasked]
        if track_unasked:
            return random.choice(track_unasked)

        # 3. Next: any unasked question in the entire pool
        if unasked:
            return random.choice(unasked)

        # 4. If all exhausted, return a random question from pool
        return random.choice(pool)

    def _determine_category_for_index(self, index: int, total: int) -> str:
        """Adaptive category sequence tailored to interview progression."""
        if index == 1:
            return "project_deep_dive"
        elif index == 2:
            return "technical"
        elif index == 3:
            return "system_design"
        elif index == 4:
            return "technical"
        elif index == total - 1:
            return "behavioral"
        elif index == total:
            return "situational"
        else:
            return "technical"

    def _calculate_next_difficulty(
        self,
        current_difficulty: str,
        scores_history: List[float]
    ) -> str:
        """
        Adaptive difficulty adjustment:
        - Recent average >= 7.5: raise difficulty
        - Recent average <= 4.5: lower difficulty
        - Otherwise maintain
        """
        if not scores_history:
            return current_difficulty

        recent_window = scores_history[-2:] if len(scores_history) >= 2 else scores_history
        avg = sum(recent_window) / len(recent_window)

        levels = ["easy", "medium", "hard"]
        curr_idx = levels.index(current_difficulty) if current_difficulty in levels else 1

        if avg >= 7.5 and curr_idx < 2:
            return levels[curr_idx + 1]
        elif avg <= 4.5 and curr_idx > 0:
            return levels[curr_idx - 1]
        return current_difficulty

    async def _fetch_resume_text(self, resume_id: Optional[str], user_id: str) -> str:
        """Look up resume context from MongoDB resumes collection."""
        if not resume_id:
            return ""

        if db_manager.db is not None:
            try:
                # Query by resume_id or _id
                doc = await db_manager.db.resumes.find_one({"resume_id": resume_id})
                if not doc:
                    try:
                        doc = await db_manager.db.resumes.find_one({"_id": ObjectId(resume_id)})
                    except Exception:
                        pass
                if doc:
                    skills = ", ".join(doc.get("skills", []))
                    projects = "; ".join([p.get("title", "") for p in doc.get("projects", [])])
                    return f"Skills: {skills}\nProjects: {projects}\nRaw Excerpt: {doc.get('raw_text', '')[:500]}"
            except Exception as e:
                logger.warning(f"[SessionManager] Failed to fetch resume {resume_id}: {e}")

        return ""

    async def start_session(
        self,
        user_id: str,
        request: StartInterviewRequest
    ) -> StartInterviewResponse:
        """Initialize session, generate Question 1, and persist to MongoDB."""
        session_id = str(uuid.uuid4())

        # 1. Resolve resume & GitHub codebase context
        resume_context = request.resume_text or ""
        if not resume_context and request.resume_id:
            resume_context = await self._fetch_resume_text(request.resume_id, user_id)

        # Resolve candidate GitHub repositories
        github_user = request.github_username
        if not github_user and db_manager.db is not None:
            try:
                user_doc = await db_manager.db.users.find_one({"firebase_uid": user_id})
                if user_doc and user_doc.get("github_username"):
                    github_user = user_doc.get("github_username")
            except Exception:
                pass

        if github_user:
            try:
                from app.services.github_service import github_service
                repos = await github_service.fetch_candidate_repositories(github_user)
                if repos:
                    gh_summary = github_service.format_repositories_for_prompt(repos)
                    resume_context = f"{resume_context}\n\n{gh_summary}".strip()
                    logger.info(f"[SessionManager] Injected GitHub context ({len(repos)} repos) for @{github_user}")
            except Exception as gh_err:
                logger.warning(f"[SessionManager] Could not fetch GitHub repos for @{github_user}: {gh_err}")

        if not resume_context:
            resume_context = f"Candidate interviewing for {request.target_role}. Relevant modern tech stack and projects."

        # Query recent questions to guarantee diversity across sessions
        recent_questions: List[str] = []
        if db_manager.db is not None:
            try:
                cursor = db_manager.db.sessions.find(
                    {"user_id": user_id},
                    {"current_question.question_text": 1, "history.question.question_text": 1, "asked_questions": 1}
                ).sort("created_at", -1).limit(3)
                async for s in cursor:
                    if s.get("asked_questions"):
                        recent_questions.extend(s["asked_questions"])
                    if s.get("current_question", {}).get("question_text"):
                        recent_questions.append(s["current_question"]["question_text"])
                    for h in s.get("history", []):
                        if h.get("question", {}).get("question_text"):
                            recent_questions.append(h["question"]["question_text"])
            except Exception as ex:
                logger.warning(f"[SessionManager] Could not query past sessions for candidate: {ex}")

        avoid_topics_block = ""
        if recent_questions:
            unique_recent = list(dict.fromkeys(recent_questions))[:6]
            bullet_list = "\n".join(f"- {q}" for q in unique_recent)
            avoid_topics_block = f"\nPreviously Asked Questions (DO NOT REPEAT ANY OF THESE):\n{bullet_list}\n"

        # 2. Generate Question 1 via Gemini
        first_question: Optional[QuestionItem] = None
        try:
            start_template = load_prompt_template("interview_start.txt")
            prompt = start_template.format(
                target_role=request.target_role,
                resume_context=resume_context[:1500],
                job_description=(request.job_description or "General industry standards")[:1000],
                total_questions=request.total_questions,
                difficulty=request.initial_difficulty,
                avoid_topics_block=avoid_topics_block,
            )

            q1_obj, model_used, latency = await self.gemini.generate_structured_json(
                prompt=prompt,
                response_model=QuestionItem,
                system_instruction="You are an elite technical interviewer conducting a structured mock interview."
            )
            # Ensure index and ID are canonical
            q1_obj.question_id = str(uuid.uuid4())
            q1_obj.question_index = 1
            q1_obj.difficulty = request.initial_difficulty
            first_question = q1_obj
            logger.info(f"[SessionManager] Generated Q1 via {model_used} in {latency}ms")
        except Exception as e:
            logger.warning(f"[SessionManager] Gemini Q1 generation failed ({e}), using curated role fallback.")
            fb = self._select_fallback_question(request.target_role, "project_deep_dive", recent_questions)
            first_question = QuestionItem(
                question_id=str(uuid.uuid4()),
                question_index=1,
                question_text=fb["text"],
                question_category=fb["category"],
                difficulty=request.initial_difficulty,
                context_note=fb["context_note"],
                sample_answer_hint=fb["hint"]
            )

        # 3. Create Session Record
        session_doc = {
            "session_id": session_id,
            "user_id": user_id,
            "target_role": request.target_role,
            "job_description": request.job_description,
            "resume_id": request.resume_id,
            "github_username": github_user,
            "resume_context": resume_context[:2000],
            "total_questions": request.total_questions,
            "current_question_index": 1,
            "current_difficulty": request.initial_difficulty,
            "status": "in_progress",
            "current_question": first_question.model_dump(),
            "asked_questions": [first_question.question_text],
            "history": [],
            "scores_history": [],
            "difficulty_progression": [request.initial_difficulty],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }

        # 4. Save to MongoDB
        if db_manager.db is not None:
            try:
                await db_manager.db.sessions.insert_one(session_doc)
            except Exception as e:
                logger.error(f"[SessionManager] Failed to insert session into DB: {e}")

        # In-memory backup
        self._in_memory_sessions[session_id] = session_doc
        self._in_memory_answers[session_id] = []

        return StartInterviewResponse(
            session_id=session_id,
            target_role=request.target_role,
            total_questions=request.total_questions,
            current_question_index=1,
            current_difficulty=request.initial_difficulty,
            first_question=first_question,
            status="in_progress"
        )

    async def get_session(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve session record from MongoDB or in-memory backup strictly scoped to user_id."""
        if db_manager.db is not None:
            try:
                doc = await db_manager.db.sessions.find_one({"session_id": session_id, "user_id": user_id})
                if doc:
                    doc["_id"] = str(doc["_id"])
                    return doc
            except Exception as e:
                logger.warning(f"[SessionManager] DB error fetching session {session_id}: {e}")

        mem_session = self._in_memory_sessions.get(session_id)
        if mem_session and mem_session.get("user_id") == user_id:
            return mem_session
        return None

    async def process_answer(
        self,
        session_id: str,
        user_id: str,
        request: SubmitAnswerRequest
    ) -> SubmitAnswerResponse:
        """
        Evaluate candidate's answer and generate the next adaptive question in 1 turn.
        """
        session = await self.get_session(session_id, user_id)
        if not session:
            raise ValueError(f"Interview session '{session_id}' not found.")

        if session.get("status") == "completed":
            raise ValueError("This interview session has already been completed.")

        curr_index = session.get("current_question_index", 1)
        total_questions = session.get("total_questions", 6)
        curr_difficulty = session.get("current_difficulty", "medium")
        curr_question_data = session.get("current_question", {})
        scores_history: List[float] = session.get("scores_history", [])

        # Calculate next difficulty adaptively
        next_difficulty = self._calculate_next_difficulty(curr_difficulty, scores_history)
        next_index = curr_index + 1
        is_last_question = curr_index >= total_questions
        next_cat_suggestion = self._determine_category_for_index(next_index, total_questions)

        # Build turn prompt
        turn_template = load_prompt_template("interview_turn.txt")
        history_summary = "\n".join([
            f"Q{item.get('question_index')}: {item.get('question', {}).get('question_text', '')} | Score: {item.get('evaluation', {}).get('average_score', 0)}"
            for item in session.get("history", [])
        ]) or "No previous turns yet."

        prompt = turn_template.format(
            target_role=session.get("target_role", "Software Engineer"),
            job_description=session.get("job_description") or "Standard Industry Requirements",
            resume_context=session.get("resume_context", "")[:1000],
            current_index=curr_index,
            total_questions=total_questions,
            current_question_text=curr_question_data.get("question_text", ""),
            current_category=curr_question_data.get("question_category", "technical"),
            current_difficulty=curr_difficulty,
            candidate_answer=request.answer_text,
            history_summary=history_summary,
            next_index=next_index,
            target_difficulty=next_difficulty,
            next_category_suggestion=next_cat_suggestion
        )

        evaluation: Optional[AnswerEvaluation] = None
        next_question: Optional[QuestionItem] = None

        try:
            combined_resp, model_used, latency = await self.gemini.generate_structured_json(
                prompt=prompt,
                response_model=CombinedTurnResponse,
                system_instruction="You are an expert technical interviewer evaluating an answer and picking the next adaptive question."
            )
            evaluation = combined_resp.evaluation
            if not is_last_question and combined_resp.next_question:
                next_q = combined_resp.next_question
                next_q.question_id = str(uuid.uuid4())
                next_q.question_index = next_index
                next_q.difficulty = next_difficulty
                next_question = next_q
            logger.info(f"[SessionManager] Evaluated turn {curr_index} via {model_used} in {latency}ms (avg score: {evaluation.average_score})")
        except Exception as e:
            logger.warning(f"[SessionManager] Turn AI generation failed ({e}), using rule-based evaluation.")
            # Fallback evaluation based on length and structure
            words = len(request.answer_text.strip().split())
            score_base = min(9, max(4, 4 + (words // 25)))
            scores = AnswerScores(
                relevance=score_base,
                technical_accuracy=score_base,
                clarity=min(10, score_base + 1),
                depth=max(1, score_base - 1),
                confidence=score_base
            )
            evaluation = AnswerEvaluation(
                scores=scores,
                average_score=float(score_base),
                feedback="Response demonstrated foundational familiarity with the topic, addressing key aspects directly.",
                strengths=["Clear articulation of core concepts", "Direct addressing of the primary scenario"],
                areas_for_improvement=["Elaborate deeper on real-world edge cases", "Include quantified metrics or benchmarking"],
                ideal_answer_summary="A top answer articulates architectural tradeoffs, concrete benchmarks, and disaster recovery edge cases."
            )

            if not is_last_question:
                all_asked = session.get("asked_questions", []) + [curr_question_data.get("question_text", "")]
                fb = self._select_fallback_question(
                    session.get("target_role", "Software Engineer"),
                    next_cat_suggestion,
                    all_asked
                )
                next_question = QuestionItem(
                    question_id=str(uuid.uuid4()),
                    question_index=next_index,
                    question_text=fb["text"],
                    question_category=fb["category"],
                    difficulty=next_difficulty,
                    context_note=fb["context_note"],
                    sample_answer_hint=fb["hint"]
                )

        # 4. Save Turn to Answers collection with delivery telemetry
        delivery_telemetry = None
        if request.eye_contact_score is not None or request.posture_status is not None:
            delivery_telemetry = {
                "eye_contact_score": request.eye_contact_score,
                "posture_status": request.posture_status or "stable",
                "head_pose_yaw_variance": request.head_pose_yaw_variance or 0.0,
                "wpm": request.wpm or 135,
                "filler_count": request.filler_count or 0,
            }

        answer_record = {
            "session_id": session_id,
            "question_index": curr_index,
            "question": curr_question_data,
            "answer_text": request.answer_text,
            "duration_seconds": request.duration_seconds or 0,
            "evaluation": evaluation.model_dump(),
            "delivery_telemetry": delivery_telemetry,
            "created_at": datetime.now(timezone.utc)
        }

        if db_manager.db is not None:
            try:
                await db_manager.db.answers.insert_one(answer_record)
            except Exception as e:
                logger.error(f"[SessionManager] Failed to save answer: {e}")

        # Update in-memory answer record
        self._in_memory_answers.setdefault(session_id, []).append(answer_record)

        # 5. Update Session Document
        scores_history.append(evaluation.average_score)
        running_avg = round(sum(scores_history) / len(scores_history), 2)

        turn_history_item = {
            "question_index": curr_index,
            "question": curr_question_data,
            "answer_text": request.answer_text,
            "duration_seconds": request.duration_seconds or 0,
            "evaluation": evaluation.model_dump(),
            "delivery_telemetry": delivery_telemetry,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        update_fields: Dict[str, Any] = {
            "updated_at": datetime.now(timezone.utc),
            "current_difficulty": next_difficulty if not is_last_question else curr_difficulty,
            "scores_history": scores_history,
        }

        if is_last_question:
            update_fields["status"] = "completed"
            update_fields["completed_at"] = datetime.now(timezone.utc)
            update_fields["overall_score"] = running_avg
        else:
            update_fields["current_question_index"] = next_index
            update_fields["current_question"] = next_question.model_dump() if next_question else None
            session.setdefault("difficulty_progression", []).append(next_difficulty)
            update_fields["difficulty_progression"] = session["difficulty_progression"]

        push_dict: Dict[str, Any] = {"history": turn_history_item}
        if next_question:
            push_dict["asked_questions"] = next_question.question_text

        if db_manager.db is not None:
            try:
                await db_manager.db.sessions.update_one(
                    {"session_id": session_id},
                    {
                        "$set": update_fields,
                        "$push": push_dict
                    }
                )
            except Exception as e:
                logger.error(f"[SessionManager] DB update error: {e}")

        # Sync in-memory backup
        if session_id in self._in_memory_sessions:
            mem_session = self._in_memory_sessions[session_id]
            mem_session.update(update_fields)
            mem_session.setdefault("history", []).append(turn_history_item)
            if next_question:
                mem_session.setdefault("asked_questions", []).append(next_question.question_text)

        # Eagerly auto-generate and persist the report if interview completed
        if is_last_question:
            try:
                from app.services.report_engine import report_engine
                await report_engine.generate_report_for_session(session_id=session_id, user_id=user_id)
                logger.info(f"[SessionManager] Automatically generated report for completed session {session_id}")
            except Exception as rep_err:
                logger.warning(f"[SessionManager] Auto report generation notice: {rep_err}")

        return SubmitAnswerResponse(
            session_id=session_id,
            question_index=curr_index,
            evaluation=evaluation,
            next_question=next_question,
            is_complete=is_last_question,
            current_difficulty=next_difficulty if not is_last_question else curr_difficulty,
            average_score_so_far=running_avg
        )

    async def end_session(self, session_id: str, user_id: str) -> SessionSummary:
        """Explicitly end the session and compute overall metrics."""
        session = await self.get_session(session_id, user_id)
        if not session:
            raise ValueError(f"Session '{session_id}' not found.")

        scores_history = session.get("scores_history", [])
        overall_avg = round(sum(scores_history) / max(1, len(scores_history)), 2)

        # Aggregate category scores
        category_totals: Dict[str, List[float]] = {}
        for h in session.get("history", []):
            cat = h.get("question", {}).get("question_category", "general")
            score = h.get("evaluation", {}).get("average_score", 0.0)
            category_totals.setdefault(cat, []).append(score)

        cat_averages = {
            cat: round(sum(scores) / len(scores), 2)
            for cat, scores in category_totals.items()
        }

        now = datetime.now(timezone.utc)
        update_data = {
            "status": "completed",
            "completed_at": now,
            "overall_score": overall_avg,
            "category_scores": cat_averages
        }

        if db_manager.db is not None:
            try:
                await db_manager.db.sessions.update_one(
                    {"session_id": session_id},
                    {"$set": update_data}
                )
            except Exception as e:
                logger.error(f"[SessionManager] DB update error on end_session: {e}")

        if session_id in self._in_memory_sessions:
            self._in_memory_sessions[session_id].update(update_data)

        # Eagerly auto-generate and persist the report on session completion
        try:
            from app.services.report_engine import report_engine
            await report_engine.generate_report_for_session(session_id=session_id, user_id=user_id)
            logger.info(f"[SessionManager] Automatically generated report for ended session {session_id}")
        except Exception as rep_err:
            logger.warning(f"[SessionManager] Auto report generation notice on end_session: {rep_err}")

        started_at = session.get("created_at")
        if isinstance(started_at, str):
            try:
                started_at = datetime.fromisoformat(started_at)
            except Exception:
                started_at = now
        elif not isinstance(started_at, datetime):
            started_at = now

        return SessionSummary(
            session_id=session_id,
            user_id=user_id,
            target_role=session.get("target_role", "Software Engineer"),
            total_questions=session.get("total_questions", 6),
            completed_turns=len(session.get("history", [])),
            overall_average_score=overall_avg,
            difficulty_progression=session.get("difficulty_progression", ["medium"]),
            category_scores=cat_averages,
            status="completed",
            started_at=started_at,
            completed_at=now
        )


session_manager = InterviewSessionManager()
