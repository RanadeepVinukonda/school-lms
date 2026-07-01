# Virtual Labs

## Purpose
Provide interactive browser-based science simulations for physics, chemistry, and biology with progress tracking, concept mastery integration, and post-lab assessments.

## Requirements

### Requirement: Interactive physics, chemistry, and biology simulations
The system SHALL provide at least 10 physics simulations (e.g., pendulum, projectile motion, circuits), 10 chemistry simulations (e.g., titration, reaction rates), and 10 biology simulations (e.g., cell division, ecosystem). Each simulation SHALL be interactive and run entirely in the browser.

#### Scenario: Physics simulation is interactive
- **WHEN** a student opens the pendulum simulation
- **THEN** they SHALL be able to adjust length and mass using sliders
- **THEN** the simulation SHALL update in real-time as parameters change

### Requirement: Lab progress is tracked
Completion of virtual lab experiments SHALL be recorded and count toward the student's concept mastery for related concepts.

#### Scenario: Completing a lab updates mastery
- **WHEN** a student completes the titration experiment
- **THEN** their mastery score for the "Acid-Base Reactions" concept SHALL increase
- **THEN** the lab SHALL appear as completed in their profile

### Requirement: Lab assessments after experiments
Each virtual lab SHALL include a post-lab quiz with 3–5 questions based on the experiment observations. The quiz SHALL only unlock after the experiment is completed.

#### Scenario: Post-lab quiz requires experiment completion
- **WHEN** a student tries to access the post-lab quiz without completing the experiment
- **THEN** the quiz SHALL be locked with a message: "Complete the experiment to unlock"
