import { users, services, bookings, customers, shops, type User, type InsertUser, type Service, type InsertService, type Booking, type InsertBooking, type Customer, type InsertCustomer, type Shop, type InsertShop } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, desc, and, count } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getPendingUsers(): Promise<User[]>;
  getPendingUsersCount(): Promise<number>;
  updateUserStatus(id: number, status: string): Promise<User | undefined>;
  
  getShops(): Promise<Shop[]>;
  getShop(id: number): Promise<Shop | undefined>;
  getShopBySlug(slug: string): Promise<Shop | undefined>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: number, data: Partial<Shop>): Promise<Shop | undefined>;
  approveShop(id: number): Promise<Shop | undefined>;
  
  getServices(shopId?: number | null): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  getServicesByShop(shopId: number): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, data: Partial<Service>): Promise<Service | undefined>;
  deleteService(id: number): Promise<void>;
  
  getCustomers(shopId?: number | null): Promise<Customer[]>;
  getCustomerByPhone(phone: string, shopId?: number | null): Promise<Customer | undefined>;
  searchCustomers(query: string, shopId?: number | null): Promise<Customer[]>;
  getCustomerHistory(phone: string, shopId?: number | null): Promise<(Booking & { serviceName: string })[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  incrementVisitCount(phone: string, shopId?: number | null): Promise<void>;
  
  getBookings(shopId?: number | null): Promise<(Booking & { serviceName: string })[]>;
  getBooking(id: number): Promise<(Booking & { serviceName: string }) | undefined>;
  getBookedTimeSlots(shopId: number, date: string): Promise<{ time: string; duration: number }[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, data: { date?: string; time?: string; serviceId?: number }): Promise<Booking | undefined>;
  updateBookingCustomer(id: number, data: { customerName?: string; customerPhone?: string }): Promise<Booking | undefined>;
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

  async getPendingUsers(): Promise<User[]> {
    return await db.select().from(users)
      .where(and(eq(users.status, 'pending'), eq(users.role, 'shop_owner')))
      .orderBy(desc(users.createdAt));
  }

  async getPendingUsersCount(): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(users)
      .where(and(eq(users.status, 'pending'), eq(users.role, 'shop_owner')));
    return result?.count || 0;
  }

  async updateUserStatus(id: number, status: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getShops(): Promise<Shop[]> {
    return await db.select().from(shops).orderBy(desc(shops.createdAt));
  }

  async getShop(id: number): Promise<Shop | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.id, id));
    return shop;
  }

  async getShopBySlug(slug: string): Promise<Shop | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.slug, slug));
    return shop;
  }

  async createShop(insertShop: InsertShop): Promise<Shop> {
    const [shop] = await db.insert(shops).values(insertShop).returning();
    return shop;
  }

  async updateShop(id: number, data: Partial<Shop>): Promise<Shop | undefined> {
    const [shop] = await db.update(shops).set(data).where(eq(shops.id, id)).returning();
    return shop;
  }

  async approveShop(id: number): Promise<Shop | undefined> {
    const [shop] = await db.update(shops).set({ isApproved: true }).where(eq(shops.id, id)).returning();
    return shop;
  }

  async getServices(shopId?: number | null): Promise<Service[]> {
    if (shopId) {
      return await db.select().from(services).where(eq(services.shopId, shopId));
    }
    return await db.select().from(services);
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async getServicesByShop(shopId: number): Promise<Service[]> {
    return await db.select().from(services).where(
      and(eq(services.shopId, shopId), eq(services.isActive, true))
    );
  }

  async createService(insertService: InsertService): Promise<Service> {
    const [service] = await db.insert(services).values(insertService).returning();
    return service;
  }

  async updateService(id: number, data: Partial<Service>): Promise<Service | undefined> {
    const [service] = await db.update(services).set(data).where(eq(services.id, id)).returning();
    return service;
  }

  async deleteService(id: number): Promise<void> {
    await db.update(services).set({ isActive: false }).where(eq(services.id, id));
  }

  async getCustomers(shopId?: number | null): Promise<Customer[]> {
    if (shopId) {
      return await db.select().from(customers).where(eq(customers.shopId, shopId));
    }
    return await db.select().from(customers);
  }

  async getCustomerByPhone(phone: string, shopId?: number | null): Promise<Customer | undefined> {
    if (shopId) {
      const [customer] = await db.select().from(customers).where(
        and(eq(customers.phone, phone), eq(customers.shopId, shopId))
      );
      return customer;
    }
    const [customer] = await db.select().from(customers).where(eq(customers.phone, phone));
    return customer;
  }

  async searchCustomers(query: string, shopId?: number | null): Promise<Customer[]> {
    if (!query || query.length < 1) return [];
    const searchPattern = `%${query}%`;
    
    if (shopId) {
      return await db.select().from(customers).where(
        and(
          eq(customers.shopId, shopId),
          or(
            ilike(customers.name, searchPattern),
            ilike(customers.phone, searchPattern)
          )
        )
      ).limit(10);
    }
    
    return await db.select().from(customers).where(
      or(
        ilike(customers.name, searchPattern),
        ilike(customers.phone, searchPattern)
      )
    ).limit(10);
  }

  async getCustomerHistory(phone: string, shopId?: number | null): Promise<(Booking & { serviceName: string })[]> {
    let query = db.select({
      id: bookings.id,
      shopId: bookings.shopId,
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
    .where(shopId 
      ? and(eq(bookings.customerPhone, phone), eq(bookings.shopId, shopId))
      : eq(bookings.customerPhone, phone)
    )
    .orderBy(desc(bookings.date));
    
    return await query;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async incrementVisitCount(phone: string, shopId?: number | null): Promise<void> {
    const customer = await this.getCustomerByPhone(phone, shopId);
    if (customer) {
      await db.update(customers)
        .set({ visitCount: customer.visitCount + 1, lastVisit: new Date() })
        .where(eq(customers.id, customer.id));
    }
  }

  async getBookings(shopId?: number | null): Promise<(Booking & { serviceName: string })[]> {
    const baseSelect = {
      id: bookings.id,
      shopId: bookings.shopId,
      date: bookings.date,
      time: bookings.time,
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      status: bookings.status,
      serviceId: bookings.serviceId,
      depositStatus: bookings.depositStatus,
      depositDeadline: bookings.depositDeadline,
      serviceName: services.name,
    };

    if (shopId) {
      return await db.select(baseSelect)
        .from(bookings)
        .innerJoin(services, eq(bookings.serviceId, services.id))
        .where(eq(bookings.shopId, shopId));
    }

    return await db.select(baseSelect)
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id));
  }

  async getBooking(id: number): Promise<(Booking & { serviceName: string }) | undefined> {
    const [result] = await db.select({
      id: bookings.id,
      shopId: bookings.shopId,
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

  async getBookedTimeSlots(shopId: number, date: string): Promise<{ time: string; duration: number }[]> {
    const results = await db.select({
      time: bookings.time,
      duration: services.duration,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(
      and(
        eq(bookings.shopId, shopId),
        eq(bookings.date, date),
        or(eq(bookings.status, 'pending'), eq(bookings.status, 'confirmed'))
      )
    );
    return results;
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(insertBooking).returning();
    
    const existingCustomer = await this.getCustomerByPhone(insertBooking.customerPhone, insertBooking.shopId);
    if (!existingCustomer) {
      await this.createCustomer({
        shopId: insertBooking.shopId,
        name: insertBooking.customerName,
        phone: insertBooking.customerPhone,
      });
    }
    
    return booking;
  }

  async updateBooking(id: number, data: { date?: string; time?: string; serviceId?: number }): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings)
      .set(data)
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  async updateBookingCustomer(id: number, data: { customerName?: string; customerPhone?: string }): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings)
      .set(data)
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    
    if (booking && status === 'confirmed') {
      await this.incrementVisitCount(booking.customerPhone, booking.shopId);
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
