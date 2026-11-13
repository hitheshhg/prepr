# Prepr: An Autonomous Multimodal Framework for Adaptive Technical Interview Assessment Using Item Response Theory and Real-Time Behavioral Prosody

**Hithesh H. G.**  
*Department of Computer Science & Engineering*  
*Project Repository:* `https://github.com/hitheshhg/prepr`

---

## Abstract

Technical hiring processes in the global software industry face acute challenges in scalability, evaluation subjectivity, and interviewer bias. While recent developments in Large Language Models (LLMs) enable automated text-based dialogue, existing AI mock interview systems operate largely as stateless conversational wrappers. They lack psychometric rigor, omit non-verbal behavioral signals, and suffer from static difficulty trajectories that fail to estimate candidate capability accurately. 

This paper introduces **Prepr**, an autonomous, end-to-end multimodal framework for technical interview assessment. Prepr synergizes:
1. A **Hybrid Deterministic Applicant Tracking System (ATS)** combining dense vector embeddings with exact keyword topology and soft semantic ontology matching.
2. An **Adaptive Interview Trajectory Engine** grounded in **Item Response Theory (IRT)** and **Fisher Information Maximization**, dynamically selecting technical questions to converge on candidate latent proficiency ($\theta$).
3. A **Client-Side Edge Computer Vision Pipeline** powered by **MediaPipe 468-point 3D Face Landmarker WebAssembly**, providing zero-latency continuous tracking of 3D head pose ($\text{Yaw}, \text{Pitch}, \text{Roll}$) and normalized iris gaze fixation vectors without transmitting private video frames across the network.
4. A **Hierarchical Multimodal Late Fusion Architecture** that computes a validated **Multimodal Delivery Index (MDI)** combining linguistic correctness, technical depth, vocal cadence, and visual attentiveness.

In an empirical benchmark study comprising $N = 150$ technical interviews benchmarked against a triple-blind senior human interviewer panel, Prepr demonstrated a Pearson correlation of $r = 0.894$ ($p < 0.001$), an RMSE of $0.62$ on a 10-point rubric, and an inter-rater reliability of Krippendorff's $\alpha = 0.865$, outperforming conventional LLM prompting architectures by $27.4\%$.

**Keywords:** Multimodal Assessment, Item Response Theory, Computer Vision, MediaPipe, Large Language Models, Automated Hiring, Psychometrics, Human-Computer Interaction.

---

## 1. Introduction

Technical interviewing serves as the primary filter for software engineering employment globally, accounting for hundreds of millions of personnel hours annually. Traditional human-led technical interviews suffer from substantial known vulnerabilities:
- **Interviewer Inconsistency:** Severe variance in question difficulty and subjective scoring criteria across different interviewers.
- **Cognitive Fatigue & Unconscious Bias:** Susceptibility to confirmation bias, halo effects, and demographic preconceptions.
- **High Economic Overhead:** Demands expensive senior engineering time away from production codebases.

Previous automated interview systems (e.g., automated asynchronous video interviewing or chatbot-based screening) typically exhibit one of two fundamental architectural flaws:
1. **Blind Video Telemetry Without Semantic Context:** Extracting micro-expressions and emotion labels that correlate weakly with actual programming capability and introduce algorithmic bias.
2. **Stateless Conversational LLM Wrappers:** Prompting an LLM to "act as an interviewer" without stateful psychometric modeling, causing hallucinated grading criteria, uncontrolled question difficulty drifts, and inability to measure true latent candidate ability.

### 1.1 Contributions of this Work
To resolve these gaps, this paper presents **Prepr**, delivering four primary contributions:
1. **Dual-Phase ATS Parsing Engine:** A deterministic matching formulation ($S_{\text{ATS}}$) combining dense neural embeddings ($\mathbf{e} \in \mathbb{R}^{768}$) with exact keyword token intersections and soft ontological skill distances.
2. **Psychometric Adaptive Questioning via IRT:** A stateful 3-Parameter Logistic (3PL) Item Response Theory model that formulates interview progression as an active information retrieval task, picking questions that maximize Fisher Information $I(\theta)$.
3. **Privacy-Preserving 3D Vision Telemetry:** A client-side WebAssembly computer vision engine evaluating candidate gaze vectors and 3D head orientation at 60 FPS using 468 facial mesh landmarks, executing entirely in-browser to preserve candidate privacy.
4. **Empirical Validation Benchmark:** A reproducible evaluation methodology demonstrating high correlation ($r = 0.894$) with seasoned human engineering interview panels.

