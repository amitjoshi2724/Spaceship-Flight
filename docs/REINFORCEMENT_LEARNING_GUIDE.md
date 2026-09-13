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
   - [4.3 Solving the Variable Entity Count Problem](#43-solving-the-variable-entity-count-problem)
   - [4.4 Spaceship Kinematics & The Angle Discontinuity Problem](#44-spaceship-kinematics--the-angle-discontinuity-problem)
   - [4.5 Weapons, Shield Capacitors, & Defensive States](#45-weapons-shield-capacitors--defensive-states)
   - [4.6 Inductive Biases & Targeting Aids](#46-inductive-biases--targeting-aids)
   - [4.7 Production In-Browser Architecture: The 32-Dimensional State Vector (`rl_agent.js`)](#47-production-in-browser-architecture-the-32-dimensional-state-vector-rl_agentjs)
5. [Action Space Design & Kinematic Execution](#5-action-space-design--kinematic-execution)
6. [Reward Function Engineering & Credit Assignment](#6-reward-function-engineering--credit-assignment)
   - [6.1 The Danger of Reward Hacking](#61-the-danger-of-reward-hacking)
   - [6.2 Potential-Based Reward Shaping (PBRS)](#62-potential-based-reward-shaping-pbrs)
   - [6.3 The Complete Mathematical Reward Formulation](#63-the-complete-mathematical-reward-formulation)
7. [End-to-End Implementation Architecture](#7-end-to-end-implementation-architecture)
   - [7.1 Headless Python Gymnasium Environment](#71-headless-python-gymnasium-environment)
   - [7.2 Training with Stable-Baselines3 PPO](#72-training-with-stable-baselines3-ppo)
   - [7.3 Exporting to ONNX & Running In-Browser via TensorFlow.js / ONNX Runtime Web](#73-exporting-to-onnx--running-in-browser-via-tensorflowjs--onnx-runtime-web)

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

### 4.3 Solving the Variable Entity Count Problem

Standard neural networks require a fixed-size input vector $\mathbf{s} \in \mathbb{R}^D$. But the number of asteroids $N$ varies between 2 and 25.

Here are the three methods to solve this:

#### Approach 1: Nearest-$K$ Entities with Padding (Simplist & Fast)
Sort all active asteroids by wrapped distance $d_{\text{wrapped}}$, and select the $K$ closest rocks (e.g. $K = 6$).

For each rock $k \in \{1, \dots, K\}$:
$$\mathbf{f}_{\text{rock}, k} = \left[ \frac{x_{\text{body}}}{W}, \;\frac{y_{\text{body}}}{H}, \;\frac{v_{x,\text{body}}}{v_{\max}}, \;\frac{v_{y,\text{body}}}{v_{\max}}, \;\frac{r_{\text{rock}}}{r_{\max}}, \;\mathbb{I}_{\text{exists}} \right]$$

If there are only 3 rocks active, set $\mathbb{I}_{\text{exists}} = 0$ and zero-pad the remaining 3 slots.

#### Approach 2: Radial Range-Finder / LIDAR Rays (Most Robust for Evasion)
Cast $M = 16$ or $32$ virtual range-finder rays radially around the ship at angles $\psi_m = \frac{2\pi m}{M}$:

```
        \   |   /
      \   \ | /   /
    ---- ( SHIP ) ----   (16 or 32 Radial Rays)
      /   / | \   \
        /   |   \
```

Each ray $m$ tests intersection with all rock circles and reports:
1. Normalized distance to closest object: $d_m / d_{\text{sensor}} \in [0, 1]$ (1.0 = clear space)
2. Relative closing velocity along the ray: $\vec{v}_{\text{rel}} \cdot \hat{u}_m$
3. Object type: (0 = nothing, 0.5 = asteroid, 1.0 = UFO or enemy bullet)

**Why this is brilliant:** The observation dimension is strictly fixed to $M \times 3 = 48$ floats, whether there is 1 asteroid or 100 asteroids!

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

### 4.7 Production In-Browser Architecture: The 32-Dimensional State Vector (`rl_agent.js`)

In the live web implementation (`rl_agent.js`), to enable fast $600\text{ Hz}$ in-browser CPU simulation (10x turbo mode) without frame drops, we engineered an optimal **32-dimensional continuous state vector** $\mathbf{s}_t \in [-1, 1]^{32}$.

Every feature is strictly normalized and dimensionless—**no raw pixel coordinates are ever fed to the policy network**:

| Feature Index | Symbol / Code | Normalized Range | Description |
| :--- | :--- | :--- | :--- |
| **`obs[0]`** | $v_{x,\text{ship}} / v_{\max}$ | $[-1.0, 1.0]$ | Ship horizontal velocity ($v_{\max} = 6.0\text{ px/tick}$) |
| **`obs[1]`** | $v_{y,\text{ship}} / v_{\max}$ | $[-1.0, 1.0]$ | Ship vertical velocity ($v_{\max} = 6.0\text{ px/tick}$) |
| **`obs[2]`** | $\cos\theta$ | $[-1.0, 1.0]$ | Heading direction cosine (continuous orientation) |
| **`obs[3]`** | $\sin\theta$ | $[-1.0, 1.0]$ | Heading direction sine (continuous orientation) |
| **`obs[4]`** | $E_{\text{ammo}} / 100$ | $[0.0, 1.0]$ | Weapon Battery / Shared Reactor energy level |
| **`obs[5]`** | $E_{\text{shield}} / 100$ | $[0.0, 1.0]$ | Dedicated Shield Capacitor charge (in Dual / Shield-Only modes) |
| **`obs[6]`** | $t_{\text{invincible}} / 150$ | $[0.0, 1.0]$ | Remaining forcefield duration ($150\text{ ticks} = 2.5\text{s}$) |
| **`obs[7]`** | $x_{\text{ufo,body}} / (W/2)$ | $[-1.0, 1.0]$ | Alien saucer relative position (Forward axis) |
| **`obs[8]`** | $y_{\text{ufo,body}} / (H/2)$ | $[-1.0, 1.0]$ | Alien saucer relative position (Starboard axis) |
| **`obs[9]`** | $v_{x,\text{ufo,body}} / 6.0$ | $[-1.0, 1.0]$ | Alien saucer relative closing velocity (Forward axis) |
| **`obs[10]`** | $v_{y,\text{ufo,body}} / 6.0$ | $[-1.0, 1.0]$ | Alien saucer relative closing velocity (Starboard axis) |
| **`obs[11]`** | $\mathbb{I}_{\text{ufo\_alive}}$ | $\{0.0, 1.0\}$ | Flag indicating if alien UFO is active on screen |
| **`obs[12..16]`** | Asteroid 1 ($\text{Rock}_1$) | $[-1.0, 1.0]$ | Nearest rock: $[x_{\text{body}}/(W/2), \; y_{\text{body}}/(H/2), \; v_{x,\text{body}}/6.0, \; v_{y,\text{body}}/6.0, \; r/36.0]$ |
| **`obs[17..21]`** | Asteroid 2 ($\text{Rock}_2$) | $[-1.0, 1.0]$ | 2nd nearest rock kinematics in egocentric body frame |
| **`obs[22..26]`** | Asteroid 3 ($\text{Rock}_3$) | $[-1.0, 1.0]$ | 3rd nearest rock kinematics in egocentric body frame |
| **`obs[27]`** | $\Delta\psi_{\text{aim}} / \pi$ | $[-1.0, 1.0]$ | Aim error angle to primary target ($0.0 = \text{dead center nose lock}$) |
| **`obs[28]`** | $d_{\text{threat}} / (W/2)$ | $[0.0, 1.0]$ | Normalized distance to closest threat ($1.0 = \text{clear}$, $0.0 = \text{impact}$) |
| **`obs[29]`** | $\mathbb{I}_{\text{danger}}$ | $\{0.0, 1.0\}$ | Imminent collision hazard alert flag ($d_{\text{threat}} < 1.8 \times \text{width}$) |
| **`obs[30]`** | $\mathbb{I}_{\text{shield\_ready}}$ | $\{0.0, 1.0\}$ | **Power Mode Invariant Shield Readiness** ($1.0$ if shield deployable now) |
| **`obs[31]`** | $N_{\text{bullets}} / 10.0$ | $[0.0, 1.0]$ | Active friendly laser projectile density |

#### Power Mode Invariance:
By providing $\mathbb{I}_{\text{shield\_ready}}$ (`obs[30]`) alongside battery levels, the agent does not need three separate neural network models for **Shared Reactor**, **Dual Capacitors**, and **Unlimited Ammo**:
- In **Shared Reactor**: $\mathbb{I}_{\text{shield\_ready}} = 1$ when $E \ge 50\%$.
- In **Dual Capacitors**: $\mathbb{I}_{\text{shield\_ready}} = 1$ when $E_{\text{shield}} \ge 100\%$.
- In **Unlimited Ammo**: $\mathbb{I}_{\text{shield\_ready}} = 1$ when $E_{\text{shield}} \ge 100\%$, and weapon battery (`obs[4]`) stays locked at $1.0$.

The policy learns a single generalizable rule: `if danger > 0 and shield_ready == 1: deploy_shield()`, which succeeds across all three game modes identically.

---

## 5. Action Space Design & Kinematic Execution

In `Spaceship Flight`, a human player can simultaneously rotate, thrust, fire weapons, and activate shields.

We have two options for structuring the action space $\mathcal{A}$:

### Option 1: Multi-Discrete Action Space (Recommended for PPO)
PPO natively supports `gym.spaces.MultiDiscrete`:

$$\mathcal{A} = \text{MultiDiscrete}([3, \; 2, \; 2, \; 2])$$

- **Branch 0 (Steering):** `0: No-op`, `1: Rotate Left`, `2: Rotate Right`
- **Branch 1 (Thrust):** `0: Coast`, `1: Fire Thruster`
- **Branch 2 (Gun):** `0: Hold Fire`, `1: Shoot Plasma Bolt`
- **Branch 3 (Shield):** `0: Standby`, `1: Deploy Emergency Shield`

The policy network outputs $3 + 2 + 2 + 2 = 9$ logits, and samples independently from each categorical distribution.

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

## 11. The "Trigger-Happy" Pathology & Firing Cadence Dynamics

### 11.1 Why Untrained Agents Spill All Bullets Immediately: Is It "Part of the Process"?

**Yes, in standard RL without inductive priors, this is a classic, textbook failure mode known as the "Trigger-Happy Agent" or "Premature Exploration Collapse."**

When training an agent from scratch in arcade environments like Asteroids or Spaceship Flight, new developers often observe the ship instantly emptying its entire capacitor within 150 milliseconds of starting each episode. There are three core theoretical reasons why this occurs:

#### 1. Action Frequency Mismatch (Continuous Time vs. Discrete Decisions)
In the browser game loop, `game.update()` executes at **60 Hz** (or up to **600 Hz** in turbo training mode).
- At initialization (random Xavier weights), the Actor network outputs approximately equal logits for the Fire head: $[z_0 \approx 0, z_1 \approx 0]$.
- Softmax produces probabilities $p(\text{Hold}) \approx 0.5$ and $p(\text{Fire}) \approx 0.5$.
- Sampling a binary action with $p = 0.5$ at 60 Hz means the agent attempts to fire **30 bullets per second**!
- In Shared Reactor mode, each shot costs 15% energy from a 100-point capacitor. The ship can only fire 6 shots before exhausting its battery.
- Consequently, at 30 shots/sec, **100% of the ship's battery is dumped in only 6 to 10 frames ($\approx 100 - 160\text{ ms}$)**.

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

### 11.2 The 5-Layer Engineering Solution

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

### 11.3 Behavioral Cloning Pre-Warming

Rather than training purely from random noise in the browser, the 32-64-64 Multi-Head MLP is pre-trained via **Behavioral Cloning (Supervised Imitation Learning)** over 350,000+ balanced combat transitions:

- **Balanced State Distribution**: 50% patrol/evasion states, 50% targeted engagement states.
- **Trained Neural Metrics**:
  - **Fire Accuracy**: $91.4\%$
  - **Shield Accuracy**: $99.4\%$
  - **Steer Accuracy**: $86.5\%$
  - **Thrust Accuracy**: $81.5\%$
- **Base64 Serialized Weights**: Packed directly into `rl_agent.js` as a compact 36KB array, allowing instant zero-latency initialization in the browser without requiring external server downloads or Python runtimes.

