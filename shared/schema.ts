import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  shopName: text("shop_name").notNull(),
  phone: text("phone").notNull(),
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
  status: text("status").default("confirmed").notNull(), // confirmed, cancelled
  serviceId: integer("service_id").references(() => services.id).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, status: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