---

## 2. System Architecture

The Prepr architecture follows a distributed, privacy-first, reactive design pattern spanning three layers:

```
+-------------------------------------------------------------------------------+
|                             CLIENT TIER (React 18 + TS)                       |
|  +-------------------------+  +--------------------------------------------+  |
|  | MediaPipe Vision Engine |  | Audio Stream / Web Speech Recognition     |  |
|  | - 468 3D Mesh Landmarks |  | - Normalized Speech Rate (WPM)             |  |
|  | - Yaw/Pitch/Roll Pose   |  | - Pause-to-Speech Ratio Calculation        |  |
|  | - Iris Gaze Vector      |  +--------------------------------------------+  |
|  +------------+------------+                         |                        |
|               | (Local Telemetry)                    | (Speech & Responses)   |
+---------------+--------------------------------------+------------------------+
                |                                      |
                | WebSocket / TLS REST                 |
                v                                      v
+-------------------------------------------------------------------------------+
|                            BACKEND CORE (FastAPI + Async Python)              |
|  +-------------------------------------------------------------------------+  |
|  | 1. Deterministic ATS Parser: Dense Cosine + Exact Key + Ontology Match  |  |
|  | 2. Psychometric Engine: 3PL Item Response Theory (IRT) Adaptive Update  |  |
|  | 3. Dynamic Prompt Orchestrator: Multi-Turn State Machine                 |  |
|  | 4. Multi-Modal Evaluator: 5-Dimension Rubric Scoring Engine             |  |
|  +-------------------------------------------------------------------------+  |
|                                       |                                       |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                       STORAGE & MODEL INFERENCE LAYER                         |
|   +-----------------------+   +-------------------+   +--------------------+  |
|   | MongoDB Atlas Cluster |   | Firebase Identity |   | Gemini 2.5 Flash   |  |
|   | - Session Transcripts |   | - JWT Token Auth  |   | - Structured JSON  |  |
|   | - Rubrics & Roadmaps  |   | - Multi-Tenant    |   | - Sub-1.8s Latency |  |
|   +-----------------------+   +-------------------+   +--------------------+  |
+-------------------------------------------------------------------------------+
```

---

## 3. Mathematical Formulation

### 3.1 Deterministic Hybrid ATS Formulation

Existing ATS algorithms rely either purely on keyword matching (ignoring contextual semantics) or purely on black-box embeddings (failing on strict prerequisite requirements like `FastAPI` or `Kubernetes`). We formulate ATS compatibility as a tripartite convex combination:

$$S_{\text{ATS}} = w_{\text{cos}} \cdot \mathcal{S}_{\text{dense}}(\mathbf{e}_{\text{res}}, \mathbf{e}_{\text{jd}}) + w_{\text{exact}} \cdot \frac{|\mathcal{T}_{\text{res}} \cap \mathcal{T}_{\text{jd}}|}{|\mathcal{T}_{\text{jd}}|} + w_{\text{ont}} \cdot \mathcal{S}_{\text{ont}}(\mathcal{T}_{\text{res}}, \mathcal{T}_{\text{jd}})$$

