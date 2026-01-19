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
  depositAmount: integer("deposit_amount").default(10000).notNull(),
  depositRequired: boolean("deposit_required").default(true).notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("shop_owner").notNull(),
  shopId: integer("shop_id").references(() => shops.id),
  shopName: text("shop_name"),
  phone: text("phone"),
  address: text("address"),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").references(() => shops.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  visitCount: integer("visit_count").default(0).notNull(),
  lastVisit: timestamp("last_visit"),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").references(() => shops.id),
  name: text("name").notNull(),
  duration: integer("duration").notNull(),
  price: integer("price").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").references(() => shops.id),
  date: text("date").notNull(),
  time: text("time").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  status: text("status").default("pending").notNull(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  depositStatus: text("deposit_status").default("none").notNull(),
  depositDeadline: timestamp("deposit_deadline"),
});

export const insertShopSchema = createInsertSchema(shops).omit({ id: true, createdAt: true, isApproved: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, visitCount: true, lastVisit: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, isActive: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, status: true, depositStatus: true, depositDeadline: true });

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
