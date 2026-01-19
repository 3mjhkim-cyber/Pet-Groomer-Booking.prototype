import { users, services, bookings, type User, type InsertUser, type Service, type InsertService, type Booking, type InsertBooking } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getServices(): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  
  getBookings(): Promise<(Booking & { serviceName: string })[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async createService(insertService: InsertService): Promise<Service> {
    const [service] = await db.insert(services).values(insertService).returning();
    return service;
  }

  async getBookings(): Promise<(Booking & { serviceName: string })[]> {
    const result = await db.select({
      id: bookings.id,
      date: bookings.date,
      time: bookings.time,
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      status: bookings.status,
      serviceId: bookings.serviceId,
      serviceName: services.name,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id));
    
    return result;
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(insertBooking).returning();
    return booking;
  }
}

export const storage = new DatabaseStorage();
