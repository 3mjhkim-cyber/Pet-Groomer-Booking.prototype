import { users, services, bookings, customers, type User, type InsertUser, type Service, type InsertService, type Booking, type InsertBooking, type Customer, type InsertCustomer } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getServices(): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  
  getCustomers(): Promise<Customer[]>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  searchCustomers(query: string): Promise<Customer[]>;
  getCustomerHistory(phone: string): Promise<(Booking & { serviceName: string })[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  incrementVisitCount(phone: string): Promise<void>;
  
  getBookings(): Promise<(Booking & { serviceName: string })[]>;
  getBooking(id: number): Promise<(Booking & { serviceName: string }) | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  requestDeposit(id: number): Promise<Booking | undefined>;
  confirmDeposit(id: number): Promise<Booking | undefined>;
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

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.phone, phone));
    return customer;
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    if (!query || query.length < 1) return [];
    const searchPattern = `%${query}%`;
    return await db.select().from(customers).where(
      or(
        ilike(customers.name, searchPattern),
        ilike(customers.phone, searchPattern)
      )
    ).limit(10);
  }

  async getCustomerHistory(phone: string): Promise<(Booking & { serviceName: string })[]> {
    const result = await db.select({
      id: bookings.id,
      date: bookings.date,
      time: bookings.time,
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      status: bookings.status,
      serviceId: bookings.serviceId,
      depositStatus: bookings.depositStatus,
      depositDeadline: bookings.depositDeadline,
      serviceName: services.name,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.customerPhone, phone))
    .orderBy(desc(bookings.date));
    
    return result;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async incrementVisitCount(phone: string): Promise<void> {
    const customer = await this.getCustomerByPhone(phone);
    if (customer) {
      await db.update(customers)
        .set({ visitCount: customer.visitCount + 1, lastVisit: new Date() })
        .where(eq(customers.phone, phone));
    }
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
      depositStatus: bookings.depositStatus,
      depositDeadline: bookings.depositDeadline,
      serviceName: services.name,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id));
    
    return result;
  }

  async getBooking(id: number): Promise<(Booking & { serviceName: string }) | undefined> {
    const [result] = await db.select({
      id: bookings.id,
      date: bookings.date,
      time: bookings.time,
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      status: bookings.status,
      serviceId: bookings.serviceId,
      depositStatus: bookings.depositStatus,
      depositDeadline: bookings.depositDeadline,
      serviceName: services.name,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.id, id));
    
    return result;
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(insertBooking).returning();
    
    const existingCustomer = await this.getCustomerByPhone(insertBooking.customerPhone);
    if (!existingCustomer) {
      await this.createCustomer({
        name: insertBooking.customerName,
        phone: insertBooking.customerPhone,
      });
    }
    
    return booking;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    
    if (booking && status === 'confirmed') {
      await this.incrementVisitCount(booking.customerPhone);
    }
    
    return booking;
  }

  async requestDeposit(id: number): Promise<Booking | undefined> {
    const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const [booking] = await db.update(bookings)
      .set({ depositStatus: 'waiting', depositDeadline: deadline })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  async confirmDeposit(id: number): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings)
      .set({ depositStatus: 'paid' })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }
}

export const storage = new DatabaseStorage();
