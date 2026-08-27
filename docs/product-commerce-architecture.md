# Taksh product, access, and campaign architecture

## Reused foundations

Taksh continues to use Auth.js/Supabase authentication, `user_roles` authorization, the existing course/lesson/progress tables, diagnostic attempts and question bank, Razorpay order/payment tables, and institutional `student_course_assignments`. The restructuring adds normalized retail products and campaign attribution instead of replacing those foundations.

## Access matrix

| User | Courses | Diagnostic | Practice and bundle tools | Administration |
| --- | --- | --- | --- | --- |
| Registered free learner | None unless assigned | Eligible campaign diagnostic and own results | No | No |
| Individual product buyer | Only courses mapped to the purchased product | Own results | Only features mapped to that product | No |
| Complete bundle buyer | All courses mapped to the bundle | Diagnostic and readiness reassessment | Features mapped to the bundle | No |
| Institutionally assigned learner | Active assigned courses | Own results | Only separately granted features | No |
| Super Admin | As explicitly granted for a learner account | N/A | N/A | Products, courses, campaigns, access, analytics, users, and content |

Protected learning routes and progress APIs resolve access on the server from active product entitlements plus valid historical/institutional assignments. Browser visibility is not treated as authorization.

## Commerce model

`products` represents either one course product or a bundle. `product_courses` and `product_features` define contents without application-wide hardcoding. A verified Razorpay payment creates one active `entitlements` record for its product. Webhook event IDs, payment IDs, payment-linked entitlements, and active user/product indexes provide idempotency.

## Existing-user migration

Migration `20260826095850_product_commerce_campaigns.sql` is additive and transactional. It:

1. Maps valid Career Starter orders and entitlements to the Complete Placement Bundle.
2. Converts every active legacy course assignment into an individual-course product entitlement when a matching launch product exists.
3. Retains the original assignment rows, progress, attempts, users, and content.
4. Marks migrated access as `legacy` or `institutional`; payment-backed access remains `payment`.
5. Leaves unmatched assignments active, so existing server access continues through the compatibility path.

## Campaign and readiness model

Campaign definitions are stored in `campaigns`; registration and funnel state are stored in `campaign_attributions`; decision-grade events are stored in `product_events`. Scores are calculated from server-owned answers and copied into immutable attempt-linked `readiness_scores` history. Product recommendations are derived after scoring and never modify the score.

## Operational rollout

Apply the migration before deploying the application version. Confirm the six seeded products and their course mappings in Super Admin → Products, then configure campaign links in Super Admin → Campaigns. Razorpay server secrets remain deployment-only and are never returned to the browser.
