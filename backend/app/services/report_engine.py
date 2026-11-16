import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from bson import ObjectId

from app.models.report import (
    DimensionScore,
    QuestionBreakdownItem,
    RoadmapMilestone,
    PersonalizedRoadmap,
    InterviewReport,
    MultimodalDeliveryMetrics,
    DashboardMetrics,
)
from app.models.session import AnswerScores
from app.services.session_manager import session_manager
from app.database import db_manager

logger = logging.getLogger("prepr.report_engine")


class ReportEngine:
    """Generates 5-dimension analytics reports, personalized career roadmaps, and dashboard metrics."""

    def __init__(self):
        self._in_memory_reports: Dict[str, Dict[str, Any]] = {}

    def _determine_verdict(self, overall_score: float) -> str:
        if overall_score >= 8.0:
            return "Strong Hire"
        elif overall_score >= 6.5:
            return "Hire"
        elif overall_score >= 5.0:
            return "Leaning Hire"
        return "Needs Revision"

    def _generate_curated_roadmap(
        self,
        user_id: str,
        target_role: str,
        weak_areas: List[str],
        lowest_dimensions: List[str]
    ) -> PersonalizedRoadmap:
        """Construct a lightweight, actionable 3-step progression plan targeting detected gaps."""
        roadmap_id = str(uuid.uuid4())

        focus_skill = weak_areas[0] if weak_areas else (lowest_dimensions[0] if lowest_dimensions else "Core Architecture")
        secondary_skill = weak_areas[1] if len(weak_areas) > 1 else (lowest_dimensions[1] if len(lowest_dimensions) > 1 else "System Design Depth")

        milestones = [
            RoadmapMilestone(
                milestone_id=str(uuid.uuid4()),
                step_number=1,
                title="Phase 1: Quick Core Review",
                target_skill=focus_skill,
                difficulty="Beginner",
                estimated_days=3,
                actionable_tasks=[
                    f"Review key fundamentals and common interview pitfalls for {focus_skill}.",
                    "Solve 3 practice coding problems focusing on clean code and time complexity."
                ],
                recommended_resources=[
                    "Official Language & Framework Documentation"
                ],
                capstone_mini_project=f"Build a clean mini-module demonstrating {focus_skill} with proper error handling."
            ),
            RoadmapMilestone(
                milestone_id=str(uuid.uuid4()),
                step_number=2,
                title="Phase 2: Real-World Scenarios",
                target_skill=secondary_skill,
                difficulty="Intermediate",
                estimated_days=4,
                actionable_tasks=[
                    f"Study architectural tradeoffs and real-world edge cases in {secondary_skill}.",
                    "Practice articulating system decisions (e.g. caching, latency, database indexes)."
                ],
                recommended_resources=[
                    "System Design Primer (GitHub) or Architecture Patterns"
                ],
                capstone_mini_project="Implement a small proof-of-concept incorporating caching or database indexing."
            ),
            RoadmapMilestone(
                milestone_id=str(uuid.uuid4()),
                step_number=3,
                title="Phase 3: Mock Interview Polish",
                target_skill="Structured Communication & Poise",
                difficulty="Advanced",
                estimated_days=2,
                actionable_tasks=[
                    "Structure past project stories using STAR format (Situation, Task, Action, Result).",
                    "Retake a mock interview session on Prepr to verify score improvement."
                ],
                recommended_resources=[
                    "Prepr Real-Time Practice & Feedback Rubric"
                ],
                capstone_mini_project="Complete an interview on Prepr and achieve a target calibrated score >= 8.0/10."
            )
        ]

        clean_weak_areas = weak_areas[:2] if weak_areas else [focus_skill, secondary_skill]

        return PersonalizedRoadmap(
            roadmap_id=roadmap_id,
            user_id=user_id,
            target_role=target_role,
            identified_weak_areas=clean_weak_areas,
            milestones=milestones,
            estimated_total_weeks=2,
            created_at=datetime.now(timezone.utc)
        )

    async def generate_report_for_session(
        self,
        session_id: str,
        user_id: str
    ) -> InterviewReport:
        """Aggregate turn evaluations into a comprehensive 5-dimension report and roadmap."""
        session = await session_manager.get_session(session_id, user_id)
        if not session:
            raise ValueError(f"Interview session '{session_id}' not found.")

        history = session.get("history", [])
        if not history:
            # Fallback mock history if session has no recorded turns yet
            history = [
                {
                    "question_index": 1,
                    "question": {
                        "question_text": "Walk me through your major full-stack project architecture.",
                        "question_category": "project_deep_dive",
                        "difficulty": "medium",
                    },
                    "answer_text": "I built Prepr using FastAPI and React with MongoDB Atlas.",
                    "evaluation": {
                        "scores": {
                            "relevance": 8,
                            "technical_accuracy": 8,
                            "clarity": 8,
                            "depth": 7,
                            "confidence": 8,
                        },
                        "average_score": 7.8,
                        "feedback": "Strong foundational explanation with clear technology choices.",
                        "strengths": ["Clean articulation of tech stack", "Good ownership"],
                        "areas_for_improvement": ["Add quantified metrics", "Mention caching strategies"],
                        "ideal_answer_summary": "Highlight async non-blocking throughput and failover mechanisms."
                    }
                }
            ]

        # 1. Aggregate Dimension Scores
        relevance_scores = []
        tech_accuracy_scores = []
        clarity_scores = []
        depth_scores = []
        confidence_scores = []

        all_strengths: List[str] = []
        all_improvements: List[str] = []
        questions_breakdown: List[QuestionBreakdownItem] = []
        category_scores_map: Dict[str, List[float]] = {}

        for item in history:
            q_data = item.get("question", {})
            eval_data = item.get("evaluation", {})
            scores = eval_data.get("scores", {})

            rel = scores.get("relevance", 7)
            acc = scores.get("technical_accuracy", 7)
            cla = scores.get("clarity", 7)
            dep = scores.get("depth", 6)
            cnf = scores.get("confidence", 7)

            relevance_scores.append(rel)
            tech_accuracy_scores.append(acc)
            clarity_scores.append(cla)
            depth_scores.append(dep)
            confidence_scores.append(cnf)

            cat = q_data.get("question_category", "technical")
            turn_avg = eval_data.get("average_score", (rel + acc + cla + dep + cnf) / 5)
            category_scores_map.setdefault(cat, []).append(turn_avg)

            # Collect strengths & improvements
            all_strengths.extend(eval_data.get("strengths", []))
            all_improvements.extend(eval_data.get("areas_for_improvement", []))

            questions_breakdown.append(
                QuestionBreakdownItem(
                    question_index=item.get("question_index", len(questions_breakdown) + 1),
                    question_text=q_data.get("question_text", "Technical Question"),
                    question_category=cat,
                    difficulty=q_data.get("difficulty", "medium"),
                    candidate_answer=item.get("answer_text", ""),
                    scores=AnswerScores(
                        relevance=rel,
                        technical_accuracy=acc,
                        clarity=cla,
                        depth=dep,
                        confidence=cnf
                    ),
                    average_score=round(turn_avg, 1),
                    feedback=eval_data.get("feedback", "Good performance."),
                    strengths=eval_data.get("strengths", ["Clear explanation"]),
                    areas_for_improvement=eval_data.get("areas_for_improvement", ["Deepen edge case analysis"]),
                    ideal_answer_summary=eval_data.get("ideal_answer_summary", "Articulate edge cases and trade-offs.")
                )
            )

        def calc_avg(scores: List[float]) -> float:
            return round(sum(scores) / max(1, len(scores)), 1)

        dim_relevance = calc_avg(relevance_scores)
        dim_accuracy = calc_avg(tech_accuracy_scores)
        dim_clarity = calc_avg(clarity_scores)
        dim_depth = calc_avg(depth_scores)
        dim_confidence = calc_avg(confidence_scores)

        overall_score = round(
            (dim_relevance + dim_accuracy + dim_clarity + dim_depth + dim_confidence) / 5,
            1
        )
        verdict = self._determine_verdict(overall_score)

        dimension_scores = [
            DimensionScore(
                dimension="Relevance",
                score=dim_relevance,
                benchmark=7.5,
                percentage=int(dim_relevance * 10)
            ),
            DimensionScore(
                dimension="Technical Accuracy",
                score=dim_accuracy,
                benchmark=8.0,
                percentage=int(dim_accuracy * 10)
            ),
            DimensionScore(
                dimension="Clarity & Structure",
                score=dim_clarity,
                benchmark=7.5,
                percentage=int(dim_clarity * 10)
            ),
            DimensionScore(
                dimension="Technical Depth",
                score=dim_depth,
                benchmark=7.0,
                percentage=int(dim_depth * 10)
            ),
            DimensionScore(
                dimension="Confidence & Tone",
                score=dim_confidence,
                benchmark=7.5,
                percentage=int(dim_confidence * 10)
            ),
        ]

        # Category Averages
        category_scores = {
            cat: round(sum(vals) / len(vals), 1)
            for cat, vals in category_scores_map.items()
        }

        # Deduplicate top strengths & improvements
        top_strengths = list(dict.fromkeys(all_strengths))[:4]
        priority_improvements = list(dict.fromkeys(all_improvements))[:4]

        # Sort dimensions to accurately identify best and growth opportunity
        sorted_dims = sorted(dimension_scores, key=lambda d: d.score, reverse=True)
        best_dim = sorted_dims[0] if sorted_dims else None
        worst_dim = sorted_dims[-1] if sorted_dims else None

        best_dim_str = f"{best_dim.dimension} ({best_dim.score}/10)" if best_dim else "Technical Foundations"
        worst_dim_str = f"{worst_dim.dimension} ({worst_dim.score}/10)" if worst_dim else "System Design Depth"

        # Executive summary
        target_role = session.get("target_role", "Software Engineer")
        executive_summary = (
            f"Candidate completed {len(questions_breakdown)} turns for the position of {target_role}, "
            f"achieving an overall calibrated score of {overall_score}/10 ({verdict}). "
            f"Strongest performance was demonstrated in {best_dim_str}. "
            f"Primary growth opportunity lies in {worst_dim_str} "
            f"with specific focus on real-world edge cases and quantified tradeoffs."
        )

        # Generate Personalized Roadmap
        lowest_dims = sorted_dims[::-1][:2]
        roadmap = self._generate_curated_roadmap(
            user_id=user_id,
            target_role=target_role,
            weak_areas=priority_improvements,
            lowest_dimensions=[d.dimension for d in lowest_dims]
        )

        # Calculate Multimodal Delivery Metrics (Edge Vision + Speech Prosody)
        eye_contact_samples = []
        posture_counts = {"attentive": 0, "stable": 0, "fidgeting": 0}
        wpm_samples = []
        filler_total = 0

        for ans in history:
            telem = ans.get("delivery_telemetry")
            if telem:
                if telem.get("eye_contact_score") is not None:
                    eye_contact_samples.append(float(telem["eye_contact_score"]))
                posture = telem.get("posture_status", "stable")
                posture_counts[posture] = posture_counts.get(posture, 0) + 1
                if telem.get("wpm"):
                    wpm_samples.append(int(telem["wpm"]))
                filler_total += int(telem.get("filler_count", 0))

        # Defaults if turns were text-only or vision wasn't toggled
        avg_eye_contact = round(sum(eye_contact_samples) / len(eye_contact_samples), 1) if eye_contact_samples else 86.5
        total_posture = max(1, sum(posture_counts.values()))
        posture_breakdown = {
            k: round((v / total_posture) * 100, 1)
            for k, v in posture_counts.items()
        }
        avg_wpm = int(sum(wpm_samples) / len(wpm_samples)) if wpm_samples else 138
        head_stability = round(max(70.0, min(98.0, 92.0 - (posture_counts.get("fidgeting", 0) * 8.5))), 1)

        # Composite Multimodal Delivery Index (MDI) out of 10
        pace_score = 9.0 if 120 <= avg_wpm <= 165 else 7.5
        mdi = round(0.40 * (avg_eye_contact / 10.0) + 0.30 * (head_stability / 10.0) + 0.30 * pace_score, 1)
        delivery_verdict = (
            "Exceptional Focus & Professional Poise" if mdi >= 8.5
            else "Attentive & Composed Demeanor" if mdi >= 7.0
            else "Noticeable Fidgeting & Averted Gaze"
        )

        multimodal_delivery = MultimodalDeliveryMetrics(
            average_eye_contact=avg_eye_contact,
            posture_breakdown=posture_breakdown,
            head_pose_stability=head_stability,
            speech_wpm_average=avg_wpm,
            filler_words_total=filler_total,
            multimodal_delivery_index=mdi,
            delivery_verdict=delivery_verdict,
        )

        report_id = str(uuid.uuid4())
        report = InterviewReport(
            report_id=report_id,
            session_id=session_id,
            user_id=user_id,
            target_role=target_role,
            overall_score=overall_score,
            verdict=verdict,
            executive_summary=executive_summary,
            dimension_scores=dimension_scores,
            category_scores=category_scores,
            top_strengths=top_strengths,
            priority_improvements=priority_improvements,
            questions_breakdown=questions_breakdown,
            roadmap=roadmap,
            multimodal_delivery=multimodal_delivery,
            created_at=datetime.now(timezone.utc)
        )

        # Save to MongoDB Atlas
        if db_manager.db is not None:
            try:
                report_dict = report.model_dump()
                await db_manager.db.reports.replace_one(
                    {"session_id": session_id},
                    report_dict,
                    upsert=True
                )
                logger.info(f"[ReportEngine] Saved report {report_id} to MongoDB Atlas.")
            except Exception as e:
                logger.error(f"[ReportEngine] Failed to save report to Atlas: {e}")

        # In-memory backup
        self._in_memory_reports[session_id] = report.model_dump()
        return report

    async def get_report_by_session(
        self,
        session_id: str,
        user_id: str
    ) -> Optional[InterviewReport]:
        """Fetch report by session_id from MongoDB or in-memory backup."""
        if db_manager.db is not None:
            try:
                doc = await db_manager.db.reports.find_one({"session_id": session_id})
                if doc:
                    doc.pop("_id", None)
                    return InterviewReport(**doc)
            except Exception as e:
                logger.warning(f"[ReportEngine] DB error retrieving report {session_id}: {e}")

        cached = self._in_memory_reports.get(session_id)
        if cached:
            return InterviewReport(**cached)
        return None

    async def get_latest_report(self, user_id: str) -> Optional[InterviewReport]:
        """Retrieve most recent interview report for candidate, auto-generating from latest session if needed."""
        if db_manager.db is not None:
            try:
                doc = await db_manager.db.reports.find_one(
                    {"user_id": user_id},
                    sort=[("created_at", -1)]
                )
                if doc:
                    doc.pop("_id", None)
                    return InterviewReport(**doc)

                # Fallback: Check if user has an existing completed or active session in db.sessions
                latest_session = await db_manager.db.sessions.find_one(
                    {"user_id": user_id},
                    sort=[("created_at", -1)]
                )
                if latest_session and len(latest_session.get("history", [])) > 0:
                    logger.info(f"[ReportEngine] Auto-generating report for latest session {latest_session['session_id']}")
                    return await self.generate_report_for_session(
                        session_id=latest_session["session_id"],
                        user_id=user_id
                    )
            except Exception as e:
                logger.warning(f"[ReportEngine] DB error retrieving latest report: {e}")

        # Fallback to any in-memory report matching user_id
        for rep in reversed(list(self._in_memory_reports.values())):
            if rep.get("user_id") == user_id:
                return InterviewReport(**rep)

        # Check in-memory sessions for auto-generation
        for sess in reversed(list(session_manager._in_memory_sessions.values())):
            if sess.get("user_id") == user_id and len(sess.get("history", [])) > 0:
                try:
                    return await self.generate_report_for_session(sess["session_id"], user_id)
                except Exception:
                    pass
        return None

    async def get_all_reports(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieve list of all reports for candidate to allow easy browsing and selection."""
        reports_list: List[Dict[str, Any]] = []
        if db_manager.db is not None:
            try:
                cursor = db_manager.db.reports.find(
                    {"user_id": user_id},
                    {"report_id": 1, "session_id": 1, "target_role": 1, "overall_score": 1, "verdict": 1, "created_at": 1}
                ).sort("created_at", -1)
                async for r in cursor:
                    c_at = r.get("created_at")
                    reports_list.append({
                        "report_id": r.get("report_id", str(r.get("_id"))),
                        "session_id": r.get("session_id"),
                        "target_role": r.get("target_role", "Software Engineer"),
                        "overall_score": r.get("overall_score", 0.0),
                        "verdict": r.get("verdict", "Completed"),
                        "created_at": c_at.isoformat() if isinstance(c_at, datetime) else str(c_at or "")
                    })
            except Exception as e:
                logger.warning(f"[ReportEngine] DB error listing user reports: {e}")

        if not reports_list:
            for rep in reversed(list(self._in_memory_reports.values())):
                if rep.get("user_id") == user_id:
                    reports_list.append({
                        "report_id": rep.get("report_id", ""),
                        "session_id": rep.get("session_id", ""),
                        "target_role": rep.get("target_role", "Software Engineer"),
                        "overall_score": rep.get("overall_score", 0.0),
                        "verdict": rep.get("verdict", "Completed"),
                        "created_at": str(rep.get("created_at", ""))
                    })
        return reports_list

    async def delete_report_and_session(self, session_id: str, user_id: str) -> bool:
        """Delete a report, session, and its turn answers securely scoped to user_id."""
        if db_manager.db is not None:
            try:
                # 1. Delete from reports
                await db_manager.db.reports.delete_one({"session_id": session_id, "user_id": user_id})
                # 2. Delete from sessions
                await db_manager.db.sessions.delete_one({"session_id": session_id, "user_id": user_id})
                # 3. Delete from answers
                await db_manager.db.answers.delete_many({"session_id": session_id})
                logger.info(f"[ReportEngine] Deleted report & session {session_id} for user {user_id}")
            except Exception as e:
                logger.error(f"[ReportEngine] Error deleting session {session_id}: {e}")
                raise e

        # In-memory cleanup
        self._in_memory_reports.pop(session_id, None)
        session_manager._in_memory_sessions.pop(session_id, None)
        session_manager._in_memory_answers.pop(session_id, None)
        return True

    async def clear_all_history(self, user_id: str) -> Dict[str, int]:
        """Clear all candidate interview sessions, reports, and answer history."""
        counts = {"reports": 0, "sessions": 0, "answers": 0}
        if db_manager.db is not None:
            try:
                # Find all session_ids for this user to clean up answers collection
                session_ids = []
                cursor = db_manager.db.sessions.find({"user_id": user_id}, {"session_id": 1})
                async for s in cursor:
                    session_ids.append(s["session_id"])

                r_del = await db_manager.db.reports.delete_many({"user_id": user_id})
                s_del = await db_manager.db.sessions.delete_many({"user_id": user_id})
                a_del = await db_manager.db.answers.delete_many({"session_id": {"$in": session_ids}})

                counts["reports"] = r_del.deleted_count
                counts["sessions"] = s_del.deleted_count
                counts["answers"] = a_del.deleted_count
                logger.info(f"[ReportEngine] Cleared all history for user {user_id}: {counts}")
            except Exception as e:
                logger.error(f"[ReportEngine] Error clearing history for user {user_id}: {e}")
                raise e

        # Clear in-memory
        keys_to_pop = [k for k, v in self._in_memory_reports.items() if v.get("user_id") == user_id]
        for k in keys_to_pop:
            self._in_memory_reports.pop(k, None)

        s_keys = [k for k, v in session_manager._in_memory_sessions.items() if v.get("user_id") == user_id]
        for k in s_keys:
            session_manager._in_memory_sessions.pop(k, None)
            session_manager._in_memory_answers.pop(k, None)

        return counts

    async def get_latest_roadmap(self, user_id: str) -> Optional[PersonalizedRoadmap]:
        """Retrieve latest career roadmap."""
        latest_report = await self.get_latest_report(user_id)
        if latest_report and latest_report.roadmap:
            return latest_report.roadmap

        # Return default roadmap if none generated yet
        return self._generate_curated_roadmap(
            user_id=user_id,
            target_role="Full Stack Developer",
            weak_areas=["System Architecture", "Performance Benchmarking"],
            lowest_dimensions=["Technical Depth", "Concurrency"]
        )

    async def get_dashboard_metrics(self, user_id: str) -> DashboardMetrics:
        """Compile candidate performance statistics, history, and readiness."""
        completed_sessions: List[Dict[str, Any]] = []
        score_trend: List[Dict[str, Any]] = []
        latest_ats: Optional[int] = None

        if db_manager.db is not None:
            try:
                cursor = db_manager.db.sessions.find(
                    {"user_id": user_id, "status": "completed"}
                ).sort("created_at", 1)
                async for s in cursor:
                    completed_sessions.append(s)

                # Look up latest resume ATS score
                res_doc = await db_manager.db.resumes.find_one(
                    {"user_id": user_id},
                    sort=[("created_at", -1)]
                )
                if res_doc:
                    latest_ats = res_doc.get("ats_analysis", {}).get("overall_score")
            except Exception as e:
                logger.warning(f"[ReportEngine] DB error compiling dashboard: {e}")

        if not completed_sessions:
            for s in session_manager._in_memory_sessions.values():
                if s.get("user_id") == user_id and s.get("status") == "completed":
                    completed_sessions.append(s)

        total_completed = len(completed_sessions)
        scores = [s.get("overall_score", 0.0) for s in completed_sessions if s.get("overall_score")]

        avg_score = round(sum(scores) / max(1, len(scores)), 1) if scores else 0.0
        highest_score = max(scores) if scores else 0.0

        for i, s in enumerate(completed_sessions[-7:]):
            score_trend.append({
                "session_index": i + 1,
                "role": s.get("target_role", "Mock Interview"),
                "score": s.get("overall_score", 0.0),
                "date": s.get("created_at", datetime.now(timezone.utc)).strftime("%b %d") if isinstance(s.get("created_at"), datetime) else "Recent"
            })

        recent_sessions_summary = [
            {
                "session_id": s.get("session_id"),
                "target_role": s.get("target_role", "Software Engineer"),
                "overall_score": s.get("overall_score", 0.0),
                "total_questions": s.get("total_questions", 5),
                "created_at": s.get("created_at").isoformat() if isinstance(s.get("created_at"), datetime) else str(s.get("created_at"))
            }
            for s in reversed(completed_sessions[-5:])
        ]

        readiness = "Ready for Senior L5 Interviews" if avg_score >= 8.0 else "Solid Mid-Level Candidate" if avg_score >= 6.5 else "Foundational Level (Roadmap Recommended)"

        dimension_averages = [
            DimensionScore(dimension="Relevance", score=avg_score or 7.8, benchmark=7.5, percentage=int((avg_score or 7.8) * 10)),
            DimensionScore(dimension="Technical Accuracy", score=avg_score or 7.5, benchmark=8.0, percentage=int((avg_score or 7.5) * 10)),
            DimensionScore(dimension="Clarity & Structure", score=avg_score or 8.0, benchmark=7.5, percentage=int((avg_score or 8.0) * 10)),
            DimensionScore(dimension="Technical Depth", score=avg_score or 7.2, benchmark=7.0, percentage=int((avg_score or 7.2) * 10)),
            DimensionScore(dimension="Confidence & Tone", score=avg_score or 7.6, benchmark=7.5, percentage=int((avg_score or 7.6) * 10)),
        ]

        return DashboardMetrics(
            user_id=user_id,
            total_interviews_completed=total_completed,
            average_interview_score=avg_score,
            highest_interview_score=highest_score,
            readiness_level=readiness,
            latest_ats_score=latest_ats,
            recent_sessions=recent_sessions_summary,
            score_trend=score_trend,
            dimension_averages=dimension_averages
        )


report_engine = ReportEngine()

