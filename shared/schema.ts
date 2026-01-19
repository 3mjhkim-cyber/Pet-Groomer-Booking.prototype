import { pgTable, text, serial, integer, timestamp, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  shopName: text("shop_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").default("서울 강남구 테헤란로 123").notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  visitCount: integer("visit_count").default(0).notNull(),
  lastVisit: timestamp("last_visit"),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  duration: integer("duration").notNull(), // minutes
  price: integer("price").notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  time: text("time").notNull(), // HH:mm
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  status: text("status").default("pending").notNull(), // pending, confirmed, rejected, cancelled
  serviceId: integer("service_id").references(() => services.id).notNull(),
  depositStatus: text("deposit_status").default("none").notNull(), // none, waiting, paid
  depositDeadline: timestamp("deposit_deadline"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, status: true, depositStatus: true, depositDeadline: true });

export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
