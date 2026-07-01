## ADDED Requirements

### Requirement: Full-text search across curriculum and content
The system SHALL provide an Elasticsearch-powered search service that indexes curriculum hierarchy, textbooks, concepts, and learning content.

#### Scenario: Student searches for a topic
- WHEN a student types "fractions" in the search bar
- THEN results show matching chapters, concepts, lessons, and YouTube videos ranked by relevance

#### Scenario: Teacher searches for curriculum items
- WHEN a teacher types "quadratic equations" in the curriculum search
- THEN results show the curriculum hierarchy entry with grade/subject/chapter context

#### Scenario: Search indexes are kept up-to-date
- WHEN a new curriculum entry or textbook is added via the backend API
- THEN the search index is updated within 60 seconds

### Requirement: Search API
The system SHALL expose a REST search endpoint.

#### Scenario: API returns search results
- WHEN a GET /search?q=<query> request is made
- THEN the endpoint returns a JSON array of results grouped by type (curriculum, textbook, concept)