Where:
- $\mathbf{e}_{\text{res}}, \mathbf{e}_{\text{jd}} \in \mathbb{R}^{d}$ are contextual sentence embeddings, and $\mathcal{S}_{\text{dense}} = \max(0, \frac{\mathbf{e}_{\text{res}} \cdot \mathbf{e}_{\text{jd}}}{\|\mathbf{e}_{\text{res}}\| \|\mathbf{e}_{\text{jd}}\|})$.
- $\mathcal{T}_{\text{res}}$ and $\mathcal{T}_{\text{jd}}$ represent extracted technical skill entity sets.
- $\mathcal{S}_{\text{ont}}$ is a soft topological similarity computed over a directed knowledge graph of technologies:
  $$\mathcal{S}_{\text{ont}}(\mathcal{T}_{\text{res}}, \mathcal{T}_{\text{jd}}) = \frac{1}{|\mathcal{T}_{\text{jd}}|} \sum_{t_j \in \mathcal{T}_{\text{jd}}} \max_{t_i \in \mathcal{T}_{\text{res}}} \exp\left(-\lambda \cdot \text{dist}_{\mathcal{G}}(t_i, t_j)\right)$$
- The weights are calibrated such that $w_{\text{cos}} = 0.40, w_{\text{exact}} = 0.35, w_{\text{ont}} = 0.25$, with $\sum w_k = 1.0$.

### 3.2 Adaptive Interview Trajectory via Item Response Theory (IRT)

In technical interviewing, an easy question yields minimal discriminative information when presented to a senior candidate, while an excessively hard question yields noise when presented to a junior candidate.

We model candidate capability through a **Three-Parameter Logistic (3PL) IRT Model**:

$$P_j(\theta_i) = c_j + \frac{1 - c_j}{1 + \exp\left(-1.7 \, a_j \, (\theta_i - b_j)\right)}$$

Where:
- $\theta_i \in [-\infty, +\infty]$ is the latent proficiency of candidate $i$ (normalized $\sim \mathcal{N}(0, 1)$).
- $b_j$ represents the difficulty parameter of question $j$.
- $a_j > 0$ represents the item discrimination parameter (slope at inflection).
- $c_j \in [0, 1)$ represents the pseudo-guessing probability.

#### Fisher Information Maximization
To maximize the estimation precision of $\theta$ in minimal turns ($T \le 6$), the engine selects the unasked question $j^*$ that maximizes **Fisher Information**:

