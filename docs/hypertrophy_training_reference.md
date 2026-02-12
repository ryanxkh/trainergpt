# Evidence-Based Hypertrophy Training Science Reference
## For AI Training Coach Applications

---

## Table of Contents
1. [Progressive Overload Mechanisms](#progressive-overload-mechanisms)
2. [Volume Landmarks (MEV/MAV/MRV)](#volume-landmarks)
3. [RPE/RIR Scales & Autoregulation](#rpe-rir-scales)
4. [Mesocycle Structure](#mesocycle-structure)
5. [Training Frequency](#training-frequency)
6. [Exercise Selection](#exercise-selection)
7. [Recovery Indicators](#recovery-indicators)
8. [Deload Protocols](#deload-protocols)
9. [Programming Structures](#programming-structures)
10. [Data Model for AI Applications](#data-model)
11. [AI Decision Trees](#ai-decision-trees)

---

## Progressive Overload Mechanisms

Progressive overload is the fundamental driver of hypertrophy adaptation. An AI coach must track and manipulate multiple variables:

### Primary Mechanisms (in order of preference for hypertrophy)

#### 1. **Volume (Sets × Reps × Load)**
- **Most important for hypertrophy**
- Track total weekly volume per muscle group
- Increase by 1-2 sets per week within a mesocycle
- **AI Rule**: If performance is maintained, add 1 set to lagging exercises each week

#### 2. **Weight/Load**
- Increase weight when rep targets are exceeded
- **AI Rule**: If user completes top of rep range for 2 consecutive sessions with RIR ≤2, increase weight by:
  - 2.5-5 lbs for isolation exercises
  - 5-10 lbs for compound movements
  - 5% for bodyweight + weight exercises

#### 3. **Reps**
- Progress within a rep range (e.g., 8-12 reps)
- **AI Rule**: Track rep progression. When user consistently hits 12 reps for all sets, increase weight and drop back to 8 reps

#### 4. **Sets**
- Gradually increase sets within mesocycle
- Start near MEV, progress toward MAV/MRV
- **AI Rule**: Add 1-2 sets per muscle group per week, capping at MRV

#### 5. **Range of Motion (ROM)**
- Longer ROM generally superior for hypertrophy
- **Tracking**: Note partial vs full ROM exercises
- **AI Rule**: Prioritize full ROM exercises; suggest ROM improvements when technique allows

#### 6. **Tempo**
- Eccentric (lowering): 2-4 seconds optimal
- Concentric (lifting): 1-2 seconds (explosive intent)
- Time under tension (TUT): 40-70 seconds per set ideal
- **AI Rule**: Default tempo of 2-1-1 (2s eccentric, 1s pause, 1s concentric)

#### 7. **Rest Periods**
- Shorter rest = metabolic stress, but may compromise volume
- **AI Rule**:
  - Compounds: 2-3 minutes
  - Isolations: 90-120 seconds
  - Adjust based on performance drop-off

### Progressive Overload Decision Tree for AI

```
IF user completes all sets at top of rep range with RIR ≤ 2
  THEN increase weight
ELSE IF user completes all sets mid-range with good RIR
  THEN maintain weight, aim for more reps next session
ELSE IF user fails to hit bottom of rep range
  THEN reduce weight OR reduce fatigue (check recovery indicators)
ELSE IF user consistently hits targets
  THEN add volume (sets) if below MRV
```

---

## Volume Landmarks

### Dr. Mike Israetel's RP Strength Volume Model

These are **weekly set guidelines per muscle group** (hard sets taken within 0-4 RIR):

#### Volume Definitions

- **MV (Maintenance Volume)**: Sets needed to maintain muscle mass (not growing)
- **MEV (Minimum Effective Volume)**: Minimum sets to stimulate growth
- **MAV (Maximum Adaptive Volume)**: Sweet spot for optimal growth with manageable fatigue
- **MRV (Maximum Recoverable Volume)**: Maximum sets you can recover from; exceeding causes overreaching

#### Volume Guidelines by Muscle Group

| Muscle Group | MV | MEV | MAV | MRV |
|--------------|----|----|-----|-----|
| **Chest** | 4-6 | 8-10 | 12-18 | 20-24 |
| **Back** | 4-6 | 8-10 | 14-20 | 24-28 |
| **Shoulders** | 4-6 | 6-8 | 12-18 | 20-26 |
| **Biceps** | 2-4 | 6-8 | 12-18 | 20-26 |
| **Triceps** | 2-4 | 6-8 | 10-16 | 18-24 |
| **Quads** | 4-6 | 8-10 | 12-18 | 20-24 |
| **Hamstrings** | 2-4 | 6-8 | 10-16 | 18-22 |
| **Glutes** | 2-4 | 6-8 | 10-16 | 18-22 |
| **Calves** | 4-6 | 8-10 | 12-16 | 18-22 |
| **Abs** | 0-2 | 6-8 | 12-18 | 20-25 |

#### Important Notes for AI Implementation

1. **These are weekly totals** across all training sessions
2. **Only count hard sets** (within 0-4 RIR; sets at RIR 5+ don't count toward volume landmarks)
3. **Indirect volume counts**: Triceps get volume from bench press, biceps from rows, etc.
   - **AI Rule**: Count 50% of compound volume toward synergist muscles
4. **Individual variation**: These are starting points; adjust based on individual response
   - Some users may have MEV at 6 sets, others at 12

#### Volume Progression Within Mesocycle

**Week 1**: Start at MEV or slightly above
**Week 2-4**: Add 1-2 sets per muscle group per week
**Week 4-5**: Approaching MRV (highest volume)
**Week 6**: Deload (50-60% of Week 1 volume)

**AI Rule for Volume Accumulation**:
```
Week 1: MEV + 2 sets
Week 2: Week 1 + 2 sets
Week 3: Week 2 + 2 sets
Week 4: Week 3 + 1 set (approaching MRV)
Week 5: Deload week
```

---

## RPE/RIR Scales

### Rating of Perceived Exertion (RPE) - 1-10 Scale

| RPE | RIR | Description | Could Do More? |
|-----|-----|-------------|----------------|
| 10 | 0 | Maximal effort, no more reps possible | 0 reps |
| 9.5 | 0.5 | Could maybe get 1 more rep | Maybe 1 rep |
| 9 | 1 | Could definitely get 1 more rep | 1 rep |
| 8.5 | 1.5 | Could get 1, maybe 2 more reps | 1-2 reps |
| 8 | 2 | Could get 2 more reps | 2 reps |
| 7.5 | 2.5 | Could get 2, maybe 3 more reps | 2-3 reps |
| 7 | 3 | Could get 3 more reps | 3 reps |
| 6 | 4 | Could get 4 more reps | 4 reps |
| 5 | 5 | Moderate effort, 5+ reps left | 5+ reps |
| 1-4 | 6+ | Warm-up sets | Many reps |

### Autoregulation Using RPE/RIR

**Target ranges for hypertrophy**:
- Most sets: **RPE 7-9 (RIR 1-3)**
- Final set of exercise: **RPE 9-10 (RIR 0-1)**
- First sets: **RPE 7-8 (RIR 2-3)**

### AI Autoregulation Rules

```python
# Pseudocode for AI autoregulation

if user_logged_RPE >= 9 and reps < rep_range_minimum:
    # User is struggling
    recommendation = "Reduce weight by 5-10%"

elif user_logged_RPE <= 6 and reps >= rep_range_maximum:
    # User is not working hard enough
    recommendation = "Increase weight by 5%"

elif user_logged_RPE in [7, 8] and reps in rep_range:
    # Perfect execution
    recommendation = "Maintain weight, aim for +1 rep next session"

elif user_logged_RPE == 9 and reps >= rep_range_maximum:
    # Ready to progress
    recommendation = "Increase weight next session"
```

### RPE Progression Within Mesocycle

- **Week 1-2**: RPE 7-8 (RIR 2-3) - Submaximal, focus on technique
- **Week 3-4**: RPE 8-9 (RIR 1-2) - Increasing intensity
- **Week 5**: RPE 9-10 (RIR 0-1) - Peak volume and intensity
- **Week 6**: RPE 5-7 (RIR 3-5) - Deload

**AI Rule**: Track average RPE per session. If average RPE drops despite same weights, flag recovery concern.

---

## Mesocycle Structure

### Standard Hypertrophy Mesocycle (4-6 Weeks)

#### Phase 1: Accumulation (Weeks 1-4)
- **Goal**: Accumulate volume and fatigue
- **Volume**: Progressive increase from MEV toward MRV
- **Intensity**: RPE 7-9
- **Exercise variation**: Consistent exercises for progression tracking

#### Phase 2: Peak/Overreach (Week 5) - Optional
- **Goal**: Maximum volume load
- **Volume**: At or near MRV
- **Intensity**: RPE 9-10
- **Note**: Not always necessary; depends on user recovery capacity

#### Phase 3: Deload (Week 5-6)
- **Goal**: Dissipate fatigue, sensitize muscles to volume
- **Volume**: 40-60% of Week 1 volume
- **Intensity**: RPE 6-7 or reduce to 60-70% of working weights
- **Duration**: 1 week typical, 2 weeks if heavily fatigued

### Mesocycle Volume Progression Example

**Example: Chest Training**

| Week | Sets | Notes |
|------|------|-------|
| 1 | 10 sets | Start at MEV + 2 |
| 2 | 12 sets | Add 2 sets |
| 3 | 14 sets | Add 2 sets |
| 4 | 16 sets | Add 2 sets, approaching MRV |
| 5 | 6 sets | Deload (50% of Week 1) |
| 6 | Start new mesocycle | Reset to MEV + 2 with new exercises |

### AI Rules for Mesocycle Management

```
IF current_week <= 4 AND volume < MRV:
    add_sets = 1 to 2 per muscle group

IF current_week == 4 OR volume >= MRV * 0.9:
    next_week = "Deload"

IF deload_complete:
    new_mesocycle = True
    starting_volume = MEV + 2
    consider_exercise_rotation = True
```

### When to End Mesocycle Early (Reactive Deload)

**AI should trigger early deload if**:
1. Performance decline across 2+ consecutive sessions
2. Average RPE increasing for same weight/reps
3. User reports poor sleep for 3+ nights
4. User reports high subjective fatigue (>7/10) for 3+ days
5. Joint pain or persistent soreness beyond normal DOMS

---

## Training Frequency

### Optimal Frequency per Muscle Group

**Evidence-based recommendation: 2-3x per week per muscle group**

#### Frequency Research Summary
- **1x/week**: Suboptimal for most muscle groups (Brad Schoenfeld meta-analysis)
- **2x/week**: Excellent for most users, allows adequate recovery
- **3x/week**: Optimal for advanced users or smaller muscle groups
- **4x+/week**: Rarely beneficial, high fatigue cost

### Frequency by Training Experience

| Experience Level | Frequency | Weekly Sets per Muscle |
|------------------|-----------|------------------------|
| Beginner (0-1 year) | 2-3x/week | Start at MEV |
| Intermediate (1-3 years) | 2-3x/week | Work toward MAV |
| Advanced (3+ years) | 3-4x/week | Can handle near-MRV |

### Volume Distribution Rules

**For 2x/week frequency**:
- Split volume evenly or 60/40
- Example: 14 weekly chest sets = 7 sets Monday, 7 sets Thursday

**For 3x/week frequency**:
- Distribute evenly or pyramid (lighter-heavier-lighter)
- Example: 15 weekly chest sets = 5-5-5 or 4-7-4

### AI Frequency Selection Logic

```
IF user_experience == "beginner":
    frequency = 2 to 3

ELIF user_training_days_per_week <= 3:
    frequency = full_body (3x/week per muscle)

ELIF user_training_days_per_week == 4:
    frequency = upper_lower (2x/week per muscle)

ELIF user_training_days_per_week >= 5:
    frequency = PPL or body_part_split (2-3x/week per muscle)
```

---

## Exercise Selection

### Exercise Selection Criteria

#### 1. **Stimulus-to-Fatigue Ratio (SFR)**
- **High SFR**: Isolation exercises, machines, exercises with stable positions
  - Examples: Leg extensions, cable flies, dumbbell curls
  - Use these when fatigue is accumulating

- **Medium SFR**: Compound exercises with good stability
  - Examples: Barbell bench press, lat pulldowns, leg press
  - Bread and butter of hypertrophy training

- **Low SFR**: Heavy compounds, high-skill exercises
  - Examples: Deadlifts, back squats, Olympic lifts
  - Use sparingly in pure hypertrophy phases

**AI Rule**: As mesocycle progresses and fatigue accumulates, shift exercise selection toward higher SFR movements.

#### 2. **Muscle Lengthening (Stretch-Mediated Hypertrophy)**
Recent research (2023-2024) emphasizes **lengthened position training**:
- Exercises that load muscle in stretched position show superior hypertrophy
- Examples:
  - **Chest**: Dumbbell flies, deficit push-ups (vs. standard bench press)
  - **Biceps**: Incline curls (vs. preacher curls)
  - **Quads**: Sissy squats, lengthened leg extensions (vs. shortened positions)
  - **Hamstrings**: Romanian deadlifts (vs. leg curls)

**AI Rule**: Include at least 1 stretch-focused exercise per muscle group per session.

#### 3. **Movement Patterns to Cover**

**Chest**:
- Horizontal press (flat bench)
- Incline press (upper chest emphasis)
- Fly/stretch movement (cable fly, dumbbell fly)

**Back**:
- Vertical pull (pull-ups, lat pulldown)
- Horizontal pull (rows)
- Deadlift pattern (optional, low SFR)

**Shoulders**:
- Overhead press
- Lateral raise
- Rear delt work (face pulls, reverse flies)

**Legs**:
- Quad-dominant (squat, leg press)
- Hip hinge (RDL, good mornings)
- Isolation (leg extensions, leg curls)

**Arms**:
- Biceps: Curling movement in lengthened position
- Triceps: Overhead extension (long head), pressing movement

#### 4. **Exercise Rotation Strategy**

**When to rotate exercises**:
- Every 4-6 weeks (between mesocycles)
- When progress stalls for 2+ weeks despite adequate overload
- When exercise causes pain or discomfort

**When NOT to rotate**:
- During a mesocycle (maintain consistency for progression)
- If making consistent progress
- Just because of boredom (progress > variety)

**AI Rule**: Suggest exercise rotation between mesocycles, keeping 50-70% of exercises from previous meso (some continuity for progression).

### Exercise Database Structure for AI

```json
{
  "exercise_id": "bench_press_barbell",
  "name": "Barbell Bench Press",
  "muscle_groups": {
    "primary": ["chest"],
    "secondary": ["triceps", "front_delts"]
  },
  "movement_pattern": "horizontal_press",
  "equipment": "barbell",
  "sfr": "medium",
  "stretch_focus": false,
  "skill_requirement": "medium",
  "rep_range_optimal": [6, 12],
  "rest_period_recommended": 180
}
```

---

## Recovery Indicators

An AI coach must interpret recovery signals to make intelligent programming decisions.

### 1. **DOMS (Delayed Onset Muscle Soreness)**

**What it means**:
- Normal response to novel stimulus or increased volume
- NOT a requirement for growth
- Poor indicator of workout quality

**AI Interpretation Rules**:
```
IF DOMS_severity > 7/10 AND duration > 3 days:
    flag = "Excessive volume or novel stimulus"
    recommendation = "Reduce volume next session"

IF DOMS == 0 after multiple weeks:
    flag = "Adaptation occurred (normal)"
    recommendation = "Continue progression"

IF DOMS_frequency == "constantly":
    flag = "Possibly not recovering, or poor programming"
    recommendation = "Check volume, sleep, nutrition"
```

### 2. **Performance Trends**

**Key metrics to track**:
- Weight × Reps across sessions
- RPE for same weight/rep combinations
- Rest periods needed

**AI Red Flags**:
```
IF performance_decline for 2+ consecutive sessions:
    possible_causes = [
        "Accumulated fatigue",
        "Insufficient recovery",
        "Inadequate nutrition/sleep",
        "Overreaching"
    ]
    recommendation = "Reduce volume or take deload"

IF performance_stagnant for 3+ weeks:
    possible_causes = [
        "Insufficient stimulus",
        "Need exercise variation",
        "Adaptation plateau"
    ]
    recommendation = "Increase volume or rotate exercises"
```

### 3. **Sleep Quality**

**Self-reported sleep tracking**:
- Hours slept
- Sleep quality (1-10 scale)
- Restfulness upon waking

**AI Rules**:
```
IF sleep_hours < 6 for 3+ consecutive nights:
    recommendation = "Reduce volume by 20-30% until sleep improves"

IF sleep_quality < 5/10 for 3+ nights:
    flag = "Recovery compromised"
    recommendation = "Consider deload or reduce intensity"
```

### 4. **Subjective Readiness**

**Pre-session questionnaire**:
- Energy level (1-10)
- Motivation (1-10)
- Muscle soreness (1-10)
- Joint health (any pain?)

**AI Autoregulation**:
```
IF readiness_score < 5/10:
    session_modification = "Reduce volume by 20-30%"
    OR
    session_modification = "Maintain volume, reduce intensity (lower RPE)"

IF readiness_score >= 8/10 AND performance_trending_up:
    session_modification = "Consider adding volume or intensity"
```

### 5. **Heart Rate Variability (HRV)** - Advanced

If user tracks HRV:
```
IF HRV drops > 20% from baseline for 3+ days:
    flag = "Systemic stress or overreaching"
    recommendation = "Reduce training volume, prioritize recovery"
```

---

## Deload Protocols

### Types of Deloads

#### 1. **Volume Deload** (Preferred for hypertrophy)
- Reduce sets by 50-60%
- Maintain intensity (weight on bar)
- Maintain rep ranges
- **Example**: If Week 4 was 16 sets chest, do 6-8 sets during deload

#### 2. **Intensity Deload**
- Maintain sets
- Reduce weight to 60-70% of working weights
- Reduce RPE to 5-7
- **Example**: If working weight is 225 lbs, use 135-155 lbs for deload

#### 3. **Hybrid Deload**
- Reduce both volume and intensity
- 60-70% of normal volume
- 70-80% of normal intensity
- Best for very fatigued users

### When to Deload

#### Proactive (Planned) Deload
**AI Rule**: Schedule deload every 4-6 weeks regardless of fatigue signals

```
IF weeks_since_last_deload >= 4 AND volume >= MAV:
    schedule_deload = True

IF weeks_since_last_deload >= 6:
    schedule_deload = True  # Maximum time between deloads
```

#### Reactive (As-Needed) Deload
**AI triggers for early deload**:
```
IF (performance_decline for 2+ sessions)
   OR (sleep_quality < 5 for 3+ nights)
   OR (subjective_readiness < 4 for 3+ days)
   OR (joint_pain reported):
    trigger_immediate_deload = True
```

### Deload Week Structure

**Option 1: Reduced Volume**
- All exercises maintained
- 3-4 sets per exercise (50% of peak volume)
- Same weights, same rep ranges
- RPE kept at 7-8

**Option 2: Reduced Frequency**
- Train only 2-3 days regardless of normal split
- Full-body light sessions
- 1-2 exercises per muscle group
- Low volume, moderate intensity

**Option 3: Active Recovery**
- Very light weights (50-60% of normal)
- 2-3 sets per muscle group
- Focus on technique, stretching, mind-muscle connection
- Bodyweight or machine-based exercises

### AI Deload Decision Tree

```
IF user_fatigue == "high" AND performance == "declining":
    deload_type = "volume_deload" (maintain intensity, cut sets by 60%)

ELIF user_fatigue == "moderate" AND weeks_since_deload >= 5:
    deload_type = "hybrid_deload" (reduce both volume and intensity)

ELIF user_reports_joint_pain:
    deload_type = "intensity_deload" (cut weight by 40%, maintain some sets)

ELIF user_psychological_burnout:
    deload_type = "active_recovery" (very light work, 2-3 days only)
```

---

## Programming Structures

### Common Training Splits

#### 1. **Full Body (3x/week)**

**Ideal for**: Beginners, busy schedules, maximum frequency per muscle

**Structure**:
- Monday: Full Body A
- Wednesday: Full Body B
- Friday: Full Body C

**Volume per session**: 2-5 sets per muscle group

**Example Session**:
```
Full Body A:
- Squat: 3 sets × 8-10 reps
- Bench Press: 3 sets × 8-12 reps
- Bent-Over Row: 3 sets × 8-12 reps
- Overhead Press: 2 sets × 10-12 reps
- Leg Curl: 2 sets × 10-15 reps
- Bicep Curl: 2 sets × 10-15 reps
- Tricep Extension: 2 sets × 10-15 reps
```

**Pros**: High frequency, skill practice, flexible
**Cons**: Long sessions, mental fatigue

---

#### 2. **Upper/Lower (4x/week)**

**Ideal for**: Intermediate lifters, balanced approach

**Structure**:
- Monday: Upper A
- Tuesday: Lower A
- Thursday: Upper B
- Friday: Lower B

**Volume per session**: 4-8 sets per muscle group

**Example Week**:
```
Upper A (Horizontal Focus):
- Bench Press: 4 sets × 6-10 reps
- Barbell Row: 4 sets × 8-10 reps
- Incline Dumbbell Press: 3 sets × 10-12 reps
- Cable Row: 3 sets × 10-12 reps
- Lateral Raise: 3 sets × 12-15 reps
- Bicep Curl: 3 sets × 10-12 reps
- Tricep Pushdown: 3 sets × 10-12 reps

Lower A (Quad Focus):
- Squat: 4 sets × 6-10 reps
- Romanian Deadlift: 3 sets × 8-10 reps
- Leg Press: 3 sets × 10-15 reps
- Leg Curl: 3 sets × 10-15 reps
- Calf Raise: 4 sets × 10-15 reps

Upper B (Vertical Focus):
- Overhead Press: 4 sets × 6-10 reps
- Pull-ups/Lat Pulldown: 4 sets × 8-10 reps
- Dumbbell Bench: 3 sets × 10-12 reps
- Seated Cable Row: 3 sets × 10-12 reps
- Face Pulls: 3 sets × 15-20 reps
- Hammer Curl: 3 sets × 10-12 reps
- Overhead Extension: 3 sets × 10-12 reps

Lower B (Hip Focus):
- Deadlift or RDL: 4 sets × 6-8 reps
- Bulgarian Split Squat: 3 sets × 10-12 reps per leg
- Leg Extension: 3 sets × 12-15 reps
- Leg Curl: 3 sets × 10-15 reps
- Calf Raise: 4 sets × 10-15 reps
```

**Pros**: Excellent balance, manageable fatigue, 2x frequency
**Cons**: Requires 4 days commitment

---

#### 3. **Push/Pull/Legs (6x/week or 3x/week)**

**Ideal for**: Advanced lifters, maximum volume capacity

**Structure (6-day)**:
- Monday: Push A
- Tuesday: Pull A
- Wednesday: Legs A
- Thursday: Push B
- Friday: Pull B
- Saturday: Legs B

**Structure (3-day)**: Same but each session once per week

**Volume per session**: 4-6 sets per muscle group

**Example Push Day**:
```
Push A:
- Flat Barbell Bench: 4 sets × 6-10 reps
- Overhead Press: 4 sets × 8-10 reps
- Incline Dumbbell Press: 3 sets × 10-12 reps
- Cable Fly: 3 sets × 12-15 reps
- Lateral Raise: 3 sets × 12-15 reps
- Tricep Pushdown: 3 sets × 10-15 reps
- Overhead Tricep Extension: 2 sets × 12-15 reps
```

**Pros**: High volume capacity, specialization, clear focus
**Cons**: High time commitment, risk of overtraining

---

#### 4. **Bro Split (5-6x/week)** - Less Optimal for Hypertrophy

**Structure**:
- Monday: Chest
- Tuesday: Back
- Wednesday: Shoulders
- Thursday: Legs
- Friday: Arms

**Volume per session**: 12-20 sets per muscle group (all weekly volume in one session)

**Issues for hypertrophy**:
- Only 1x/week frequency (suboptimal)
- Extremely high volume per session (fatigue, quality drop-off)
- Long recovery before next stimulus

**AI Recommendation**: Avoid suggesting this split unless user specifically prefers it.

---

### Set and Rep Ranges for Hypertrophy

#### Evidence-Based Rep Ranges

**Primary hypertrophy range**: 6-20 reps per set
**Optimal distribution**: 70-80% of sets in 8-15 rep range

| Rep Range | Load | Primary Benefit | Volume Recommendation |
|-----------|------|-----------------|----------------------|
| 1-5 reps | 85-100% 1RM | Strength | 10-20% of weekly sets |
| 6-8 reps | 80-85% 1RM | Strength + hypertrophy | 20-30% of weekly sets |
| 8-12 reps | 70-80% 1RM | Hypertrophy sweet spot | 40-50% of weekly sets |
| 12-20 reps | 60-70% 1RM | Hypertrophy + endurance | 20-30% of weekly sets |
| 20+ reps | <60% 1RM | Endurance | 0-10% of weekly sets |

#### AI Programming Rules for Reps

```
FOR compound_exercises:
    rep_range = 6-10 reps  # Heavier, more taxing

FOR isolation_exercises:
    rep_range = 10-15 reps  # Lighter, less joint stress

FOR small_muscle_groups (calves, abs, rear delts):
    rep_range = 12-20 reps  # Higher reps tolerated well

FOR exercises_with_poor_SFR (deadlifts, heavy squats):
    rep_range = 5-8 reps  # Lower reps to manage fatigue
```

### Rest Periods by Exercise Type

| Exercise Type | Rest Period | Reasoning |
|---------------|-------------|-----------|
| Heavy Compounds (Squat, Deadlift) | 3-5 minutes | CNS intensive, need full recovery |
| Moderate Compounds (Bench, Row) | 2-3 minutes | Balance volume and recovery |
| Isolation Exercises | 60-120 seconds | Less systemic fatigue |
| Drop Sets / Supersets | 30-60 seconds | Metabolic stress technique |
| Final Set of Exercise | +30-60 seconds | Allow maximal effort |

**AI Rule**:
```
IF set_number == 1:
    rest_period = baseline
ELIF set_number == final_set:
    rest_period = baseline + 30_seconds
ELIF previous_set_RPE >= 9:
    rest_period = baseline + 60_seconds
ELSE:
    rest_period = baseline
```

---

## Data Model for AI Applications

### Core Data Structures

#### 1. **User Profile**
```json
{
  "user_id": "uuid",
  "experience_level": "beginner|intermediate|advanced",
  "training_age_months": 24,
  "available_training_days": 4,
  "goals": ["hypertrophy", "strength"],
  "equipment_access": ["barbell", "dumbbells", "machines"],
  "injury_history": [
    {
      "body_part": "lower_back",
      "date": "2024-03-15",
      "status": "recovered"
    }
  ],
  "volume_landmarks": {
    "chest": {"MEV": 8, "MAV": 14, "MRV": 22},
    "back": {"MEV": 10, "MAV": 16, "MRV": 26}
    // ... per muscle group
  }
}
```

#### 2. **Workout Session**
```json
{
  "session_id": "uuid",
  "user_id": "uuid",
  "date": "2024-12-15",
  "mesocycle_week": 3,
  "split_type": "upper_lower",
  "session_name": "Upper A",
  "pre_session_readiness": {
    "energy": 7,
    "motivation": 8,
    "soreness": 3,
    "sleep_quality": 7,
    "sleep_hours": 7.5
  },
  "exercises": [/* array of exercises */],
  "post_session_notes": "Felt strong, bench press moving well",
  "duration_minutes": 75
}
```

#### 3. **Exercise Log (Per Set)**
```json
{
  "set_id": "uuid",
  "session_id": "uuid",
  "exercise_id": "bench_press_barbell",
  "set_number": 1,
  "weight_lbs": 185,
  "reps_completed": 10,
  "target_reps": "8-12",
  "RIR": 2,
  "RPE": 8,
  "tempo": "2-1-1",  // eccentric-pause-concentric
  "rest_period_seconds": 150,
  "ROM_quality": "full|partial",
  "form_notes": "Slight elbow flare on last 2 reps",
  "timestamp": "2024-12-15T10:23:45Z"
}
```

#### 4. **Mesocycle Plan**
```json
{
  "mesocycle_id": "uuid",
  "user_id": "uuid",
  "start_date": "2024-12-01",
  "end_date": "2024-12-28",
  "weeks_total": 4,
  "split_type": "upper_lower",
  "volume_plan": {
    "week_1": {"chest": 10, "back": 12, "legs": 14},
    "week_2": {"chest": 12, "back": 14, "legs": 16},
    "week_3": {"chest": 14, "back": 16, "legs": 18},
    "week_4": {"chest": 6, "back": 8, "legs": 10}  // deload
  },
  "exercise_selection": [
    {
      "exercise_id": "bench_press_barbell",
      "frequency_per_week": 2,
      "target_sets_per_session": 4,
      "rep_range": "6-10"
    }
    // ... more exercises
  ]
}
```

#### 5. **Performance Metrics (Aggregated)**
```json
{
  "user_id": "uuid",
  "exercise_id": "bench_press_barbell",
  "date_range": "2024-12-01 to 2024-12-28",
  "metrics": {
    "estimated_1RM": 225,
    "avg_volume_per_week": 6800,  // total pounds
    "avg_RPE": 8.2,
    "progression_rate": "+2.5 lbs per week",
    "total_sets": 12
  }
}
```

### Critical Data Points to Track

#### Per Set (Must Track):
1. Exercise ID
2. Weight
3. Reps completed
4. RIR or RPE (at least one)
5. Set number
6. Date/timestamp

#### Per Session (Should Track):
1. Pre-session readiness (energy, sleep, soreness)
2. Session duration
3. Post-session notes
4. Mesocycle week number

#### Weekly Aggregations (AI Computes):
1. Total volume per muscle group (sets × reps × weight)
2. Total hard sets per muscle group (RIR ≤ 4)
3. Average RPE per muscle group
4. Progression trends (weight increases, rep increases)

#### Recovery Indicators (User Self-Reports):
1. Daily sleep hours and quality
2. Daily subjective readiness
3. Soreness levels per muscle group
4. Any joint pain or unusual fatigue

---

## AI Decision Trees

### Decision Tree 1: Programming a New Mesocycle

```
START: User needs new mesocycle

STEP 1: Determine Split
  IF training_days_per_week <= 3:
    split = "full_body"
  ELIF training_days_per_week == 4:
    split = "upper_lower"
  ELIF training_days_per_week >= 5:
    split = "PPL"

STEP 2: Set Volume Targets
  FOR each muscle_group:
    week_1_volume = MEV + 2 sets
    week_2_volume = week_1_volume + 2
    week_3_volume = week_2_volume + 2
    week_4_volume = week_1_volume * 0.5  // deload

STEP 3: Select Exercises
  FOR each muscle_group:
    SELECT exercises WHERE:
      - Cover all movement patterns
      - Include 1 stretch-focused exercise
      - Mix of compounds and isolations
      - 70% carried over from previous meso
      - 30% new exercises for variety

STEP 4: Set Rep Ranges
  FOR compounds: 6-10 reps
  FOR isolations: 10-15 reps
  FOR small muscles (calves, abs): 12-20 reps

STEP 5: Generate Weekly Schedule
  DISTRIBUTE volume across training days
  ENSURE 48-72 hours between same muscle group sessions
  BALANCE session length (45-90 minutes)

OUTPUT: Complete mesocycle plan
```

---

### Decision Tree 2: Intra-Session Weight Selection

```
START: User starting exercise in session

STEP 1: Retrieve Last Performance
  last_performance = QUERY database FOR previous session same exercise

STEP 2: Assess Performance Trend
  IF last_session.all_sets within target_reps AND avg_RIR <= 2:
    recommendation = "Increase weight"
    new_weight = last_weight + increment

  ELIF last_session.all_sets within target_reps AND avg_RIR >= 3:
    recommendation = "Maintain weight, aim for lower RIR"
    new_weight = last_weight

  ELIF last_session.reps < target_range_minimum:
    recommendation = "Reduce weight"
    new_weight = last_weight - (increment × 2)

  ELSE:
    recommendation = "Maintain weight"
    new_weight = last_weight

STEP 3: Factor in Readiness
  IF pre_session_readiness < 5:
    new_weight = new_weight × 0.9  // 10% reduction

OUTPUT: Recommended weight with explanation
```

---

### Decision Tree 3: Progressive Overload Decision

```
START: User completed set, AI evaluates progression

INPUT:
  - reps_completed
  - target_rep_range
  - RIR_reported
  - weight_used

DECISION LOGIC:

IF reps_completed >= target_rep_range.max AND RIR <= 2:
  action = "increase_weight"
  message = "Great job! Increase weight by [increment] next session"

ELIF reps_completed in target_rep_range AND RIR in [2, 3]:
  action = "maintain_weight_increase_reps"
  message = "Perfect execution. Aim for +1 rep next time"

ELIF reps_completed in target_rep_range AND RIR >= 4:
  action = "increase_intensity"
  message = "You have more in the tank. Push closer to failure next set"

ELIF reps_completed < target_rep_range.min AND RIR <= 1:
  action = "reduce_weight"
  message = "Weight too heavy. Reduce by [increment] to stay in target range"

ELIF set_number >= 3 AND reps_completed drops > 30% from set_1:
  action = "extend_rest_period"
  message = "Increase rest to 3-4 minutes to maintain set quality"

ELSE:
  action = "maintain_current_approach"
  message = "Keep up the good work, maintain current weight"

OUTPUT: action + user_message
```

---

### Decision Tree 4: When to Deload

```
START: After each training session, evaluate deload need

INPUTS:
  - weeks_since_last_deload
  - current_volume_vs_MRV
  - performance_trend (last 3 sessions)
  - sleep_quality_avg (last 7 days)
  - readiness_avg (last 7 days)
  - user_reported_pain

DECISION LOGIC:

// Proactive deload
IF weeks_since_last_deload >= 6:
  deload_trigger = "scheduled_maximum"

ELIF weeks_since_last_deload >= 4 AND current_volume >= MAV * 1.2:
  deload_trigger = "high_volume_scheduled"

// Reactive deload
ELIF performance_trend == "declining" for 2+ consecutive sessions:
  deload_trigger = "performance_decline"

ELIF sleep_quality_avg < 5 for last 7 days:
  deload_trigger = "poor_recovery"

ELIF readiness_avg < 4 for last 5 days:
  deload_trigger = "high_fatigue"

ELIF user_reported_pain in ["joint", "persistent"]:
  deload_trigger = "injury_prevention"

ELSE:
  deload_trigger = None
  continue_mesocycle = True

// Select deload type
IF deload_trigger in ["performance_decline", "high_fatigue"]:
  deload_type = "volume_deload"  // Cut sets by 60%, maintain intensity

ELIF deload_trigger in ["injury_prevention", "joint_pain"]:
  deload_type = "intensity_deload"  // Cut weight by 40%, maintain some sets

ELIF deload_trigger in ["scheduled_maximum", "high_volume_scheduled"]:
  deload_type = "hybrid_deload"  // Moderate reduction in both

OUTPUT: deload_recommendation with type and rationale
```

---

### Decision Tree 5: Exercise Rotation Between Mesocycles

```
START: Mesocycle ending, plan next mesocycle exercises

FOR each muscle_group:

  STEP 1: Evaluate Current Exercises
    FOR each exercise in current_mesocycle:
      IF exercise.progression_rate == "stalled" (no progress for 3+ weeks):
        exercise.keep_probability = 20%
      ELIF exercise.user_rating == "dislike":
        exercise.keep_probability = 0%
      ELIF exercise.progression_rate == "strong":
        exercise.keep_probability = 90%
      ELSE:
        exercise.keep_probability = 60%

  STEP 2: Apply Rotation Rules
    exercises_to_keep = SELECT exercises WHERE keep_probability > 50%

    IF len(exercises_to_keep) < 50% of total_exercises:
      // Too much rotation, maintain some continuity
      ADD highest_performing exercises until 50% threshold met

    IF len(exercises_to_keep) > 80% of total_exercises:
      // Too little rotation, force some variety
      REPLACE lowest_performing exercise with new variant

  STEP 3: Select New Exercises
    FOR each open_slot in exercise_plan:
      new_exercise = SELECT FROM exercise_database WHERE:
        - muscle_group matches
        - movement_pattern not over-represented
        - equipment available
        - NOT used in last 2 mesocycles
        - HIGH stimulus_to_fatigue_ratio if fatigue is concern
        - Includes stretch-focus if not already covered

  STEP 4: Validate Exercise Selection
    ENSURE:
      - All movement patterns covered
      - At least 1 stretch-focused exercise per muscle
      - Mix of compounds and isolations
      - Progressive SFR from start to end of week

OUTPUT: Exercise selection for next mesocycle
```

---

### Decision Tree 6: Volume Adjustment Based on Recovery

```
START: Weekly volume evaluation

INPUTS:
  - current_weekly_volume per muscle_group
  - performance_trend
  - recovery_indicators (sleep, readiness, soreness)
  - current_mesocycle_week

FOR each muscle_group:

  IF current_mesocycle_week <= 3:
    // Accumulation phase

    IF performance == "improving" AND recovery == "good":
      volume_change = +2 sets

    ELIF performance == "maintaining" AND recovery == "moderate":
      volume_change = +1 set

    ELIF performance == "declining" OR recovery == "poor":
      volume_change = 0 sets (maintain)
      flag = "monitor_next_week"

    ELIF current_volume >= MRV * 0.9:
      volume_change = 0 sets
      note = "Approaching MRV, maintain volume"

  ELIF current_mesocycle_week == 4:
    // Deload week
    volume_change = "deload" (50% of week 1)

  // Check for volume ceiling
  IF current_volume + volume_change > MRV:
    volume_change = MRV - current_volume
    note = "Volume capped at MRV"
    next_week = "deload"

OUTPUT: volume_adjustment per muscle_group with rationale
```

---

## Key Research-Based Principles Summary

### Top 10 Rules for AI Hypertrophy Coach

1. **Volume is King**: Total weekly sets per muscle (within MEV-MRV) is primary driver of hypertrophy
   - AI must track and progressively increase volume within mesocycle

2. **Frequency Matters**: 2-3x per week per muscle group is optimal
   - AI should distribute volume across multiple sessions

3. **Progressive Overload is Non-Negotiable**: Must increase stimulus over time
   - AI tracks weight, reps, sets, and suggests progressions

4. **Proximity to Failure**: Most sets should be within 0-3 RIR (RPE 7-10)
   - AI monitors RPE/RIR and flags sets that are too easy

5. **Recovery is Adaptation**: Growth happens during recovery, not training
   - AI adjusts volume based on sleep, readiness, performance trends

6. **Deload to Resensitize**: Regular deloads (every 4-6 weeks) enhance long-term progress
   - AI schedules proactive deloads and triggers reactive ones

7. **Exercise Variety with Continuity**: Rotate 30-50% of exercises between mesocycles
   - AI maintains enough continuity to track progression

8. **Stretch-Mediated Hypertrophy**: Prioritize exercises that load lengthened positions
   - AI ensures at least 1 stretch-focused exercise per muscle per session

9. **Stimulus-to-Fatigue Ratio**: As fatigue accumulates, shift to higher SFR exercises
   - AI adjusts exercise selection throughout mesocycle

10. **Autoregulation is Smart Training**: Adjust training based on real-time performance and recovery
    - AI uses pre-session readiness and intra-session performance to modify plans

---

## Implementation Notes for Developers

### Minimum Viable Data Collection

To build an AI hypertrophy coach, you MUST collect:
1. Exercise name
2. Weight used
3. Reps completed
4. RIR or RPE
5. Date

### Recommended Additional Data
6. Pre-session readiness (1-10 scale)
7. Sleep hours
8. Set number
9. Rest periods
10. User notes

### Database Schema Considerations

**Time-series data**: Exercise performance over time is critical for progression tracking
**Aggregations**: Pre-compute weekly volume per muscle group for faster queries
**Flexible schema**: User volume landmarks (MEV/MAV/MRV) will vary individually
**Recovery metrics**: Store as time-series for trend analysis

### AI/ML Opportunities

1. **Personalized Volume Landmarks**: Learn individual MEV/MAV/MRV from progression data
2. **Fatigue Prediction**: Model when user is approaching overreaching based on performance trends
3. **Exercise Recommendation**: Suggest exercises based on user preferences, equipment, and performance history
4. **Autoregulated Loading**: Predict optimal weight based on readiness + historical performance
5. **Injury Risk**: Flag movement patterns or volume spikes that correlate with user-reported pain

---

## References and Further Reading

### Key Researchers and Sources

1. **Dr. Mike Israetel** - RP Strength
   - Volume landmarks (MEV/MAV/MRV)
   - Mesocycle programming
   - Stimulus-to-fatigue ratio concept

2. **Dr. Brad Schoenfeld**
   - Hypertrophy meta-analyses
   - Volume-hypertrophy relationship
   - Frequency research

3. **Dr. Eric Helms** - Muscle & Strength Pyramids
   - Programming hierarchy
   - Evidence-based training principles
   - Nutrition for hypertrophy

4. **Jeff Nippard**
   - Science-based exercise selection
   - Practical programming for naturals
   - Technique optimization

5. **Dr. James Krieger** - Stronger By Science
   - Periodization research
   - Volume meta-analysis
   - Progressive overload mechanisms

### Recommended Reading

- *Scientific Principles of Hypertrophy Training* - Dr. Mike Israetel et al.
- *Muscle & Strength Pyramids: Training* - Dr. Eric Helms
- *The Renaissance Diet 2.0* - Dr. Mike Israetel (for nutrition integration)
- Brad Schoenfeld's research publications on hypertrophy
- Stronger By Science articles and research reviews

---

## Glossary

- **MEV**: Minimum Effective Volume - minimum sets per week to stimulate growth
- **MAV**: Maximum Adaptive Volume - optimal volume for growth with manageable fatigue
- **MRV**: Maximum Recoverable Volume - maximum sets you can recover from
- **RIR**: Reps in Reserve - how many more reps you could do
- **RPE**: Rating of Perceived Exertion - 1-10 scale of effort
- **Mesocycle**: 4-6 week training block with progressive volume accumulation
- **Microcycle**: Single week of training
- **Macrocycle**: Multiple mesocycles (months to year)
- **SFR**: Stimulus-to-Fatigue Ratio - muscle growth stimulus relative to systemic fatigue
- **DOMS**: Delayed Onset Muscle Soreness - normal soreness 24-72 hours post-training
- **Deload**: Planned recovery week with reduced volume or intensity
- **Autoregulation**: Adjusting training based on real-time performance and recovery
- **1RM**: One-rep max - maximum weight for a single repetition

---

**Document Version**: 1.0
**Last Updated**: 2024-12-15
**Purpose**: Domain knowledge reference for AI training coach application development

---

This document provides a comprehensive foundation for building an evidence-based AI hypertrophy training coach. All principles are derived from peer-reviewed research and practical application by leading experts in hypertrophy training science.
