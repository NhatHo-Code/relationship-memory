# Progress Log

## Ngày 14 / 14 (2026-11-20)

**Milestone hiện tại:** M10 rút gọn: Docker, deploy, README

**Đã xong**
- API production chỉ cần `DATABASE_URL` và `SUPABASE_URL`; anon key và service role key là optional, seed và test báo lỗi rõ nếu thiếu.
- Build bằng tsup (`dist/server.js`, `dist/worker.js`, gói kèm `@rm/shared`), script `build`, `start`, `start:worker`.
- Dockerfile multi-stage trên `node:26-slim`, chạy bằng user `node`, một image cho cả API và worker. Đã chạy thử container với Supabase local: `/health` và `/ready` ok.
- `@supabase/supabase-js` chuyển sang devDependencies (chỉ seed và test dùng), image còn 395MB.
- Seed nhận `SEED_PASSWORD` để demo trên cloud không dùng `password123`.
- Quét lịch sử git: không có key thật nào (Gemini, service role, anon).
- README đủ 10 mục, 3 ảnh chụp màn hình, hướng dẫn deploy ở `docs/deploy.md`.

**Đang làm:** deploy Supabase cloud, Railway, Vercel (cần tài khoản của bạn).

**Bị kẹt ở:** chưa có.

**Quyết định đã chốt**
- ADR-001: worker nằm trong `apps/api`, một image hai lệnh start.
- UI dùng HeroUI v3 cho web, HeroUI Native cho mobile sau này.
- Web render phía trình duyệt, không có business rule; instant navigation chỉ kiểm tra ở segment khai báo rõ.

**Số test / số test phân quyền:** 88 (84 API + 4 shared) / ma trận 24 ca + 3 test AI không lộ dữ liệu.

**Điểm eval gần nhất:** 14/15 (93%), noLeak 2/2 (2026-11-16, Gemini).

**Câu hỏi phỏng vấn cần luyện (Bước 14.8)**
1. Optimistic và pessimistic locking: dùng ở đâu và vì sao?
2. Luồng từ lúc bấm "Lưu memory" đến lúc AI trả lời được về memory đó.
3. Vì sao chọn pgmq thay vì BullMQ + outbox? (STAR)
4. Những lớp nào đảm bảo AI không lộ memory private?
5. Multi-stage Docker build là gì? Liveness và readiness?
6. Nếu có 10.000 cặp đôi, chỗ nào nghẽn trước và scale thế nào?

**CV bullets**
- Built and deployed a full-stack relationship-memory platform (Next.js, Express/TypeScript, PostgreSQL on Supabase) with JWT auth, invite-based two-member spaces and per-memory privacy, enforced by a 24-case table-driven authorization matrix among 88 automated tests in GitHub Actions CI.
- Implemented a permission-filtered RAG pipeline (pgvector HNSW, provider-agnostic LLM adapter) with cited answers, scoring 93% on a 15-question eval set with zero private-memory leaks.
- Designed transactional background processing with pgmq (enqueue in the same transaction as writes, retries with exponential backoff, dead-lettering, idempotent workers), keeping memory saves successful even when the AI provider fails.

**Bước tiếp theo:** tạo project Supabase cloud (Singapore), deploy Railway và Vercel theo `docs/deploy.md`, smoke test production, điền link demo vào README.