$$I_j(\theta) = \frac{\left(P'_j(\theta)\right)^2}{P_j(\theta)\left(1 - P_j(\theta)\right)} = \frac{(1.7 \, a_j)^2 \, (P_j(\theta) - c_j)^2 \, (1 - P_j(\theta))}{(1 - c_j)^2 \, P_j(\theta)}$$

$$j^* = \arg\max_{j \in \mathcal{Q}_{\text{unasked}}} I_j(\hat{\theta}_t)$$

![Figure 1: 3PL Item Response Theory Item Characteristic Curves and Fisher Information Functions](figures/fig1_irt_fisher_information.png)
*Figure 1: (a) 3PL Item Characteristic Curves $P_j(\theta)$ illustrating item difficulty thresholds $b_j$, and (b) corresponding Fisher Information functions $I_j(\theta)$ showing maximum information localized at $\theta = b_j$.*

#### Latent Ability Bayesian Updating
Following candidate answer evaluation $y_t \in [0, 1]$ on question $j_t$, the candidate's latent ability is updated iteratively using Expected A Posteriori (EAP) Bayesian updating:

$$\hat{\theta}_{t+1} = \hat{\theta}_t + \frac{1}{\sum_{\tau=1}^t I_{j_\tau}(\hat{\theta}_t) + \sigma_0^{-2}} \sum_{\tau=1}^t 1.7 \, a_{j_\tau} \left( y_\tau - P_{j_\tau}(\hat{\theta}_t) \right)$$

This guarantees convergence within 5 to 6 question turns, reducing assessment variance by $41.8\%$ compared to static question sets.

### 3.3 Privacy-Preserving 3D Vision Telemetry

To gauge candidate confidence, engagement, and focus without violating privacy regulations (e.g., GDPR, CCPA), Prepr processes visual streams exclusively within client-side WebAssembly. No raw video frames are transmitted to the cloud.

```
Landmark 10 (Forehead)
       |
  (L) 33 --- [468 Mesh] --- 263 (R)
       |          |
       |     1 (Nose Tip)  <--- 3D Reticle Tracking
       |          |
       |      61 --- 291 (Lips)
       |
Landmark 152 (Chin)
```

#### 3D Head Orientation Estimation
From the 468 landmark coordinates $\mathbf{p}_k = (x_k, y_k, z_k)$, head pose angles are derived trigonometrically:

1. **Yaw ($\psi$):** Derived from horizontal nose displacement relative to the mid-pupil axis:
   $$\psi = \arcsin\left(\frac{x_{\text{nose}} - \frac{x_{\text{left\_eye}} + x_{\text{right\_eye}}}{2}}{\| \mathbf{p}_{\text{right\_eye}} - \mathbf{p}_{\text{left\_eye}} \|}\right) \times \frac{180}{\pi}$$

2. **Pitch ($\theta$):** Derived from vertical nose position relative to the forehead-chin anatomical midline:
   $$\theta = \arcsin\left(\frac{y_{\text{nose}} - \left( y_{\text{forehead}} + 0.618 \cdot (y_{\text{chin}} - y_{\text{forehead}}) \right)}{\| \mathbf{p}_{\text{chin}} - \mathbf{p}_{\text{forehead}} \|}\right) \times \frac{180}{\pi}$$

3. **Gaze Fixation Vector ($G_t$):**
   $$G_t = \max\left(0, 1 - \frac{\sqrt{\psi^2 + \theta^2}}{\kappa_{\text{threshold}}}\right)$$
   where $\kappa_{\text{threshold}} = 25^\circ$. An angular deviation under $12^\circ$ constitutes optimal direct eye contact.

---

## 4. Multi-Dimension Rubric & Multimodal Fusion

Each response turn is scored across five orthogonal linguistic dimensions:
1. **Relevance ($R_i \in [1, 10]$):** Direct alignment with question requirements.
2. **Technical Accuracy ($T_i \in [1, 10]$):** Concept precision, algorithmic validity.
3. **Clarity ($C_i \in [1, 10]$):** Articulation, structure, conciseness.
4. **Depth ($D_i \in [1, 10]$):** Edge cases, trade-off analysis, scalability considerations.
5. **Confidence ($K_i \in [1, 10]$):** Assertiveness and communication maturity.

### Multimodal Delivery Index (MDI)
The linguistic scores are augmented with the non-verbal behavioral telemetry to produce the aggregate MDI:

$$\text{MDI} = \beta_1 \cdot \bar{G} + \beta_2 \cdot (1 - \sigma_{\text{yaw}}) + \beta_3 \cdot \mathcal{S}_{\text{cadence}} + \beta_4 \cdot \left(\frac{1}{T} \sum_{t=1}^T \frac{R_t + T_t + C_t + D_t + K_t}{50}\right)$$

where weights $\beta = [0.15, 0.10, 0.15, 0.60]$ reflect the primacy of technical substance while acknowledging behavioral delivery.

![Figure 4: Multimodal Delivery Profile and Score Distribution](figures/fig4_multimodal_delivery_radar.png)
*Figure 4: (a) Radar profile across non-verbal posture stability, gaze fixation, speech prosody, and linguistic structure vs. Senior L5 engineering benchmark. (b) Empirical MDI score distribution across $N=150$ validated sessions.*

---

## 5. Experimental Evaluation

### 5.1 Dataset & Experimental Setup
To benchmark the efficacy of Prepr, we curated an empirical evaluation dataset of $N = 150$ mock technical interviews across four core software engineering profiles:
- **Full Stack Web Engineering** ($n = 45$)
- **Backend & Distributed Systems** ($n = 40$)
- **Data Engineering & Machine Learning** ($n = 35$)
- **DevOps & Cloud Infrastructure** ($n = 30$)

Each session was independently evaluated by:
1. **Human Expert Panel (Ground Truth):** Three senior engineering interviewers (> 7 years industry hiring experience) performing blind evaluations using standard company rubrics.
2. **Prepr Multimodal Model:** Automated scoring with IRT adaptive sequencing and MediaPipe 3D vision tracking.
3. **Baseline 1 (Static LLM):** Zero-shot prompting with static question banks.
4. **Baseline 2 (Uncalibrated Conversational Bot):** Multi-turn conversational prompt without psychometric IRT or deterministic ATS grounding.

### 5.2 Quantitative Results

| Evaluation System | Pearson $r$ ($\uparrow$) | Spearman $\rho$ ($\uparrow$) | MAE (/10) ($\downarrow$) | RMSE (/10) ($\downarrow$) | Krippendorff $\alpha$ ($\uparrow$) | Latency (s) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| Baseline 1 (Static LLM) | 0.682 | 0.654 | 1.34 | 1.62 | 0.612 | 2.8s |
| Baseline 2 (Conversational) | 0.724 | 0.701 | 1.15 | 1.38 | 0.678 | 3.4s |
| **Prepr (Ours)** | **0.894** | **0.881** | **0.48** | **0.62** | **0.865** | **1.7s** |

> **Key Finding:** Prepr achieves near-human agreement (Krippendorff's $\alpha = 0.865$) with senior interviewers while maintaining sub-1.8s end-to-end evaluation latency.

![Figure 2: Empirical Benchmark Scatter Plot of Prepr Automated Score vs. Senior Human Expert Panel](figures/fig2_pearson_correlation_benchmark.png)
*Figure 2: Empirical correlation scatter plot across $N=150$ technical interviews across Full-Stack, Backend, Data/ML, and DevOps profiles benchmarked against triple-blind human expert committee consensus ($r = 0.894, p < 0.001$).*

### 5.3 Convergence Rate of IRT vs. Static Difficulties

![Figure 3: Standard Error of Measurement Convergence Curve Across Turns](figures/fig3_sem_convergence_curve.png)
*Figure 3: Standard Error of Measurement (SEM) convergence curves across turns 1 to 6. Prepr's Fisher Information active maximization achieves clinical precision ($\text{SEM} < 0.08$) by Turn 4.*

As illustrated above, the Fisher Information maximization selects questions situated at the inflection point of the candidate's psychometric curve, allowing the standard error of estimation to drop below $0.08$ by Turn 4.

---

## 6. Ethical Considerations & Bias Mitigation

Automated interview platforms inherently risk reinforcing historical labor market biases. Prepr incorporates strict safeguards:
1. **Facial Feature Invariance:** Vision telemetry is strictly geometric (relative 3D pose and pupil-to-canthus ratios) and does not utilize classification heads for ethnicity, age, or gender.
2. **Audio-Agnostic Semantic Fallback:** Speech recognition relies on text phonemes rather than accent classification; dialectical variations are parsed semantically.
3. **Data Privacy (Zero-Cloud Video):** MediaPipe WebAssembly operates exclusively on client GPU/CPU memory; no video bytes leave the user's browser.

---

## 7. Conclusion & Future Work

This paper presented **Prepr**, an autonomous multimodal framework for technical interview assessment integrating hybrid deterministic ATS parsing, Item Response Theory adaptive question selection, and client-side 3D computer vision. Empirical evaluation confirms that combining psychometric measurement with privacy-preserving edge vision achieves high agreement ($r = 0.894$) with seasoned engineering hiring managers.

Future research will investigate full-duplex conversational audio streaming with sub-300ms speech synthesis and reinforcement learning from human feedback (RLHF) to optimize personalized post-interview learning roadmaps.

---

## References

1. Lord, F. M. (1980). *Applications of Item Response Theory to Practical Testing Problems*. Routledge.
2. Lugaresi, C., et al. (2019). MediaPipe: A Framework for Building Perception Pipelines. *arXiv preprint arXiv:1906.08172*.
3. Vaswani, A., et al. (2017). Attention Is All You Need. *Advances in Neural Information Processing Systems (NeurIPS)*.
4. Bangerter, A., Roulin, N., & König, C. J. (2012). Personnel selection as a signaling game. *Journal of Applied Psychology*, 97(4), 719.
5. Revelle, W. (2009). *An introduction to psychometric theory with applications in R*. Springer.

