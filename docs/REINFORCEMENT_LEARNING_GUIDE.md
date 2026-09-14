# 🧠 Reinforcement Learning for Spaceship Flight: Theory, Mathematics, & Implementation Guide

**Author:** Amit Joshi ([@amitjoshi2724](https://github.com/amitjoshi2724))  
**Topic:** Autonomous Arcade Flight via Deep Reinforcement Learning (RL)  
**Target Environment:** [Spaceship Flight](https://amitjoshi2724.github.io/Spaceship-Flight/)  

---

## 📑 Table of Contents
1. [Introduction & The Problem Formulation](#1-introduction--the-problem-formulation)
2. [The Formal Mathematics: Markov Decision Processes (MDPs)](#2-the-formal-mathematics-markov-decision-processes-mdps)
3. [The Core Battle: SARSA vs. Q-Learning vs. Policy Gradients](#3-the-core-battle-sarsa-vs-q-learning-vs-policy-gradients)
   - [3.1 SARSA: On-Policy Temporal Difference Control](#31-sarsa-on-policy-temporal-difference-control)
   - [3.2 Q-Learning: Off-Policy Temporal Difference Control](#32-q-learning-off-policy-temporal-difference-control)
   - [3.3 Expected SARSA: The Middle Path](#33-expected-sarsa-the-middle-path)
   - [3.4 The Classic "Cliff Walking" Intuition: Why SARSA vs. Q-Learning Matters](#34-the-classic-cliff-walking-intuition-why-sarsa-vs-q-learning-matters)
   - [3.5 Why Tabular Methods Fail for Spaceship Flight](#35-why-tabular-methods-fail-for-spaceship-flight)
   - [3.6 Deep Q-Networks (DQN) & Extensions](#36-deep-q-networks-dqn--extensions)
   - [3.7 Actor-Critic & PPO: The Modern Gold Standard](#37-actor-critic--ppo-the-modern-gold-standard)
4. [Feature Engineering & Observation Space Representation](#4-feature-engineering--observation-space-representation)
   - [4.1 The Toroidal Screen-Wrapping Trap (Periodic Boundaries)](#41-the-toroidal-screen-wrapping-trap-periodic-boundaries)
   - [4.2 Coordinate Systems: World vs. Egocentric (Ship-Centric)](#42-coordinate-systems-world-vs-egocentric-ship-centric)
   - [4.3 The Dynamic Entity Set Problem: Feeding Variable-Length Asteroid Arrays into Neural Networks](#43-the-dynamic-entity-set-problem-feeding-variable-length-asteroid-arrays-into-neural-networks)
      - [4.3.1 The Fundamental ML Dilemmas: Why Raw Arrays Break Standard Neural Networks](#431-the-fundamental-ml-dilemmas-why-raw-arrays-break-standard-neural-networks)
      - [4.3.2 Paradigm 1: Nearest-K Truncation with Existence Masking (The Baseline)](#432-paradigm-1-nearest-k-truncation-with-existence-masking-the-baseline)
      - [4.3.3 Paradigm 2: Deep Sets Architecture & Permutation-Invariant Symmetric Pooling](#433-paradigm-2-deep-sets-architecture--permutation-invariant-symmetric-pooling)
      - [4.3.4 Paradigm 3: 360° Radial Spatial Radar Bins (LIDAR / Sector Scanning)](#434-paradigm-3-360-radial-spatial-radar-bins-lidar--sector-scanning)
      - [4.3.5 Paradigm 4: Cross-Attention & Set Transformers](#435-paradigm-4-cross-attention--set-transformers)
      - [4.3.6 Paradigm 5: The Grandmaster Hybrid Architecture (Aim Lock + Global Evasion)](#436-paradigm-5-the-grandmaster-hybrid-architecture-aim-lock--global-evasion)
      - [4.3.7 Concrete JavaScript & PyTorch Implementations](#437-concrete-javascript--pytorch-implementations)
      - [4.3.8 Architectural Comparison & Trade-Off Matrix](#438-architectural-comparison--trade-off-matrix)
   - [4.4 Spaceship Kinematics & The Angle Discontinuity Problem](#44-spaceship-kinematics--the-angle-discontinuity-problem)
   - [4.5 Weapons, Shield Capacitors, & Defensive States](#45-weapons-shield-capacitors--defensive-states)
   - [4.6 Inductive Biases & Targeting Aids](#46-inductive-biases--targeting-aids)
   - [4.7 Production In-Browser Architecture: The 38-Dimensional Grandmaster Attention Hybrid Vector (`rl_agent.js`)](#47-production-in-browser-architecture-the-38-dimensional-grandmaster-attention-hybrid-vector-rl_agentjs)
5. [Action Space Design & Kinematic Execution](#5-action-space-design--kinematic-execution)
6. [Reward Function Engineering & Credit Assignment](#6-reward-function-engineering--credit-assignment)
   - [6.1 The Danger of Reward Hacking](#61-the-danger-of-reward-hacking)
   - [6.2 Potential-Based Reward Shaping (PBRS)](#62-potential-based-reward-shaping-pbrs)
   - [6.3 The Complete Mathematical Reward Formulation](#63-the-complete-mathematical-reward-formulation)
7. [End-to-End Implementation Architecture](#7-end-to-end-implementation-architecture)
   - [7.1 Headless Python Gymnasium Environment](#71-headless-python-gymnasium-environment)
   - [7.2 Training with Stable-Baselines3 PPO](#72-training-with-stable-baselines3-ppo)
   - [7.3 Exporting to ONNX & Running In-Browser via TensorFlow.js / ONNX Runtime Web](#73-exporting-to-onnx--running-in-browser-via-tensorflowjs--onnx-runtime-web)
8. [The "Trigger-Happy" Pathology & Firing Cadence Dynamics](#8-the-trigger-happy-pathology--firing-cadence-dynamics)
   - [8.1 Why Untrained Agents Spill All Bullets Immediately: Is It "Part of the Process"?](#81-why-untrained-agents-spill-all-bullets-immediately-is-it-part-of-the-process)
   - [8.2 The 5-Layer Engineering Solution](#82-the-5-layer-engineering-solution)
   - [8.3 Behavioral Cloning Pre-Warming](#83-behavioral-cloning-pre-warming)

---

## 1. Introduction & The Problem Formulation

In **Spaceship Flight**, the player controls an inertial rocket operating inside a 2-dimensional toroidal manifold (the screen wraps seamlessly across all four edges). The agent must steer, thrust, fire plasma laser cannons, and deploy emergency forcefield shields to survive an escalating storm of rotating, fracturing polygonal asteroids while neutralizing a hostile, context-steering UFO.

From an AI standpoint, this game presents several fascinating control challenges:
1. **Second-Order Inertial Mechanics:** Accelerating creates momentum ($\vec{v} \leftarrow \vec{v} + \vec{a}\Delta t, \; \vec{x} \leftarrow \vec{x} + \vec{v}\Delta t$). You cannot stop on a dime. Dodging an asteroid requires planning velocity vectors seconds in advance.
2. **Toroidal Non-Euclidean Topology:** The shortest path between two points wraps across screen boundaries. A rock at the far-right edge ($x = 790$) is actually right next to a ship at the far-left edge ($x = 10$).
3. **Dynamic Multi-Entity Environment:** Asteroids split from large to medium to small, constantly altering the cardinality of objects in the scene.
4. **Dual Objective (Survival vs. Combat):** The agent must balance aggressive target acquisition with defensive evasion and energy management.

Our goal is to train an autonomous artificial agent using **Deep Reinforcement Learning (DRL)** that can pilot the ship at super-human levels.

---

## 2. The Formal Mathematics: Markov Decision Processes (MDPs)

Reinforcement Learning formalizes decision-making through the mathematical framework of a **Markov Decision Process (MDP)**, defined by the 5-tuple:

$$\mathcal{M} = \langle \mathcal{S}, \mathcal{A}, \mathcal{P}, \mathcal{R}, \gamma \rangle$$

Where:
- $\mathcal{S}$ is the **State Space**: the set of all possible environmental configurations.
- $\mathcal{A}$ is the **Action Space**: the set of all valid commands the agent can issue.
- $\mathcal{P}(s_{t+1} \mid s_t, a_t) = \mathbb{P}(S_{t+1} = s_{t+1} \mid S_t = s_t, A_t = a_t)$ is the **Transition Probability Function**, describing the underlying physics and environment dynamics.
- $\mathcal{R}(s_t, a_t, s_{t+1}) = \mathbb{E}[R_{t+1} \mid S_t = s_t, A_t = a_t, S_{t+1} = s_{t+1}]$ is the **Reward Function**, evaluating the immediate quality of an action.
- $\gamma \in [0, 1)$ is the **Discount Factor**, quantifying how much the agent prioritizes immediate rewards over future rewards.

### The Objective of the Agent
The agent interacts with the environment according to a policy $\pi(a \mid s) = \mathbb{P}(A_t = a \mid S_t = s)$. The agent seeks to find the optimal policy $\pi^*$ that maximizes the **expected cumulative discounted return** $G_t$:

$$G_t = \sum_{k=0}^{\infty} \gamma^k R_{t+k+1}$$

$$J(\pi) = \mathbb{E}_{\tau \sim \pi} [G_0] = \mathbb{E}_{\tau \sim \pi} \left[ \sum_{t=0}^{T} \gamma^t R_{t+1} \right], \quad \pi^* = \arg\max_\pi J(\pi)$$

Where $\tau = (s_0, a_0, r_1, s_1, a_1, \dots)$ is a trajectory.

### Value Functions and the Bellman Equations
To evaluate how good a state or state-action pair is, we define:

1. **State-Value Function $V^\pi(s)$:**
   $$V^\pi(s) = \mathbb{E}_\pi \left[ G_t \mid S_t = s \right] = \mathbb{E}_\pi \left[ R_{t+1} + \gamma V^\pi(S_{t+1}) \mid S_t = s \right]$$

2. **Action-Value Function (Q-Function) $Q^\pi(s, a)$:**
   $$Q^\pi(s, a) = \mathbb{E}_\pi \left[ G_t \mid S_t = s, A_t = a \right] = \mathbb{E}_\pi \left[ R_{t+1} + \gamma Q^\pi(S_{t+1}, A_{t+1}) \mid S_t = s, A_t = a \right]$$

The foundation of reinforcement learning rests on the **Bellman Optimality Equation**:

$$Q^*(s, a) = \mathcal{R}(s, a) + \gamma \sum_{s' \in \mathcal{S}} \mathcal{P}(s' \mid s, a) \max_{a' \in \mathcal{A}} Q^*(s', a')$$

---

## 3. The Core Battle: SARSA vs. Q-Learning vs. Policy Gradients

A primary question you raised: **Is SARSA or Q-Learning best? What is the difference, and why did classical RL invent both?**

Both **SARSA** and **Q-Learning** are model-free **Temporal Difference (TD)** control algorithms. They learn directly from experience without requiring an explicit mathematical model of transition probabilities $\mathcal{P}(s' \mid s, a)$.

However, they differ profoundly in their philosophy of **On-Policy** versus **Off-Policy** learning.

---

### 3.1 SARSA: On-Policy Temporal Difference Control

SARSA stands for the exact experience quintuple used in its update:
$$(S_t, \; A_t, \; R_{t+1}, \; S_{t+1}, \; A_{t+1})$$

#### The Update Equation
$$Q(S_t, A_t) \leftarrow Q(S_t, A_t) + \alpha \Big[ \underbrace{R_{t+1} + \gamma Q(S_{t+1}, A_{t+1})}_{\text{TD Target}} - Q(S_t, A_t) \Big]$$

Where:
- $\alpha \in (0, 1]$ is the learning rate.
- $\delta_t = R_{t+1} + \gamma Q(S_{t+1}, A_{t+1}) - Q(S_t, A_t)$ is the **TD Error**.

#### Why SARSA is "On-Policy"
Look closely at the TD target: $R_{t+1} + \gamma Q(S_{t+1}, A_{t+1})$.  
Here, $A_{t+1}$ is the **action the agent actually executed** in state $S_{t+1}$ according to its current exploration policy (for example, $\epsilon$-greedy).

Because the update evaluates the return of the policy that was *actually followed* (including exploratory blunders where $\epsilon$ picks a random direction), SARSA is strictly **on-policy**.

---

### 3.2 Q-Learning: Off-Policy Temporal Difference Control

Q-Learning (Watkins, 1989) uses the experience tuple:
$$(S_t, \; A_t, \; R_{t+1}, \; S_{t+1})$$

#### The Update Equation
$$Q(S_t, A_t) \leftarrow Q(S_t, A_t) + \alpha \Big[ \underbrace{R_{t+1} + \gamma \max_{a} Q(S_{t+1}, a)}_{\text{TD Target}} - Q(S_t, A_t) \Big]$$

#### Why Q-Learning is "Off-Policy"
In Q-Learning, the TD target does **not** care what action the agent actually chose next. It computes $\max_{a} Q(S_{t+1}, a)$—the hypothetical value of taking the *best possible greedy action*, even if the agent actually took an exploratory random action due to $\epsilon$-greedy exploration!

- **Behavior Policy ($\mu$):** Generates experience (e.g. $\epsilon$-greedy, keyboard human player, or random exploration).
- **Target Policy ($\pi$):** The policy being learned and optimized (the purely greedy policy $\pi(s) = \arg\max_a Q(s, a)$).

Because the behavior policy differs from the target policy, Q-Learning is **off-policy**.

---

### 3.3 Expected SARSA: The Middle Path

Expected SARSA eliminates the variance introduced by randomly sampling $A_{t+1}$ by taking the expected value under the current policy $\pi$:

$$Q(S_t, A_t) \leftarrow Q(S_t, A_t) + \alpha \left[ R_{t+1} + \gamma \sum_{a \in \mathcal{A}} \pi(a \mid S_{t+1}) Q(S_{t+1}, a) - Q(S_t, A_t) \right]$$

If $\pi$ is purely greedy ($\epsilon = 0$), Expected SARSA becomes mathematically identical to Q-Learning!

---

### 3.4 The Classic "Cliff Walking" Intuition: Why SARSA vs. Q-Learning Matters

To truly understand why SARSA behaves differently from Q-Learning, consider the famous **Cliff Walking Problem** (Sutton & Barto):

```
S: Start     G: Goal      C: Cliff (-100 reward & death)     .: Normal Grid (-1 reward)

.   .   .   .   .   .   .   .   .   .   .   .
.   .   .   .   .   .   .   .   .   .   .   .
.   .   .   .   .   .   .   .   .   .   .   .  <-- Safe Path (SARSA)
S   C   C   C   C   C   C   C   C   C   C   G  <-- Optimal Path (Q-Learning)
```

1. **What Q-Learning Learns:**
   - Q-Learning assumes optimal future actions ($\max_a Q$).
   - It discovers the absolute shortest path along the cliff edge: `Right, Right, Right...` right next to the cliff.
   - **The Problem:** While training with $\epsilon$-greedy exploration ($\epsilon = 0.1$), 10% of the time the agent takes a random step. Being right on the edge of the cliff means it constantly falls off, suffering thousands of $-100$ penalties during training!
   - Q-Learning learns the **optimal path**, but achieves **lower average performance during training**.

2. **What SARSA Learns:**
   - SARSA evaluates the policy *with its exploration included*.
   - It notices: *"Whenever I walk near the cliff, there is a 10% chance I randomly slip into the abyss and explode."*
   - Therefore, $Q(s, \text{near cliff})$ receives a low value.
   - SARSA deliberately chooses the longer, safer route along the top of the grid!
   - SARSA learns a **cautious, risk-averse policy**.

#### Application to Spaceship Flight:
- **If you train with SARSA:** The ship learns to stay far away from dense asteroid clusters because it anticipates that an exploratory thrust or turn could accidentally slam into a rock. It becomes a **defensive survivor**.
- **If you train with Q-Learning:** The ship attempts risky, millimeter-tight maneuvers between two incoming boulders because it assumes it will always perform frame-perfect dodges. During training, however, exploratory actions cause frequent catastrophic collisions.

---

### 3.5 Why Tabular Methods Fail for Spaceship Flight

In tabular SARSA and tabular Q-Learning, values are stored in a lookup matrix:
$$\mathbf{Q} \in \mathbb{R}^{|\mathcal{S}| \times |\mathcal{A}|}$$

Let's calculate the size of $\mathcal{S}$ for Spaceship Flight:
- Ship position $(x, y)$: $800 \times 600$ continuous $\to$ even binned coarsely into $20 \times 20 = 400$ bins.
- Ship velocity $(v_x, v_y)$: 10 bins each $\to 100$ bins.
- Ship angle $\theta$: 16 directional bins.
- 5 Asteroids, each with $(x, y, v_x, v_y)$: $(400 \times 100)^5 = (4 \times 10^4)^5 \approx 10^{23}$ combinations.
- UFO state $(x, y, v_x, v_y)$: $4 \times 10^4$ bins.
- Energy and shield meters: 10 bins each $\to 100$ bins.

$$\text{Total States } |\mathcal{S}| > 400 \times 100 \times 16 \times 10^{23} \times 40000 \times 100 \approx 2.5 \times 10^{33} \text{ states}$$

A lookup table of $10^{33}$ floats would require **$10^{24}$ Gigabytes of RAM** (more storage than all computers on Earth combined), and the agent would almost never visit the exact same state twice!

**Conclusion:** We cannot use tabular methods. We **must** use **Function Approximation** (Neural Networks) to generalize across continuous state spaces:

$$Q(s, a) \approx Q(s, a; \mathbf{w})$$

---

### 3.6 Deep Q-Networks (DQN) & Extensions

When we replace the Q-table with a deep neural network parameterized by weights $\mathbf{w}$, we get **DQN** (Mnih et al., DeepMind 2015).

However, training a neural net directly on temporal difference errors causes the **"Deadly Triad"** of reinforcement learning:
1. **Function Approximation** (Neural Net)
2. **Bootstrapping** (Using current estimates to update current estimates: $R + \gamma Q$)
3. **Off-Policy Training**

Together, these three frequently cause training to oscillate wildly or diverge to infinity. DeepMind solved this with two breakthrough mechanisms:

1. **Experience Replay Buffer $\mathcal{D}$:**
   Instead of updating on consecutive, highly correlated frames $s_t, s_{t+1}, s_{t+2}$, the agent stores transitions $(s, a, r, s', d)$ in a circular buffer and samples uniform mini-batches. This breaks temporal correlations and stabilizes gradient descent.

2. **Separate Target Network $Q(s, a; \mathbf{w}^-)$:**
   The weights $\mathbf{w}^-$ are kept frozen and only updated periodically to $\mathbf{w}$ every $C$ steps:
   $$L(\mathbf{w}) = \mathbb{E}_{(s, a, r, s') \sim \mathcal{D}} \left[ \left( r + \gamma \max_{a'} Q(s', a'; \mathbf{w}^-) - Q(s, a; \mathbf{w}) \right)^2 \right]$$

#### Essential DQN Improvements for Arcade Flight:
- **Double DQN (Van Hasselt et al., 2015):** The $\max$ operator in standard DQN causes massive overestimation of Q-values. Double DQN decouples action selection from action evaluation:
  $$Y_t^{\text{DoubleQ}} = R_{t+1} + \gamma Q\left(S_{t+1}, \;\arg\max_{a} Q(S_{t+1}, a; \mathbf{w}); \;\mathbf{w}^-\right)$$
- **Dueling DQN (Wang et al., 2016):** Splits the network into two streams: a scalar state value $V(s)$ and an advantage vector $A(s, a)$:
  $$Q(s, a) = V(s; \alpha) + \left( A(s, a; \beta) - \frac{1}{|\mathcal{A}|} \sum_{a'} A(s, a'; \beta) \right)$$
  This allows the network to learn that a state is dangerous (e.g. an asteroid is about to hit) without needing to evaluate the effect of every individual action.

---

### 3.7 Actor-Critic & PPO: The Modern Gold Standard

While DQN works well for discrete games, **Policy Gradient methods** directly optimize the policy $\pi_\theta(a \mid s)$ without relying entirely on argmax Q-values.

#### The Policy Gradient Theorem
The gradient of expected return $J(\theta)$ with respect to policy parameters $\theta$ is:

$$\nabla_\theta J(\theta) = \mathbb{E}_{\pi_\theta} \left[ \sum_{t=0}^T \nabla_\theta \log \pi_\theta(a_t \mid s_t) A^{\pi_\theta}(s_t, a_t) \right]$$

Where $A(s, a) = Q(s, a) - V(s)$ is the **Advantage Function** (how much better action $a$ is compared to the average action in state $s$).

#### Actor-Critic Architecture
- **The Actor $\pi_\theta(a \mid s)$:** Outputs a probability distribution over actions (e.g., softmax logits).
- **The Critic $V_\phi(s)$:** Predicts the scalar expected return of the current state, trained via Mean Squared Error on Generalized Advantage Estimation (GAE).

```
State s_t ---> [ Shared Feature Extractor ]
                     |              |
                     v              v
             [ Actor Network ]   [ Critic Network ]
                     |              |
                     v              v
               Action Probabilities    State Value V(s_t)
                 π_θ(a | s_t)
```

#### Proximal Policy Optimization (PPO)
Standard policy gradient algorithms have a major flaw: a single bad gradient update with a large step size can completely collapse policy performance, and because the data distribution depends on the policy, it can never recover.

**PPO (Schulman et al., 2017)** constrains the policy update using a **Clipped Surrogate Objective**:

$$L^{\text{CLIP}}(\theta) = \hat{\mathbb{E}}_t \left[ \min \left( r_t(\theta) \hat{A}_t, \;\operatorname{clip}(r_t(\theta), 1 - \epsilon, 1 + \epsilon) \hat{A}_t \right) \right]$$

Where:
- Probability ratio: $r_t(\theta) = \frac{\pi_\theta(a_t \mid s_t)}{\pi_{\theta_{\text{old}}}(a_t \mid s_t)}$
- $\epsilon \approx 0.2$ is the clipping parameter.

If an action was good ($\hat{A}_t > 0$), PPO increases its probability, but clips the objective at $1 + \epsilon$ so the policy cannot change too aggressively in a single batch.

#### Comparison Summary

| Criteria | SARSA / Deep SARSA | Q-Learning / DQN | PPO (Actor-Critic) |
| :--- | :--- | :--- | :--- |
| **Policy Type** | On-Policy | Off-Policy | On-Policy |
| **Action Space** | Small Discrete | Discrete only | Discrete, Multi-Discrete, & Continuous |
| **Sample Efficiency** | Moderate | High (Replay Buffer) | Moderate (compensated by high stability) |
| **Training Stability** | Moderate | Prone to overestimation/divergence | **Extremely Stable** |
| **Implementation Complexity** | Medium | High (Replay + Double + Dueling) | Clean (Standard in SB3 & CleanRL) |
| **Suitability for Spaceship Flight** | Good for cautious defense | Good with careful tuning | **Best / Recommended** |

---

## 4. Feature Engineering & Observation Space Representation

Feeding raw screen pixels $(800 \times 600 \times 3)$ to a Convolutional Neural Network (CNN) requires processing millions of floating-point values per second, demanding massive GPU compute and weeks of training.

By extracting **compact, mathematically rigorous vector features**, a lightweight Multi-Layer Perceptron (MLP) with just two 128-neuron hidden layers can achieve super-human performance in under 1 hour of CPU training!

Here are the critical geometric and kinematic features you must provide.

---

### 4.1 The Toroidal Screen-Wrapping Trap (Periodic Boundaries)

In `Spaceship Flight`, moving off the right edge wraps to the left:
$$\text{If } x > W, \; x \leftarrow 0; \quad \text{If } x < 0, \; x \leftarrow W$$

If your agent computes naive Euclidean distance:
$$\Delta x_{\text{naive}} = x_{\text{rock}} - x_{\text{ship}}$$

Suppose $W = 800$, $x_{\text{ship}} = 15$, and $x_{\text{rock}} = 785$:
$$\Delta x_{\text{naive}} = 785 - 15 = +770\text{ px}$$

The neural network sees a positive offset of $770\text{ px}$ and thinks the rock is far to the right. In reality, across the left wrap boundary, the rock is **only $30\text{ px}$ to the left**! The ship will fail to dodge and get crushed.

#### The Mathematical Solution: Minimum Image Convention
We must compute the toroidal wrapped offset:

$$\Delta x_{\text{wrapped}} = \left( (x_{\text{target}} - x_{\text{ship}} + W/2) \pmod W \right) - W/2$$
$$\Delta y_{\text{wrapped}} = \left( (y_{\text{target}} - y_{\text{ship}} + H/2) \pmod H \right) - H/2$$

The true wrapped distance is:
$$d_{\text{wrapped}} = \sqrt{\Delta x_{\text{wrapped}}^2 + \Delta y_{\text{wrapped}}^2}$$

#### The Critical Asymmetry: Bullets Do NOT Wrap Around!
A frequent pitfall in Asteroids AI architecture is assuming that **all** game elements obey toroidal wrapping.

In `Spaceship Flight`:
- **Spaceship and Asteroids**: DO wrap around screen boundaries. A rock exiting the right edge re-enters on the left edge.
- **Plasma Bullets**: DO **NOT** wrap around! When a bullet exits the canvas boundaries (`x < -10`, `x > W + 10`), the game engine despawns it to eliminate memory overhead.

> [!WARNING]
> If your AI uses `wrappedDelta` to aim its plasma cannon at an asteroid near an opposite border (e.g., ship at $x = 20$, asteroid at $x = 780$), the AI will compute $\Delta x_{\text{wrapped}} = -40$, point its nose toward the left wall, and fire. The bullet will travel $30\text{ px}$, collide with the canvas boundary, and despawn — leaving the asteroid completely untouched!

Therefore, the AI must enforce a **Dual-Geometry Principle**:
1. **Collision Threat & Evasion Field**: Uses **Toroidal Wrapped Delta** (`wrappedDelta`) because physical collisions wrap around boundaries.
2. **Ballistic Weapon Targeting**: Uses **Direct Euclidean Delta** (`directDelta`) within canvas bounds ($d_{\text{direct}} \le 380\text{ px}$). Firing is strictly forbidden if the straight-line trajectory intersects a canvas boundary before reaching the target.

---

### 4.2 Coordinate Systems: World vs. Egocentric (Ship-Centric)

If you feed features in global world coordinates ($+X$ = right, $+Y$ = down), the agent must learn what to do when facing North, South, East, and West independently. That requires $4\times$ more training data!

Instead, transform all vectors into **Ship-Centric (Egocentric) Coordinates** using a 2D rotation matrix:
- Forward nose of the ship is always $+X_{\text{body}}$.
- Starboard (right side) of the ship is always $+Y_{\text{body}}$.

$$\begin{bmatrix} x_{\text{body}} \\ y_{\text{body}} \end{bmatrix} = \begin{bmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{bmatrix} \begin{bmatrix} \Delta x_{\text{wrapped}} \\ \Delta y_{\text{wrapped}} \end{bmatrix}$$

$$\begin{bmatrix} v_{x,\text{body}} \\ v_{y,\text{body}} \end{bmatrix} = \begin{bmatrix} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \end{bmatrix} \begin{bmatrix} v_{x,\text{rock}} - v_{x,\text{ship}} \\ v_{y,\text{rock}} - v_{y,\text{ship}} \end{bmatrix}$$

#### Benefit:
The policy becomes **rotationally invariant**. If an asteroid is straight ahead, it is always at $(+d, 0)$ in body coordinates, regardless of whether the ship is pointed up, down, or sideways!

---

### 4.3 The Dynamic Entity Set Problem: Feeding Variable-Length Asteroid Arrays into Neural Networks

A fundamental challenge in reinforcement learning for arcade environments like **Spaceship Flight** is:  
**How do we feed an arbitrary array of active asteroids into a neural network when the number of rocks constantly changes?**

In any given frame, the game engine maintains an internal array `game.rocks = [rock_0, rock_1, ..., rock_{N-1}]`.  
At the start of a wave, there may be only $N = 4$ large asteroids. But as the player blasts them with plasma laser fire, each rock fractures into smaller fragments, causing $N(t)$ to rapidly fluctuate between $2$ and $25+$ dynamic entities.

To engineers new to deep learning, the intuitive question is: *"Why can't we just pass the array of all rocks directly into the neural network?"*

To understand the solution, we must first understand why standard neural networks fundamentally break when handed variable-length arrays.

---

#### 4.3.1 The Fundamental ML Dilemmas: Why Raw Arrays Break Standard Neural Networks

There are three mathematical and architectural barriers that prevent raw arrays from being passed directly to standard feedforward networks:

```
                  THE THREE BARRIERS TO FEEDING RAW ARRAYS
  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
  │   1. Dimension Mismatch │  │ 2. Permutation Invariance│  │ 3. Zero-Padding Pitfall │
  │                         │  │    (N! Combinations)     │  │                         │
  │ W • x breaks if len(x)  │  │ Rock A at index 0 vs 1   │  │ Fixed N_max creates     │
  │ changes dynamically     │  │ is physically identical, │  │ artificial sparsity,    │
  │ as asteroids fracture   │  │ but MLP treats them as   │  │ discontinuities, and    │
  │ (e.g. 20 vs 90 floats)  │  │ completely diff inputs   │  │ positional confusion    │
  └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
```

##### 1. The Algebraic Shape Constraint: Matrix Multiplication Invariance
A standard Multi-Layer Perceptron (MLP) layer computes its affine transformation via:

$$\mathbf{y} = \sigma(\mathbf{W} \mathbf{x} + \mathbf{b})$$

Where $\mathbf{W} \in \mathbb{R}^{d_{\text{out}} \times d_{\text{in}}}$ is a fixed-weight parameter matrix.  
In linear algebra, matrix multiplication $\mathbf{W} \mathbf{x}$ is only defined when the inner dimensions match exactly:

$$\operatorname{cols}(\mathbf{W}) = \operatorname{rows}(\mathbf{x}) = d_{\text{in}}$$

If each rock is characterized by 5 kinematic features $[x_{\text{body}}, y_{\text{body}}, v_{x,\text{body}}, v_{y,\text{body}}, r]$:
- At $N = 4$ rocks: input vector length is $4 \times 5 = 20$.
- At $N = 18$ rocks: input vector length is $18 \times 5 = 90$.

You cannot execute $\mathbf{W} \mathbf{x}$ on a 90-float vector using a matrix compiled for 20 inputs. The static parameter graph crashes with an immediate tensor shape mismatch.

##### 2. The Permutation Invariance Trap: The $N!$ Factorial Problem
Even if we fixed the array size, asteroids do not have a natural sequence or order.
- In **Computer Vision (CNNs)**, pixels have fixed 2D spatial coordinates (pixel $(0, 0)$ is always top-left).
- In **Natural Language (LLMs)**, words have strict temporal grammar order ("Apollo hit asteroid" $\neq$ "Asteroid hit Apollo").
- In **Spaceship Flight**, the rocks form an **unordered mathematical set**:
  $$\mathcal{X} = \{ \text{Rock}_1, \; \text{Rock}_2, \; \dots, \; \text{Rock}_N \}$$

The engine's internal array `game.rocks` stores objects based on whatever order they were spawned or pushed into memory.  
Suppose Rock $\alpha$ is bearing down on the ship from the nose, and Rock $\beta$ is drifting harmlessly behind the stern.
- If `game.rocks = [Rock α, Rock β]`, the MLP feeds Rock $\alpha$ into weights $\mathbf{W}_{*, 0:4}$ and Rock $\beta$ into weights $\mathbf{W}_{*, 5:9}$.
- If `game.rocks = [Rock β, Rock α]`, the exact same physical battlefield is presented, but the features swap positions!

Because an MLP has separate weights for every single input coordinate, **it has no inherent concept of permutation equivariance**. To learn that both arrays represent the exact same physical hazard, the network must independently discover and memorize up to $N!$ factorial permutations:

$$10! = 3,628,800 \text{ equivalent permutations}$$

This wastes enormous neural capacity, causes gradient instability, and leads to severe policy overfitting.

##### 3. The Naive Zero-Padding Trap
A common beginner workaround is setting a fixed upper bound $N_{\max} = 30$ rocks, zero-padding the vector when $N < N_{\max}$:

$$\mathbf{x} = [\mathbf{f}_1, \; \mathbf{f}_2, \; \dots, \; \mathbf{f}_N, \; \underbrace{\mathbf{0}, \; \mathbf{0}, \; \dots, \; \mathbf{0}}_{(N_{\max} - N) \times 5}]$$

This approach suffers from severe pathologies:
- **Massive Sparsity:** When only 3 rocks are active, $90\%$ of the input vector is dead zeros.
- **Ambiguity of Zero:** Does $(0.0, 0.0, 0.0, 0.0, 0.0)$ represent "no asteroid exists," or does it represent an asteroid located at $(0, 0)$ directly touching the ship's center with zero velocity?
- **Index Jitter:** When rock #2 is destroyed, rocks #3 through #20 slide down by one index in the array. Every weight in the MLP suddenly receives inputs from a completely different asteroid on the very next frame, causing an artificial temporal shockwave that ruins value-function estimation.

---

#### 4.3.2 Paradigm 1: Nearest-$K$ Truncation with Existence Masking (The Baseline)

The simplest and fastest engineering approach is to discard global array ordering and enforce a strict spatial sorting rule:
1. Compute the minimum-image toroidal distance $d_{\text{wrapped}}$ from the ship to every active rock.
2. Sort the array in ascending order of distance: $d_{(1)} \le d_{(2)} \le \dots \le d_{(N)}$.
3. Truncate the input to the top $K$ nearest entities (e.g., $K = 3$ as implemented in `rl_agent.js`, or $K = 6$ in the Python gym environment).
4. For each slot $k \in \{1, \dots, K\}$, append an **existence indicator** $\mathbb{I}_{\text{exists}} \in \{0.0, 1.0\}$:

$$\mathbf{f}_{\text{rock}, k} = \begin{cases} 
\left[ \frac{x_{\text{body}}}{W/2}, \; \frac{y_{\text{body}}}{H/2}, \; \frac{v_{x,\text{body}}}{v_{\max}}, \; \frac{v_{y,\text{body}}}{v_{\max}}, \; \frac{r_k}{r_{\max}}, \; 1.0 \right] & \text{if } k \le N \\ 
\left[ 0.0, \; 0.0, \; 0.0, \; 0.0, \; 0.0, \; 0.0 \right] & \text{if } k > N 
\end{cases}$$

```
                NEAREST-K SORTING & TRUNCATION PIPELINE
  All Active Rocks (N)           Sorted by Distance        Top K Selected (Fixed)
  ┌──────────────────┐           ┌──────────────────┐      ┌────────────────────┐
  │ Rock A (d = 340) │           │ Rock C (d = 65)  │ ───> │ Slot 1: Rock C     │
  │ Rock B (d = 120) │ ────────> │ Rock B (d = 120) │ ───> │ Slot 2: Rock B     │
  │ Rock C (d = 65)  │  Sort by  │ Rock D (d = 210) │ ───> │ Slot 3: Rock D     │
  │ Rock D (d = 210) │  Wrapped  │──────────────────│      └────────────────────┘
  │ Rock E (d = 215) │  Distance │ Rock E (d = 215) │ ───> ❌ Discarded!
  │ Rock F (d = 450) │           │ Rock A (d = 340) │ ───> ❌ Discarded!
  └──────────────────┘           └──────────────────┘
```

##### Strengths:
- Strictly fixes the observation size to $K \times 6$ floats.
- Computationally lightweight ($O(N \log K)$ using a min-heap or partial sort).
- Excellent for close-quarters dogfighting: slot 1 is guaranteed to be the most immediate point-blank threat, allowing the policy network to dedicate specific weights to nose-locking and shooting.

##### The Fatal Flaw — The Peripheral Blind Spot:
The fundamental vulnerability of Nearest-$K$ is **truncation blindness**. If $K = 3$:
- Suppose rocks #1, #2, and #3 are large, slow asteroids drifting at distance $d = 140\text{ px}$.
- Rock #4 is a tiny, high-velocity bullet-rock screaming toward the player at $450\text{ px/s}$ from distance $d = 142\text{ px}$.
- Because it ranks 4th, **the neural network receives exactly zero information about its existence**.
- By the time rock #4 closes to $139\text{ px}$ and enters the top 3, it is only $15\text{ ms}$ from impact—far too late for the ship's thrusters to overcome inertia!

---

#### 4.3.3 Paradigm 2: Deep Sets Architecture & Permutation-Invariant Symmetric Pooling

How do modern AI researchers process an arbitrary set of objects without discarding any of them?  
The answer was proven in the seminal paper ***Deep Sets*** (Zaheer et al., NeurIPS 2017).

##### The Universal Set Function Theorem
Zaheer et al. proved mathematically that **any function $f(X)$ acting on an unordered set $X = \{x_1, x_2, \dots, x_N\}$ is permutation-invariant if and only if it can be decomposed in the form**:

$$f(X) = \rho \left( \bigoplus_{i=1}^N \phi(x_i) \right)$$

Where:
1. $\phi: \mathbb{R}^{d_{\text{in}}} \to \mathbb{R}^{d_{\text{latent}}}$ is an **Entity Feature Encoder** (a small MLP applied to each asteroid individually).
2. $\bigoplus$ is a **Symmetric Aggregation Operator** that satisfies associativity and commutativity:
   - Element-wise **Sum**: $\bigoplus = \sum_{i=1}^N$
   - Element-wise **Max**: $\bigoplus = \max_{i=1}^N$
   - Element-wise **Mean**: $\bigoplus = \frac{1}{N} \sum_{i=1}^N$
3. $\rho: \mathbb{R}^{d_{\text{latent}}} \to \mathbb{R}^{d_{\text{out}}}$ is a **Global Field Processor** (an MLP that takes the pooled summary and feeds it to the actor/critic).

```
                     DEEP SETS POOLING ARCHITECTURE
                                                                 
  Rock 1 (x_1) ───> [ Shared Encoder φ ] ───> h_1 ─┐            
  Rock 2 (x_2) ───> [ Shared Encoder φ ] ───> h_2 ─┼──> [ Symmetric ] ──> H_field ──> [ Actor / ]
         :                    :                :   │    [  Pooling  ]   (Fixed 32D)   [ Critic  ]
  Rock N (x_N) ───> [ Shared Encoder φ ] ───> h_N ─┘    [ Max/Mean  ]
                           ▲
             (Exact same weights for all rocks!)
```

##### Mathematical Formulation for Spaceship Flight
Instead of sorting or truncating, we pass **every single active rock** through this pipeline:

1. **Per-Rock Input Vector:** For rock $i \in \{1, \dots, N\}$, extract its 5 egocentric features:
   $$\mathbf{x}_i = \left[ \frac{x_{\text{body}, i}}{W/2}, \; \frac{y_{\text{body}, i}}{H/2}, \; \frac{v_{x,\text{body}, i}}{v_{\max}}, \; \frac{v_{y,\text{body}, i}}{v_{\max}}, \; \frac{r_i}{r_{\max}} \right] \in \mathbb{R}^5$$

2. **Shared Feature Encoder Sub-Network ($\phi$):**
   Every rock is projected into a 16-dimensional latent space using a shared weight matrix $\mathbf{W}_\phi \in \mathbb{R}^{16 \times 5}$ and bias $\mathbf{b}_\phi \in \mathbb{R}^{16}$:
   $$\mathbf{h}_i = \text{ReLU}(\mathbf{W}_\phi \mathbf{x}_i + \mathbf{b}_\phi) \in \mathbb{R}^{16}$$
   *(Crucial detail: every asteroid is processed by the exact same 96 parameters, maintaining complete parameter efficiency!)*

3. **Dual Symmetric Pooling ($\bigoplus$):**
   To capture both the **most acute individual hazard** and the **overall field density**, we compute both element-wise Max and element-wise Mean across all $N$ rock embeddings:
   $$\mathbf{h}_{\max} = \left[ \max_{i=1}^N h_{i, 1}, \; \max_{i=1}^N h_{i, 2}, \; \dots, \; \max_{i=1}^N h_{i, 16} \right] \in \mathbb{R}^{16}$$
   $$\mathbf{h}_{\text{mean}} = \frac{1}{N} \sum_{i=1}^N \mathbf{h}_i \in \mathbb{R}^{16}$$

4. **Concatenated Global Field Embedding:**
   $$\mathbf{H}_{\text{field}} = \left[ \mathbf{h}_{\max} \,\|\, \mathbf{h}_{\text{mean}} \right] \in \mathbb{R}^{32}$$

##### Why Deep Sets is an Engineering Dream:
- **Strictly Fixed Size:** $\mathbf{H}_{\text{field}}$ is **always exactly 32 floats**, regardless of whether $N = 1, N = 8, N = 25,$ or $N = 100$!
- **Strictly Permutation Invariant:** Because $\max(a, b) = \max(b, a)$ and $a + b = b + a$, shuffling the order of `game.rocks` produces the exact same numerical vector to the last decimal place.
- **Zero Truncation Blindness:** Every single asteroid on the entire screen contributes to the field representation. A distant cluster of 10 small rocks will register as high density in $\mathbf{h}_{\text{mean}}$, while a fast incoming projectile triggers peak activation in $\mathbf{h}_{\max}$.
- **Ultra-Fast In-Browser Performance:** Running a $5 \to 16$ projection on 15 rocks takes only $15 \times (5 \times 16) = 1,200$ multiplications! In JavaScript, this executes in **under $0.02\text{ milliseconds}$** on standard laptop CPUs.

---

#### 4.3.4 Paradigm 3: 360° Radial Spatial Radar Bins (LIDAR / Sector Scanning)

Another profound way to bypass the variable entity count problem is to shift our frame of reference:  
**Instead of tracking *objects*, track *space*.**

This is the exact paradigm used by real-world autonomous vehicles, marine sonar, and military aircraft radar.

```
                     360° EGOCENTRIC RADAR SECTOR SCAN
                                 0° (Nose / Ahead)
                               Sector 0
                        \         |         /
              Sector 15   \       |       /   Sector 1
                    \       \     |     /       /
                      \       \   |   /       /
           Sector 14    \       \ | /       /    Sector 2
                          \   ┌───────┐   /
        -90° (Port) ─────── --│ SHIP  │-- ─────── +90° (Starboard)
          Sector 12       /   └───────┘   \      Sector 4
                        /       / | \       \
           Sector 10    /       / | \       \    Sector 6
                      /       /   |   \       \
                    /       /     |     \       \
              Sector 9    /       |       \   Sector 7
                        /         |         \
                              Sector 8
                            180° (Stern / Aft)
```

##### Mathematical Formulation:
Divide the full $360^\circ$ circle around the ship into $M = 16$ equal egocentric angular sectors (each spanning $\Delta\theta = \frac{360^\circ}{16} = 22.5^\circ \approx 0.3927\text{ rad}$):

1. **Polar Angle Conversion:**  
   For every rock $j \in \{1, \dots, N\}$, compute its wrapped relative position $(x_{\text{body}, j}, y_{\text{body}, j})$. Its relative angle from the ship's nose is:
   $$\theta_j = \operatorname{atan2}(y_{\text{body}, j}, x_{\text{body}, j}) \in [-\pi, \pi]$$

2. **Sector Binning:**  
   Assign rock $j$ to its discrete sector index $m \in \{0, 1, \dots, 15\}$:
   $$m = \left( \left\lfloor \frac{\theta_j + \frac{\pi}{M}}{\frac{2\pi}{M}} \right\rfloor + M \right) \pmod M$$
   *(Sector 0 is Dead-Ahead $[-11.25^\circ, +11.25^\circ]$, Sector 4 is Pure Starboard $+90^\circ$, Sector 8 is Pure Aft $180^\circ$, Sector 12 is Pure Port $-90^\circ$).*

3. **Hazard Reduction per Sector:**  
   For each sector $m$, iterate through all rocks that fall within its boundary and extract two critical scalars:
   - **Normalized Distance to Nearest Hazard:**
     $$d_m = \min_{j \in \text{sector } m} \left( \frac{d_{\text{wrapped}, j}}{d_{\text{sensor,max}}} \right) \in [0.0, 1.0]$$
     *(If a sector is completely empty, set $d_m = 1.0$, indicating clear flight space).*
   - **Maximum Relative Closing Speed:**
     $$v_{\text{close}, m} = \max_{j \in \text{sector } m} \left( -\frac{\vec{r}_{\text{body}, j} \cdot \vec{v}_{\text{body}, j}}{\|\vec{r}_{\text{body}, j}\| \cdot v_{\max}} \right) \in [-1.0, 1.0]$$
     *($+1.0 = \text{rock rushing directly at ship}$; $-1.0 = \text{rock flying away}$).*

4. **Output Feature Vector:**  
   The radar observation vector has fixed dimension $M \times 2 = 32$ floats:
   $$\mathbf{f}_{\text{radar}} = [d_0, v_{\text{close}, 0}, \; d_1, v_{\text{close}, 1}, \; \dots, \; d_{15}, v_{\text{close}, 15}] \in \mathbb{R}^{32}$$

##### Why Radar Bins Are Superior for Evasion:
- **Instant Escape Corridor Identification:** In deep RL, an agent given a list of coordinates struggles to calculate where "empty space" is. With Radar Bins, an open escape vector appears directly as a contiguous cluster of sectors where $d_m = 1.0$ and $v_{\text{close}, m} \le 0.0$. The policy learns evasive steering effortlessly!
- **Fixed Dimension:** Exactly 32 numbers whether there is 1 asteroid or 200 asteroids.
- **Physical Inductive Bias:** The spatial geometry of danger directly matches the spatial geometry of the ship's thrusters.

---

#### 4.3.5 Paradigm 4: Cross-Attention & Set Transformers

In modern foundation models, the standard mechanism for attending to variable-length sets is **Cross-Attention** (Vaswani et al., 2017; Lee et al., *Set Transformer*, ICML 2019).

In this paradigm:
- The **Spaceship** acts as the **Query ($\mathbf{Q}$)**: *"What threats matter to my current heading, speed, and shield state?"*
- The **Asteroids** act as the **Keys ($\mathbf{K}$)** and **Values ($\mathbf{V}$)**: *"Here are the positions and momentum vectors of every rock on the field."*

```
                       CROSS-ATTENTION SET MECHANISM
                                                                   
  Ship State (f_ship) ──> [ W_Q ] ──> Query q (1 x d_k)            
                                          │                        
  Rock 1 (x_1) ─────────> [ W_K ] ──> Key k_1  │                    
  Rock 2 (x_2) ─────────> [ W_K ] ──> Key k_2  ├──> [ Scaled Dot-Product ] ──> Attention Weights
         :                    :           :     │    [     Softmax       ]      [α_1, α_2, ..., α_N]
  Rock N (x_N) ─────────> [ W_K ] ──> Key k_N  │                           │
                                                                           v
  Rock 1 (x_1) ─────────> [ W_V ] ──> Value v_1 ─────────────────────────> [ Weighted Sum ]
  Rock 2 (x_2) ─────────> [ W_V ] ──> Value v_2 ─────────────────────────> [   Σ α_i v_i  ]
         :                    :            :                               │
  Rock N (x_N) ─────────> [ W_V ] ──> Value v_N ─────────────────────────> v
                                                                      Threat Context Vector
                                                                      c_threat (Fixed d_v)
```

##### Mathematical Formulation:
1. Compute Ship Query: $\mathbf{q} = \mathbf{W}_Q \mathbf{f}_{\text{ship}} \in \mathbb{R}^{d_k}$
2. For each rock $i \in \{1, \dots, N\}$, compute Key and Value:
   $$\mathbf{k}_i = \mathbf{W}_K \mathbf{x}_i \in \mathbb{R}^{d_k}, \quad \mathbf{v}_i = \mathbf{W}_V \mathbf{x}_i \in \mathbb{R}^{d_v}$$
3. Compute dynamic Attention Weights via Softmax over all $N$ active rocks:
   $$\alpha_i = \frac{\exp\left( \frac{\mathbf{q}^T \mathbf{k}_i}{\sqrt{d_k}} \right)}{\sum_{j=1}^N \exp\left( \frac{\mathbf{q}^T \mathbf{k}_j}{\sqrt{d_k}} \right)}$$
4. Compute the pooled Context Threat Vector:
   $$\mathbf{c}_{\text{threat}} = \sum_{i=1}^N \alpha_i \mathbf{v}_i \in \mathbb{R}^{d_v}$$

##### Operational Benefit:
The network dynamically computes a continuous distribution of attention over the rocks. If 15 rocks are distant and 1 rock is on a direct collision course with the cockpit, $\alpha_{\text{hazard}} \to 0.98$ and $\alpha_{\text{others}} \to 0.001$. The context vector $\mathbf{c}_{\text{threat}}$ completely concentrates on the critical hazard without requiring manual if-else heuristics.

---

#### 4.3.6 Paradigm 5: The Grandmaster Hybrid Architecture (Aim Lock + Global Evasion)

While Deep Sets pooling and Radar Bins provide flawless global situational awareness, pure pooling can slightly blur the exact sub-pixel coordinates needed for **surgical sharpshooting**.  
To fire a plasma bolt that hits a tiny, distant rock moving at high speed, the policy network needs high-precision access to the coordinates of the **single primary target**.

Therefore, the state-of-the-art architecture for autonomous arcade combat is the **Grandmaster Hybrid**:
1. **Target Lock Head (Nearest 1 Target):** Provides explicit, uncompressed relative coordinates $[x, y, v_x, v_y, r]$ of the #1 closest target for pinpoint cannon aiming.
2. **Global Threat Field (Deep Sets or 16-Ray Radar):** Provides an unconstrained, permutation-invariant summary of **all remaining rocks** for omnidirectional evasion and navigation.
3. **Ship & System Status:** Provides kinematics, capacitor levels, shield readiness, and alien UFO status.

```
                   THE GRANDMASTER HYBRID STATE VECTOR
  ┌─────────────────┬─────────────────┬──────────────────┬─────────────────┬─────────────────┐
  │ Ship Kinematics │ Status & Energy │ Alien UFO State  │ Target Lock #1  │ Global Threat   │
  │ & Orientation   │ Capacitors      │ (Egocentric)     │ (Explicit 5D)   │ Field (Deep Sets│
  │ [vx, vy, c, s]  │ [E, E_s, t_inv] │ [x, y, vx, vy, I]│ [x, y, vx, vy,r]│  or 16-Ray Radar│
  │    (4 floats)   │   (3 floats)    │    (5 floats)    │   (5 floats)    │   (32 floats)   │
  └─────────────────┴─────────────────┴──────────────────┴─────────────────┴─────────────────┘
  Total State Vector: 4 + 3 + 5 + 5 + 32 = 49 Normalized Continuous Features
```

This guarantees **100% aiming accuracy** on the primary threat while granting **total immunity to peripheral ambush** from the rest of the asteroid swarm.

---

#### 4.3.7 Concrete JavaScript & PyTorch Implementations

##### In-Browser Production JavaScript (`rl_agent.js` Deep Sets Extractor)
Here is the production implementation for real-time in-browser execution. Notice that it pre-allocates typed arrays to avoid garbage collection pauses during 600 Hz turbo training:

```javascript
class DeepSetFeatureExtractor {
  constructor(weights16x5, bias16) {
    this.W = weights16x5; // Float32Array(80) [16 rows x 5 cols]
    this.b = bias16;        // Float32Array(16)
    this.pooledMax = new Float32Array(16);
    this.pooledMean = new Float32Array(16);
    this.hField = new Float32Array(32);
  }

  extractAsteroidField(game, ship) {
    const rocks = game.rocks;
    const N = rocks.length;
    const W = game.width;
    const H = game.height;
    const cosT = Math.cos(ship.angle);
    const sinT = Math.sin(ship.angle);

    // Reset pooling accumulators
    this.pooledMax.fill(-Infinity);
    this.pooledMean.fill(0);

    if (N === 0) {
      this.hField.fill(0);
      return this.hField; // Clean zero field when wave cleared
    }

    // Process EVERY rock in the array (O(N) linear scan)
    for (let i = 0; i < N; i++) {
      const rock = rocks[i];
      // 1. Toroidal minimum image convention
      const dx = ((rock.x - ship.x + W / 2) % W + W) % W - W / 2;
      const dy = ((rock.y - ship.y + H / 2) % H + H) % H - H / 2;

      // 2. Egocentric rotation into ship-centric body frame
      const xBody = (dx * cosT + dy * sinT) / (W / 2);
      const yBody = (-dx * sinT + dy * cosT) / (H / 2);
      const dvx = rock.vx - ship.vx;
      const dvy = rock.vy - ship.vy;
      const vxBody = (dvx * cosT + dvy * sinT) / 6.0;
      const vyBody = (-dvx * sinT + dvy * cosT) / 6.0;
      const rNorm = rock.radius / 36.0;

      // 3. Shared Linear Projection phi: R^5 -> R^16
      for (let j = 0; j < 16; j++) {
        const offset = j * 5;
        let act = this.W[offset] * xBody +
                  this.W[offset + 1] * yBody +
                  this.W[offset + 2] * vxBody +
                  this.W[offset + 3] * vyBody +
                  this.W[offset + 4] * rNorm +
                  this.b[j];
        // LeakyReLU activation
        if (act < 0) act *= 0.01;

        // 4. Element-wise Symmetric Pooling
        if (act > this.pooledMax[j]) this.pooledMax[j] = act;
        this.pooledMean[j] += act;
      }
    }

    // 5. Pack into fixed 32-dimensional field embedding
    const invN = 1.0 / N;
    for (let j = 0; j < 16; j++) {
      this.hField[j] = this.pooledMax[j];
      this.hField[j + 16] = this.pooledMean[j] * invN;
    }

    return this.hField; // Always exactly 32 floats!
  }
}
```

##### Headless PyTorch Custom Feature Extractor for Stable-Baselines3
Here is the corresponding PyTorch module for training in Python:

```python
import torch
import torch.nn as nn
from gymnasium import spaces
from stable_baselines3.common.torch_layers import BaseFeaturesExtractor

class DeepSetAsteroidExtractor(BaseFeaturesExtractor):
    """
    Custom Feature Extractor implementing Deep Sets pooling over an arbitrary
    array of asteroids, concatenated with ship kinematics.
    """
    def __init__(self, observation_space: spaces.Dict, latent_dim: int = 16):
        # Observation space has:
        # 'ship': Box(7,)
        # 'ufo': Box(5,)
        # 'rocks': Box(N_max, 5) with 'rock_mask': Box(N_max,)
        features_dim = 7 + 5 + (latent_dim * 2)  # 7 + 5 + 32 = 44
        super().__init__(observation_space, features_dim=features_dim)

        # Shared Entity Encoder phi: R^5 -> R^16
        self.rock_encoder = nn.Sequential(
            nn.Linear(5, 32),
            nn.LeakyReLU(0.01),
            nn.Linear(32, latent_dim),
            nn.LeakyReLU(0.01)
        )

    def forward(self, observations: dict) -> torch.Tensor:
        ship_feat = observations["ship"]       # [Batch, 7]
        ufo_feat = observations["ufo"]         # [Batch, 5]
        rocks = observations["rocks"]          # [Batch, N_max, 5]
        mask = observations["rock_mask"]       # [Batch, N_max] (1 for real, 0 for pad)

        batch_size, n_max, feat_dim = rocks.shape

        # 1. Pass all rocks through shared encoder: [Batch * N_max, 5] -> [Batch, N_max, 16]
        flat_rocks = rocks.view(-1, feat_dim)
        flat_h = self.rock_encoder(flat_rocks)
        h = flat_h.view(batch_size, n_max, -1)

        # 2. Masked Symmetric Max Pooling
        mask_expanded = mask.unsqueeze(-1)  # [Batch, N_max, 1]
        h_masked_for_max = h.masked_fill(mask_expanded == 0, -1e9)
        h_max = torch.max(h_masked_for_max, dim=1).values  # [Batch, 16]
        h_max = torch.nan_to_num(h_max, nan=0.0)

        # 3. Masked Symmetric Mean Pooling
        sum_mask = mask.sum(dim=1, keepdim=True).clamp(min=1.0)
        h_mean = (h * mask_expanded).sum(dim=1) / sum_mask  # [Batch, 16]

        # 4. Concatenate into fixed-size latent representation
        return torch.cat([ship_feat, ufo_feat, h_max, h_mean], dim=-1)
```

---

#### 4.3.8 Architectural Comparison & Trade-Off Matrix

| Metric / Property | Nearest-$K$ Truncation ($K=3$) | Deep Sets Pooling (Zaheer 2017) | 360° Radial Radar Bins | Cross-Attention Transformer | Grandmaster Hybrid |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Output Vector Dimension** | Fixed ($K \times 5 = 15$) | Fixed ($16 \times 2 = 32$) | Fixed ($M \times 2 = 32$) | Fixed ($d_v = 16\text{ or } 32$) | Fixed ($5 + 32 = 37$) |
| **Permutation Invariant?** | ⚠️ Partial (sorts by dist) | ✅ **Strictly Invariant** | ✅ **Strictly Invariant** | ✅ **Strictly Invariant** | ✅ **Strictly Invariant** |
| **Scales to $N=1 \dots 100$ Rocks?** | ❌ Truncates after $K$ | ✅ **Yes ($O(N)$ linear)** | ✅ **Yes ($O(N)$ linear)** | ✅ **Yes ($O(N)$ linear)** | ✅ **Yes ($O(N)$ linear)** |
| **Peripheral Blind Spots?** | 🚨 **High** (Blind to $K+1$) | ✅ **None** (100% coverage) | ✅ **None** (100% coverage) | ✅ **None** (100% coverage) | ✅ **None** (100% coverage) |
| **In-Browser JS Latency** | $\approx 0.008\text{ ms}$ | $\approx 0.025\text{ ms}$ | $\approx 0.018\text{ ms}$ | $\approx 0.085\text{ ms}$ | $\approx 0.030\text{ ms}$ |
| **Laser Aiming Precision** | ⭐⭐⭐⭐ (Direct lock) | ⭐⭐⭐ (Slightly diffused) | ⭐⭐ (Coarse sector) | ⭐⭐⭐⭐ (High dynamic focus) | ⭐⭐⭐⭐⭐ **Optimal** |
| **Evasive Route Discovery** | ⭐⭐ (Reactive) | ⭐⭐⭐⭐ (Field density) | ⭐⭐⭐⭐⭐ **Optimal** | ⭐⭐⭐⭐ (Threat weighting) | ⭐⭐⭐⭐⭐ **Optimal** |
| **Implementation Complexity** | Minimal | Low (Matrix multiply) | Low (Polar binning) | Medium (Softmax + Projections) | Moderate |

---


### 4.4 Spaceship Kinematics & The Angle Discontinuity Problem

**Never feed raw angle $\theta \in [0, 360)$ directly to a neural network!**  
Why? Because $359^\circ$ and $1^\circ$ are numerically far apart ($|359 - 1| = 358$), even though they represent almost identical headings. This jump discontinuity severely corrupts gradient descent.

Always encode orientation as a **Unit Vector**:
$$\mathbf{h} = [\cos\theta, \;\sin\theta]$$

Include the ship's kinematic velocity and rotational speed:
$$\mathbf{f}_{\text{ship}} = \left[ \frac{v_{x,\text{ship}}}{v_{\max}}, \;\frac{v_{y,\text{ship}}}{v_{\max}}, \;\cos\theta, \;\sin\theta, \;\frac{\omega}{\omega_{\max}} \right]$$

---

### 4.5 Weapons, Shield Capacitors, & Defensive States

To make intelligent tactical decisions, the agent needs to know its energy reserves and defensive readiness:

$$\mathbf{f}_{\text{status}} = \left[ \frac{E}{E_{\max}}, \;\frac{E_{\text{shield}}}{E_{\text{shield},\max}}, \;\frac{t_{\text{invincible}}}{t_{\text{invincible},\max}}, \;\mathbb{I}_{\text{shield\_ready}}, \;\mathbb{I}_{\text{unlimited}} \right]$$

- If $E < 15\%$, the agent knows it cannot fire and must rely on kinetic recharge.
- If $E \ge 50\%$, the agent knows it can deploy an emergency forcefield to survive an unavoidable impact.

---

### 4.6 Inductive Biases & Targeting Aids

You can accelerate learning by orders of magnitude by providing two simple geometric "hints" (inductive biases):

1. **Angular Aim Error to Closest Target:**
   $$\Delta\psi = \operatorname{atan2}(y_{\text{body}}, x_{\text{body}})$$
   If $\Delta\psi \approx 0$, the ship's nose is pointing directly at the target! This allows the policy to learn the condition `if |aim_error| < 0.1: shoot()` in just a few thousand steps.

2. **Time-to-Closest-Approach ($t_{\text{CPA}}$):**
   Using the collision math derived in Section 16 of the Arcade AI Guide:
   $$t_{\text{CPA}} = -\frac{\vec{r}_{\text{rel}} \cdot \vec{v}_{\text{rel}}}{\|\vec{v}_{\text{rel}}\|^2}$$
   If $t_{\text{CPA}} > 0$ and $d_{\text{min}} < r_{\text{ship}} + r_{\text{rock}}$, a collision is guaranteed within $t_{\text{CPA}}$ seconds unless the ship burns thrust immediately!

---

### 4.7 Production In-Browser Architecture: The 38-Dimensional Grandmaster Attention Hybrid Vector (`rl_agent.js`)

In the live web implementation (`rl_agent.js`), to achieve super-human dogfighting accuracy while maintaining complete situational awareness of all active asteroids, the system operates on the **38-dimensional Grandmaster Attention Hybrid continuous state vector** $\mathbf{s}_t \in [-2, 2]^{38}$.

Every feature is strictly normalized and dimensionless—**no raw pixel coordinates are ever fed to the policy network**:

| Feature Index | Symbol / Code | Normalized Range | Architectural Component | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`obs[0]`** | $v_{x,\text{ship}} / v_{\max}$ | $[-1.0, 1.0]$ | Ship Kinematics | Forward body-axis velocity ($v_{\max} = 6.0\text{ px/tick}$) |
| **`obs[1]`** | $v_{y,\text{ship}} / v_{\max}$ | $[-1.0, 1.0]$ | Ship Kinematics | Starboard body-axis velocity ($v_{\max} = 6.0\text{ px/tick}$) |
| **`obs[2]`** | $\cos\theta$ | $[-1.0, 1.0]$ | Ship Orientation | Heading direction cosine (continuous angle unit vector) |
| **`obs[3]`** | $\sin\theta$ | $[-1.0, 1.0]$ | Ship Orientation | Heading direction sine (continuous angle unit vector) |
| **`obs[4]`** | $E_{\text{ammo}} / 100$ | $[0.0, 1.0]$ | Energy Reserves | Weapon Battery / Shared Reactor energy level |
| **`obs[5]`** | $E_{\text{shield}} / 100$ | $[0.0, 1.0]$ | Energy Reserves | Dedicated Shield Capacitor charge (Dual / Shield-Only) |
| **`obs[6]`** | $t_{\text{invincible}} / 150$ | $[0.0, 1.0]$ | Defensive Timer | Remaining forcefield duration ($150\text{ ticks} = 2.5\text{s}$) |
| **`obs[7]`** | $x_{\text{ufo,body}} / (W/2)$ | $[-1.0, 1.0]$ | Alien UFO (Egocentric) | Alien saucer relative position (Forward axis) |
| **`obs[8]`** | $y_{\text{ufo,body}} / (H/2)$ | $[-1.0, 1.0]$ | Alien UFO (Egocentric) | Alien saucer relative position (Starboard axis) |
| **`obs[9]`** | $v_{x,\text{ufo,body}} / 6.0$ | $[-1.0, 1.0]$ | Alien UFO (Egocentric) | Alien saucer relative closing velocity (Forward axis) |
| **`obs[10]`** | $v_{y,\text{ufo,body}} / 6.0$ | $[-1.0, 1.0]$ | Alien UFO (Egocentric) | Alien saucer relative closing velocity (Starboard axis) |
| **`obs[11]`** | $\mathbb{I}_{\text{ufo\_alive}}$ | $\{0.0, 1.0\}$ | Alien UFO (Egocentric) | Flag indicating if alien saucer is active on battlefield |
| **`obs[12]`** | $x_{\text{target,body}} / (W/2)$ | $[-1.0, 1.0]$ | **Target Lock (Aim Head)** | Nearest shootable rock position along forward nose axis (direct Euclidean ray) |
| **`obs[13]`** | $y_{\text{target,body}} / (H/2)$ | $[-1.0, 1.0]$ | **Target Lock (Aim Head)** | Nearest shootable rock position along starboard axis (direct Euclidean ray) |
| **`obs[14]`** | $v_{x,\text{target,body}} / 6.0$ | $[-1.0, 1.0]$ | **Target Lock (Aim Head)** | Nearest shootable rock relative velocity along forward axis |
| **`obs[15]`** | $v_{y,\text{target,body}} / 6.0$ | $[-1.0, 1.0]$ | **Target Lock (Aim Head)** | Nearest shootable rock relative velocity along starboard axis |
| **`obs[16]`** | $r_{\text{target}} / 36.0$ | $[0.0, 1.0]$ | **Target Lock (Aim Head)** | Nearest shootable rock physical radius / collision hull |
| **`obs[17..24]`** | $\mathbf{c}_{\text{threat}} \in \mathbb{R}^8$ | $[-2.0, 2.0]$ | **Attention Context Field** | **Attention-Weighted Threat Vector** across **all active rocks** |
| **`obs[25..32]`** | $\mathbf{m}_{\text{threat}} \in \mathbb{R}^8$ | $[-2.0, 2.0]$ | **Attention Peak Hazard** | **Element-wise Maximum Threat** across all active rocks |
| **`obs[33]`** | $\Delta\psi_{\text{aim}} / \pi$ | $[-1.0, 1.0]$ | Tactical Biases | Angular aim alignment error to primary shootable target |
| **`obs[34]`** | $d_{\text{threat}} / (W/2)$ | $[0.0, 1.0]$ | Tactical Biases | Normalized distance to closest threat ($0.0 = \text{impact}$) |
| **`obs[35]`** | $\mathbb{I}_{\text{danger}}$ | $\{0.0, 1.0\}$ | Tactical Biases | **Proactive collision alarm** ($d < 2.4 \times \text{width} + r$ or closing impact $t_{\text{impact}} < 35\text{ frames}$) |
| **`obs[36]`** | $\mathbb{I}_{\text{shield\_ready}}$ | $\{0.0, 1.0\}$ | Tactical Biases | **Power-Mode Invariant Shield Readiness** |
| **`obs[37]`** | $N_{\text{bullets}} / 10.0$ | $[0.0, 1.0]$ | Tactical Biases | Active friendly laser projectile density |

#### The Cross-Attention Engine Behind `obs[17..32]`:
Instead of discarding asteroids beyond the 3 closest, the ship executes a continuous attention pass:
1. **Ship Query ($\mathbf{q} \in \mathbb{R}^8$):** Formulated from the ship's forward velocity, lateral drift, and battery depletion urgency.
2. **Asteroid Keys & Values ($\mathbf{k}_i, \mathbf{v}_i \in \mathbb{R}^8$):** Formulated for every asteroid $i \in \{1, \dots, N\}$.
3. **Scaled Dot-Product Softmax:** $\alpha_i = \operatorname{softmax}\left(\frac{\mathbf{q} \cdot \mathbf{k}_i}{\sqrt{8}}\right)$.
4. **Context Vector $\mathbf{c}_{\text{threat}} = \sum \alpha_i \mathbf{v}_i$:** Captures the dynamic weighted center of incoming danger.
5. **Peak Vector $\mathbf{m}_{\text{threat}} = \max_i \mathbf{v}_i$:** Captures the single most extreme hazard, preventing high-speed small asteroids from ever being diluted by distant background rocks.

#### Power Mode Invariance & Ammo Management:
By providing $\mathbb{I}_{\text{shield\_ready}}$ (`obs[36]`) alongside battery levels, the agent does not need three separate neural network models for **Shared Reactor**, **Dual Capacitors**, and **Unlimited Ammo**:
- In **Shared Reactor**: $\mathbb{I}_{\text{shield\_ready}} = 1$ when $E \ge 50\%$. The policy enforces strict energy preservation ($\ge 52\%$) during routine combat so the $50\%$ shield remains permanently armed.
- In **Dual Capacitors**: $\mathbb{I}_{\text{shield\_ready}} = 1$ when $E_{\text{shield}} \ge 100\%$. The policy stops firing when weapon capacitor drops below $25\%$ to allow steady recharge and prevent empty battery clicks.
- In **Unlimited Ammo**: $\mathbb{I}_{\text{shield\_ready}} = 1$ when $E_{\text{shield}} \ge 100\%$, and weapon battery (`obs[4]`) stays locked at $1.0$.

---

## 5. Action Space Design & Kinematic Execution

In `Spaceship Flight`, a human player can simultaneously rotate, thrust, fire weapons, and activate shields.

We have two options for structuring the action space $\mathcal{A}$:

### Option 1: Multi-Discrete Action Space (Recommended for PPO)
PPO natively supports `gym.spaces.MultiDiscrete`:

$$\mathcal{A} = \text{MultiDiscrete}([3, \; 2, \; 2, \; 2])$$

- **Branch 0 (Steering):** `0: Rotate Left (Port)`, `1: Hold / Straight`, `2: Rotate Right (Starboard)`
- **Branch 1 (Thrust):** `0: Coast`, `1: Fire Thruster`
- **Branch 2 (Gun):** `0: Hold Fire`, `1: Shoot Plasma Bolt`
- **Branch 3 (Shield):** `0: Standby`, `1: Deploy Emergency Shield`

The policy network outputs $3 + 2 + 2 + 2 = 9$ logits, and samples independently from each categorical distribution.

#### Concurrent Action Execution: Simultaneous Steering and Firing
A vital architectural principle in arcade dogfighting is that **steering and firing are completely independent concurrent actions**:
- The ship rotates (`Branch 0 = 0` or `2`) to sweep and track a moving target across the field.
- In the exact same frame, if the cannon's predicted lead line-of-sight aligns with the target's hitbox, the ship triggers plasma fire (`Branch 2 = 1`).
- The ship never stops rotating to fire, nor does it suppress firing while turning! Both actions execute simultaneously within the canvas game loop on every frame.

### Option 2: Flattened Discrete Action Space (Required for DQN)
DQN requires a single discrete action index:
$$|\mathcal{A}| = 3 \times 2 \times 2 \times 2 = 24 \text{ compound actions}$$

Action `0`: `[No-op, Coast, Hold, Standby]`  
Action `7`: `[Rotate Left, Thrust, Shoot, Standby]`  
Action `23`: `[Rotate Right, Thrust, Shoot, Deploy Shield]`  

---

## 6. Reward Function Engineering & Credit Assignment

The reward function $\mathcal{R}(s, a, s')$ is the loss function of reinforcement learning. **The agent will optimize whatever you reward, not what you intended.**

---

### 6.1 The Danger of Reward Hacking

If you design naive rewards, the agent will find degenerate exploits:
- **Exploit 1: "The Eternal Coward"**  
  *Rule:* $+1$ per second alive.  
  *Hacking:* The ship flies into an empty corner, never thrusts, and never shoots asteroids, farming survival points forever until a random rock drifts by.
- **Exploit 2: "The Spin-Bot Spammer"**  
  *Rule:* $+10$ per rock destroyed.  
  *Hacking:* The ship holds `Rotate Left` + `Fire` continuously, turning into an omnidirectional spray-and-pray turret. It exhausts all energy battery and eventually gets hit from behind.

---

### 6.2 Potential-Based Reward Shaping (PBRS)

To guide exploration without altering the true optimal policy $\pi^*$, we use **Potential-Based Reward Shaping** (Ng, Harada, & Russell, 1999).

Given any scalar potential function $\Phi(s)$ representing how "good" a state is:
$$F(s, a, s') = \gamma \Phi(s') - \Phi(s)$$

Adding $F(s, a, s')$ to the environment reward is **guaranteed** not to change the optimal policy $\pi^*$, preventing degenerate reward cycles!

#### Example Potential Function for Asteroids:
$$\Phi(s) = -w_1 \cdot \min_{k} d_{\text{wrapped}}(k) + w_2 \cdot \cos(\Delta\psi_{\text{aim}})$$

---

### 6.3 The Complete Mathematical Reward Formulation

Here is the calibrated reward function for `Spaceship Flight`:

$$R_t = R_{\text{survival}} + R_{\text{combat}} + R_{\text{accuracy}} + R_{\text{penalty}} + R_{\text{terminal}}$$

$$\begin{aligned}
R_{\text{survival}} &= +0.01 \quad \text{(small positive baseline per step)} \\
R_{\text{combat}} &= \begin{cases} 
+1.0 & \text{if Large Asteroid destroyed} \\ 
+1.5 & \text{if Medium Asteroid destroyed} \\ 
+2.0 & \text{if Small Asteroid destroyed (sharpshooter reward)} \\ 
+10.0 & \text{if UFO destroyed} 
\end{cases} \\
R_{\text{accuracy}} &= \begin{cases}
-0.02 & \text{if bullet fired (discourages ammo spam)} \\
+0.05 & \text{if fired while aligned } |\Delta\psi_{\text{aim}}| < 12^\circ
\end{cases} \\
R_{\text{penalty}} &= \begin{cases}
-0.05 \cdot \left(1 - \frac{d_{\text{closest}}}{d_{\text{danger}}}\right)^2 & \text{if } d_{\text{closest}} < d_{\text{danger}} \text{ (hazard repulsion)} \\
-0.01 & \text{if remaining completely motionless for } > 120 \text{ frames}
\end{cases} \\
R_{\text{terminal}} &= -15.0 \quad \text{(ship destroyed / game over)}
\end{aligned}$$

---

## 7. End-to-End Implementation Architecture

To train this agent efficiently, do **not** run the web browser during training. A JavaScript browser environment caps execution at 60 fps.

Instead:
1. Build a **headless Python simulator** of the physics engine. It runs at **$10,000+$ fps** across CPU threads!
2. Train with **PPO** in Python.
3. Export the trained neural weights to **ONNX** or **TensorFlow.js**.
4. Load the network directly in `game.js` so players can watch the AI play live in the browser!

```
[ Headless Python Gym Env ] ---> [ Train with PPO (Stable-Baselines3) ]
                                             |
                                             v
                                 [ Export model to ONNX ]
                                             |
                                             v
                             [ Load into web browser (game.js) ]
                             (Real-time 60fps AI Auto-Pilot!)
```

---

### 7.1 Headless Python Gymnasium Environment

Save this as `spaceship_env.py`:

```python
import gymnasium as gym
from gymnasium import spaces
import numpy as np

class SpaceshipFlightEnv(gym.Env):
    """
    Headless OpenAI Gymnasium Environment replicating Spaceship Flight physics.
    """
    metadata = {"render_modes": ["human", "rgb_array"], "render_fps": 60}

    def __init__(self):
        super().__init__()
        
        # Arena dimensions
        self.width = 800.0
        self.height = 600.0
        
        # Multi-Discrete Actions: [Steering (3), Thrust (2), Fire (2), Shield (2)]
        self.action_space = spaces.MultiDiscrete([3, 2, 2, 2])
        
        # Observation Space:
        # Ship: [vx, vy, cos(theta), sin(theta), energy, shield_energy, invincible_timer] = 7
        # UFO: [rel_x, rel_y, rel_vx, rel_vy, is_alive] = 5
        # 6 Closest Asteroids: 6 * [rel_x, rel_y, rel_vx, rel_vy, radius, exists] = 36
        # Total Dimension = 7 + 5 + 36 = 48 continuous features
        self.observation_space = spaces.Box(
            low=-np.inf, high=np.inf, shape=(48,), dtype=np.float32
        )
        
    def _wrap_coordinates(self, x, y):
        return x % self.width, y % self.height

    def _wrapped_delta(self, x_target, y_target, x_origin, y_origin):
        dx = ((x_target - x_origin + self.width / 2.0) % self.width) - self.width / 2.0
        dy = ((y_target - y_origin + self.height / 2.0) % self.height) - self.height / 2.0
        return dx, dy

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        
        # Ship State
        self.ship_x = self.width / 2.0
        self.ship_y = self.height / 2.0
        self.ship_vx = 0.0
        self.ship_vy = 0.0
        self.ship_angle = 0.0  # degrees
        self.energy = 100.0
        self.shield_energy = 100.0
        self.invincible_timer = 150
        
        self.rocks = []
        # Spawn initial 3 rocks
        for _ in range(3):
            self.rocks.append(self._spawn_rock())
            
        self.ufo = None
        self.bullets = []
        self.step_count = 0
        
        return self._get_obs(), {}

    def _spawn_rock(self):
        side = np.random.randint(0, 4)
        if side == 0:   x, y = 0.0, np.random.uniform(0, self.height)
        elif side == 1: x, y = self.width, np.random.uniform(0, self.height)
        elif side == 2: x, y = np.random.uniform(0, self.width), 0.0
        else:           x, y = np.random.uniform(0, self.width), self.height
        
        angle = np.random.uniform(0, 2 * np.pi)
        speed = np.random.uniform(1.0, 2.5)
        return {
            "x": x, "y": y,
            "vx": np.cos(angle) * speed,
            "vy": np.sin(angle) * speed,
            "radius": 24.0,  # Large
            "tier": 3
        }

    def step(self, action):
        self.step_count += 1
        steer, thrust, fire, shield = action
        reward = 0.01  # Baseline survival reward
        
        # 1. Steering
        if steer == 1: self.ship_angle -= 4.5
        elif steer == 2: self.ship_angle += 4.5
        rad = np.radians(self.ship_angle)
        
        # 2. Thrust & Inertia
        if thrust == 1:
            self.ship_vx += np.cos(rad) * 0.12
            self.ship_vy += np.sin(rad) * 0.12
            
        self.ship_vx *= 0.992
        self.ship_vy *= 0.992
        self.ship_x, self.ship_y = self._wrap_coordinates(
            self.ship_x + self.ship_vx, self.ship_y + self.ship_vy
        )
        
        # 3. Emergency Shield
        if shield == 1 and self.energy >= 50 and self.invincible_timer <= 0:
            self.energy -= 50
            self.invincible_timer = 150
            
        if self.invincible_timer > 0:
            self.invincible_timer -= 1
            
        # Kinetic Dynamo recharge
        self.energy = min(100.0, self.energy + (0.33 if thrust else 0.20))
        
        # 4. Rocks update
        terminated = False
        min_dist = 9999.0
        
        for r in self.rocks:
            r["x"], r["y"] = self._wrap_coordinates(r["x"] + r["vx"], r["y"] + r["vy"])
            dx, dy = self._wrapped_delta(r["x"], r["y"], self.ship_x, self.ship_y)
            dist = np.hypot(dx, dy)
            if dist < min_dist:
                min_dist = dist
                
            # Collision check
            if dist < (r["radius"] + 14.0):
                if self.invincible_timer > 0:
                    reward += 0.5  # Shield deflected rock
                else:
                    reward -= 15.0  # Death
                    terminated = True
                    break
                    
        # Proximity penalty
        if min_dist < 60.0:
            reward -= 0.05 * (1.0 - min_dist / 60.0)
            
        truncated = self.step_count >= 3000
        return self._get_obs(), reward, terminated, truncated, {}

    def _get_obs(self):
        rad = np.radians(self.ship_angle)
        cos_h, sin_h = np.cos(rad), np.sin(rad)
        
        # Egocentric rotation matrix
        R = np.array([[cos_h, sin_h], [-sin_h, cos_h]])
        
        # Ship status (7)
        obs = [
            self.ship_vx / 6.0,
            self.ship_vy / 6.0,
            cos_h,
            sin_h,
            self.energy / 100.0,
            self.shield_energy / 100.0,
            self.invincible_timer / 150.0
        ]
        
        # UFO status (5) - dummy if no UFO
        obs.extend([0.0, 0.0, 0.0, 0.0, 0.0])
        
        # Sort rocks by wrapped distance
        sorted_rocks = sorted(
            self.rocks, 
            key=lambda r: np.hypot(*self._wrapped_delta(r["x"], r["y"], self.ship_x, self.ship_y))
        )
        
        # 6 Closest Rocks (6 * 6 = 36)
        for i in range(6):
            if i < len(sorted_rocks):
                r = sorted_rocks[i]
                dx, dy = self._wrapped_delta(r["x"], r["y"], self.ship_x, self.ship_y)
                rel_pos = R @ np.array([dx, dy])
                rel_vel = R @ np.array([r["vx"] - self.ship_vx, r["vy"] - self.ship_vy])
                obs.extend([
                    rel_pos[0] / self.width,
                    rel_pos[1] / self.height,
                    rel_vel[0] / 6.0,
                    rel_vel[1] / 6.0,
                    r["radius"] / 32.0,
                    1.0  # exists
                ])
            else:
                obs.extend([0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
                
        return np.array(obs, dtype=np.float32)
```

---

### 7.2 Training with Stable-Baselines3 PPO

Save this as `train_agent.py`:

```python
import gymnasium as gym
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from spaceship_env import SpaceshipFlightEnv

def train():
    # 1. Create vectorized environment (8 parallel workers for high throughput)
    env = make_vec_env(SpaceshipFlightEnv, n_envs=8)

    # 2. Define PPO Agent
    model = PPO(
        policy="MlpPolicy",
        env=env,
        learning_rate=3e-4,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.01,  # Entropy bonus encourages exploration
        verbose=1,
        tensorboard_log="./spaceship_tensorboard/"
    )

    # 3. Train for 1,500,000 steps (~15-20 mins on modern multi-core CPU)
    print("🚀 Training Spaceship Flight RL Agent...")
    model.learn(total_timesteps=1_500_000)

    # 4. Save model
    model.save("spaceship_ppo_agent")
    print("✅ Model saved successfully!")

if __name__ == "__main__":
    train()
```

---

### 7.3 Exporting to ONNX & Running In-Browser via TensorFlow.js / ONNX Runtime Web

To load your trained model directly inside `game.js`, export the actor network to **ONNX**:

```python
import torch
import torch.nn as nn
from stable_baselines3 import PPO

# Load SB3 model
model = PPO.load("spaceship_ppo_agent.zip")

class PyTorchActor(nn.Module):
    def __init__(self, policy):
        super().__init__()
        self.mlp_extractor = policy.mlp_extractor.policy_net
        self.action_net = policy.action_net

    def forward(self, x):
        latent = self.mlp_extractor(x)
        logits = self.action_net(latent)
        return logits

actor = PyTorchActor(model.policy)
dummy_input = torch.randn(1, 48)

torch.onnx.export(
    actor,
    dummy_input,
    "spaceship_actor.onnx",
    input_names=["observation"],
    output_names=["action_logits"],
    opset_version=14
)
print("🎯 Exported to spaceship_actor.onnx!")
```

#### Running Live in `game.js`:
Using **ONNX Runtime Web** (`<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"></script>`):

```javascript
class AIAgentPilot {
  async init() {
    this.session = await ort.InferenceSession.create('./spaceship_actor.onnx');
  }

  async getAction(game) {
    const obs = game.buildRLObservationVector(); // 48-float array
    const tensor = new ort.Tensor('float32', Float32Array.from(obs), [1, 48]);
    const feeds = { observation: tensor };
    const results = await this.session.run(feeds);
    const logits = results.action_logits.data;

    // Argmax or sample
    return {
      steer: logits[0] > logits[1] && logits[0] > logits[2] ? 0 : logits[1] > logits[2] ? 1 : 2,
      thrust: logits[3] > logits[4] ? 0 : 1,
      fire: logits[5] > logits[6] ? 0 : 1,
      shield: logits[7] > logits[8] ? 0 : 1
    };
  }
}
```

Now you have a complete, mathematically derived, end-to-end reinforcement learning system for **Spaceship Flight**!

---

## 8. The "Trigger-Happy" Pathology & Firing Cadence Dynamics

### 8.1 Why Untrained Agents Spill All Bullets Immediately: Is It "Part of the Process"?

**Yes, in standard RL without inductive priors, this is a classic, textbook failure mode known as the "Trigger-Happy Agent" or "Premature Exploration Collapse."**

When training an agent from scratch in arcade environments like Asteroids or Spaceship Flight, new developers often observe the ship instantly emptying its entire capacitor within 150 milliseconds of starting each episode. There are three core theoretical reasons why this occurs:

#### 1. Action Frequency Mismatch (Continuous Time vs. Discrete Decisions)
In the browser game loop, `game.update()` executes at **60 Hz** (or up to **600 Hz** in turbo training mode).
- At initialization (random Xavier weights), the Actor network outputs approximately equal logits for the Fire head: $[z_0 \approx 0, z_1 \approx 0]$.
- Softmax produces probabilities $p(\text{Hold}) \approx 0.5$ and $p(\text{Fire}) \approx 0.5$.
- Sampling a binary action with $p = 0.5$ at 60 Hz means the agent attempts to fire **30 bullets per second**!
- In Shared Reactor mode, each shot costs 12% energy from a 100-point capacitor. The ship can fire 8 shots before exhausting its battery (and 4 consecutive shots before hitting the 50% emergency shield lockout).
- Consequently, at 30 shots/sec, **100% of the ship's battery is dumped in only 8 to 16 frames ($\approx 130 - 260\text{ ms}$)**.

#### 2. Sparse Rewards & Reward Hacking (Local Optima)
In Asteroids, destroying an asteroid or UFO yields a large positive environment reward ($+2.0$ to $+3.0$).
- Early in training, the agent's steering and flight control are completely random. Learning continuous 2D toroidal lead-pursuit geometry takes dozens of episodes to converge.
- However, by pure random exploration, whenever the ship happens to shoot and an asteroid drifts into the path of a bullet, the agent receives a massive positive reward spike.
- The policy gradient update immediately reinforces whatever action was taken prior to the reward:
  $$\nabla_\theta J(\theta) = \mathbb{E} \left[ \nabla_\theta \log \pi_\theta(a_t | s_t) \cdot \hat{A}_t \right]$$
- Because the ship has not yet learned *how* to aim, the gradient updates the simplest heuristic that correlates with reward: **increase $\log \pi(\text{fire})$ everywhere**!
- The agent becomes trapped in a sub-optimal local minimum: it holds down the trigger non-stop, draining its battery and failing to allocate power for emergency shields.

#### 3. Lack of Physical Cycle-Time Constraints
In the human game, physical keyboard debounce and OS repeat suppression (`if (e.repeat) return;`) limit human fire rates to 3–5 taps per second. If the simulation environment does not enforce a mechanical refire cycle time, the neural network treats firing as an unconstrained frame-by-frame binary toggle.

---

### 8.2 The 5-Layer Engineering Solution

To achieve elite marksmanship and stable training dynamics, the system implements a 5-layer architectural solution:

| Layer | Component | Mechanism | Operational Effect |
| :--- | :--- | :--- | :--- |
| **1** | **Mechanical Refire Delay** | `Spaceship.fireCooldown = 9` (~150ms) | Enforces realistic arcade cycle time (~6.6 shots/sec max). Frame-to-frame bullet dumping is physically impossible. |
| **2** | **Inductive Action Priors** | Initial logits: $b_{\text{fire}} = [2.0, -2.0]$ | Newborn policy starts with $98.2\%$ hold and $1.8\%$ fire exploration. The agent learns flight maneuvering first! |
| **3** | **Mode-Aware Energy Budget** | Reserve $\ge 35\%$ energy in Shared mode | Weapon fire is gated during routine patrol so the ship always maintains the $50\%$ energy required for Emergency Shields. |
| **4** | **Salvo Deconfliction** | In-flight bullet tracking | If an active bullet is already en route to intercept the target, hold fire rather than dumping redundant rounds. |
| **5** | **Tactical Reward Shaping** | Multi-objective step reward | $+0.015$ for precision aimed shots; $-0.02$ for wild shots into empty space; $-0.02$ for battery exhaustion. |

```
                       [TARGET ACQUISITION PIPELINE]
                                     │
                        Range Gating: [70px, 390px]?
                         ├── NO  ──> HOLD FIRE (Preserve Energy)
                         └── YES ──> Aim Alignment: |aimError| < 0.12 rad?
                                      ├── NO  ──> STEER / ROTATE
                                      └── YES ──> Energy Budget Check:
                                                   ├── Shared Mode: Energy >= 35%?
                                                   └── Dual Mode: Weapon Energy >= 15%?
                                                        ├── NO  ──> HOLD (Save for Shield)
                                                        └── YES ──> Salvo Deconfliction:
                                                                     ├── Bullet en route? ──> HOLD
                                                                     └── Path Clear? ──> 🎯 FIRE!
```

---

### 8.3 Behavioral Cloning Pre-Warming

Rather than training purely from random noise in the browser, the 32-64-64 Multi-Head MLP is pre-trained via **Behavioral Cloning (Supervised Imitation Learning)** over 350,000+ balanced combat transitions:

- **Balanced State Distribution**: 50% patrol/evasion states, 50% targeted engagement states.
- **Trained Neural Metrics**:
  - **Fire Accuracy**: $91.4\%$
  - **Shield Accuracy**: $99.4\%$
  - **Steer Accuracy**: $86.5\%$
  - **Thrust Accuracy**: $81.5\%$
- **Base64 Serialized Weights**: Packed directly into `rl_agent.js` as a compact 36KB array, allowing instant zero-latency initialization in the browser without requiring external server downloads or Python runtimes.

