## ADDED Requirements

### Requirement: text-label-xs token is defined in Tailwind config
The Tailwind theme SHALL define a `text-label-xs` font size token in the `fontSize` section.

#### Scenario: text-label-xs resolves to a font size
- **WHEN** a component uses `className="text-label-xs"`
- **THEN** the CSS output SHALL include a `font-size` rule for this class
- **THEN** the rendered text SHALL NOT fall back to the browser default

### Requirement: text-display-xs token is defined in Tailwind config
The Tailwind theme SHALL define a `text-display-xs` font size token in the `fontSize` section.

#### Scenario: text-display-xs resolves to a font size
- **WHEN** a component uses `className="text-display-xs"`
- **THEN** the CSS output SHALL include a `font-size` rule for this class
- **THEN** the rendered text SHALL display at the intended size
