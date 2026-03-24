import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  businessHours: text("business_hours").default("09:00-18:00").notNull(),
  // 요일별 영업시간 (JSON): {"mon": {"open": "09:00", "close": "18:00", "closed": false}, ...}
  businessDays: text("business_days"),
  // 임시 휴무일 (JSON 배열): ["2025-01-01", "2025-01-27", ...]
  closedDates: text("closed_dates"),
  // 특정 날짜의 차단된 시간대 (JSON): {"2026-02-03": ["10:00", "10:30"], ...}
  blockedSlots: text("blocked_slots"),
  // 예약이 있어도 강제로 열어둔 시간대 (JSON): {"2026-02-03": ["14:00", "14:30"], ...}
  forceOpenSlots: text("force_open_slots"),
  // 가게 소개/메모 (주차 안내, 공지사항 등)
  shopMemo: text("shop_memo"),
  depositAmount: integer("deposit_amount").default(10000).notNull(),
  depositRequired: boolean("deposit_required").default(true).notNull(),
  // 예약금 입금 계좌번호 (카카오 알림톡 템플릿용)
  bankAccount: text("bank_account"),
  // 알림톡 추가 안내문구 (선택, 1줄)
  notificationExtraNote: text("notification_extra_note"),
  // 알림 유형별 활성화 여부 (JSON): {"bookingConfirmed":true,"depositGuide":true,...}
  notificationEnabled: text("notification_enabled"),
  isApproved: boolean("is_approved").default(true).notNull(), // 자동 승인으로 변경
  // 구독 관련 필드
  subscriptionStatus: text("subscription_status").default("none").notNull(), // none, active, expired, cancelled
  subscriptionTier: text("subscription_tier").default("basic"), // basic, premium, enterprise
  subscriptionStart: timestamp("subscription_start"),
  subscriptionEnd: timestamp("subscription_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("shop_owner").notNull(),
  status: text("status").default("active").notNull(), // 자동 승인: pending -> active로 변경
  shopId: integer("shop_id").references(() => shops.id),
  shopName: text("shop_name"),
  phone: text("phone"),
  address: text("address"),
  businessNumber: text("business_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").references(() => shops.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  petName: text("pet_name"),
  petBreed: text("pet_breed"),
  petAge: text("pet_age"),
  petWeight: text("pet_weight"),
  firstVisitDate: timestamp("first_visit_date"),
  visitCount: integer("visit_count").default(0).notNull(),
  lastVisit: timestamp("last_visit"),
  memo: text("memo"),
  behaviorNotes: text("behavior_notes"),
  specialNotes: text("special_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").references(() => shops.id),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  price: integer("price").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").references(() => shops.id),
  customerId: integer("customer_id").references(() => customers.id),
  date: text("date").notNull(),
  time: text("time").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  petName: text("pet_name"),
  petBreed: text("pet_breed"),
  status: text("status").default("pending").notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  memo: text("memo"),
  depositStatus: text("deposit_status").default("none").notNull(),
  depositDeadline: timestamp("deposit_deadline"),
  isFirstVisit: boolean("is_first_visit").default(false).notNull(),
  remindSent: boolean("remind_sent").default(false).notNull(),
  remindSentAt: timestamp("remind_sent_at"),
  visitCompleted: boolean("visit_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").references(() => shops.id).notNull(),
  tier: text("tier").notNull(), // basic, premium, enterprise
  status: text("status").default("active").notNull(), // active, expired, cancelled
  amount: integer("amount").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  autoRenew: boolean("auto_renew").default(true).notNull(),
  paymentMethod: text("payment_method"), // card, bank_transfer, etc
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── 사용자별 구독 빌링 (단일 플랜 39,000원/월) ────────────────────────────────
// status 흐름:
//   trialing → pending_payment (D-3 또는 체험 만료) → active (첫 결제 성공)
//                                                    → past_due (결제 실패/재시도)
//                                                    → cancelled (해지)
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  status: text("status").default("trialing").notNull(),
  trialStartDate: timestamp("trial_start_date").notNull(),
  trialEndDate: timestamp("trial_end_date").notNull(),
  billingKey: text("billing_key"),           // nullable: 카드 등록 전까지 null
  nextBillingDate: timestamp("next_billing_date"), // 다음 정기결제일 (nullable)
  lastBillingAt: timestamp("last_billing_at"),     // 마지막 성공 결제일시 (nullable)
  failCount: integer("fail_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── 카카오 알림톡 발송 로그 ────────────────────────────────────────────────────
export const notificationLogs = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").references(() => shops.id).notNull(),
  reservationId: integer("reservation_id").references(() => bookings.id),
  templateType: text("template_type").notNull(), // bookingConfirmed | depositGuide | reminderBefore | bookingCancelled
  phone: text("phone").notNull(),
  status: text("status").notNull(), // sent | failed
  providerMessageId: text("provider_message_id"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const userPayments = pgTable("user_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),          // 39000
  attemptedAt: timestamp("attempted_at").notNull(),
  paidAt: timestamp("paid_at"),                 // nullable: 실패 시 null
  result: text("result").notNull(),             // success | fail
  providerTxId: text("provider_tx_id").notNull(),
  failReason: text("fail_reason"),              // nullable
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertShopSchema = createInsertSchema(shops).omit({ id: true, createdAt: true, isApproved: true, subscriptionStatus: true, subscriptionStart: true, subscriptionEnd: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, visitCount: true, lastVisit: true, firstVisitDate: true, createdAt: true, updatedAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, isActive: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, status: true, depositStatus: true, depositDeadline: true, isFirstVisit: true, remindSent: true, remindSentAt: true, visitCompleted: true, createdAt: true, updatedAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });

export type Shop = typeof shops.$inferSelect;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type UserPayment = typeof userPayments.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;
export type InsertUserPayment = typeof userPayments.$inferInsert;

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = typeof notificationLogs.$inferInsert;
