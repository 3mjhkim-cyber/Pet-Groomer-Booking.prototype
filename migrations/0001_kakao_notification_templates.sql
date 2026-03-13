-- Migration: 카카오 알림톡 고정 템플릿 구조 전환
-- 1) shops 테이블에 계좌번호 및 알림 설정 필드 추가
-- 2) 알림톡 발송 로그 테이블 신규 생성

-- shops 테이블 컬럼 추가
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS notification_extra_note text,
  ADD COLUMN IF NOT EXISTS notification_enabled text;

-- 기존 notification_settings 컬럼이 있다면 제거 (기존 가맹점 자유 편집 방식)
-- ALTER TABLE shops DROP COLUMN IF EXISTS notification_settings;
-- ↑ 기존 데이터 보존이 필요하다면 주석 해제 전 데이터 확인 후 실행

-- notification_logs 테이블 신규 생성
CREATE TABLE IF NOT EXISTS notification_logs (
  id             serial PRIMARY KEY,
  shop_id        integer NOT NULL REFERENCES shops(id),
  reservation_id integer REFERENCES bookings(id),
  template_type  text NOT NULL,         -- bookingConfirmed | depositGuide | reminderBefore | bookingCancelled | returnVisit
  phone          text NOT NULL,
  status         text NOT NULL,         -- sent | failed
  provider_message_id text,
  error_message  text,
  sent_at        timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_logs_shop_id ON notification_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_notif_logs_reservation_id ON notification_logs(reservation_id);
CREATE INDEX IF NOT EXISTS idx_notif_logs_sent_at ON notification_logs(sent_at DESC);
