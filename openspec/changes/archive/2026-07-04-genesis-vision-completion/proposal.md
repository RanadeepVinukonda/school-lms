## Why

Genesis has 90% of the vision implemented — adaptive engine, AI tutor, OCR, gamification, ERP, virtual labs, PWA, pre-primary, analytics. Six critical gaps remain: no mobile APK, no search, no Google Classroom/Moodle sync, no full ERP modules, limited language support, and no automated performance CI. Closing these gaps makes Genesis production-ready for real school deployments where offline mobile access, LMS integration, and Hindi/Telugu support are table stakes.

## What Changes

- Build complete React Native (Expo) mobile apps for Student, Teacher, and Parent with all core screens ported from the web frontend
- Add Elasticsearch-backed search across curriculum, textbooks, concepts, and content
- Implement Google Classroom and Moodle LTI 1.3 integration for roster sync and grade push
- Add Transport, Inventory, and HR modules to the ERP system
- Extend language support to Hindi, Tamil, and Kannada across AI Tutor and UI
- Set up Lighthouse CI and Core Web Vitals monitoring in the pipeline

## Capabilities

### New Capabilities
- `mobile-student`: Full student mobile app with all student screens (dashboard, subjects, lessons, quizzes, AI tutor, coding, gamification, virtual labs, pre-primary, profile)
- `mobile-teacher`: Teacher mobile app (dashboard, class management, attendance, assessments, OCR, analytics)
- `mobile-parent`: Parent mobile app (dashboard, children progress, reports, attendance)
- `search-engine`: Elasticsearch integration for full-text search across curriculum, textbooks, concepts, and learning content
- `lms-integration`: Google Classroom roster sync + Moodle LTI 1.3 launch and grade passback
- `erp-transport`: Transport management module (routes, stops, vehicles, attendance)
- `erp-inventory`: Inventory management module (stock, orders, suppliers)
- `erp-hr`: HR/payroll module (staff records, attendance, leave, salary)
- `multilingual`: Hindi, Tamil, Kannada language support in AI Tutor and UI
- `performance-ci`: Lighthouse CI and Core Web Vitals dashboard

### Modified Capabilities
- (none — no existing spec requirements are changing)

## Impact

- **Mobile**: New `lms/mobile-student/`, `lms/mobile-teacher/`, `lms/mobile-parent/` Expo projects
- **Search**: New `lms/search/` service with Elasticsearch container in docker-compose
- **Integration**: New `lms/integrations/google-classroom/` and `lms/integrations/moodle/` modules
- **ERP**: New tables + services + routes + UI pages for transport, inventory, HR
- **Language**: Extended AI Tutor prompts and i18n files
- **CI**: New `.github/workflows/lighthouse.yml` and perf thresholds
- **Dependencies**: @elastic/elasticsearch, react-native-maps, react-native-push-notification, etc.
