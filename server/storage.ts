import { users, services, bookings, customers, shops, subscriptions, type User, type InsertUser, type Service, type InsertService, type Booking, type InsertBooking, type Customer, type InsertCustomer, type Shop, type InsertShop, type Subscription, type InsertSubscription } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, desc, and, count, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: number, password: string): Promise<User | undefined>;

  getShops(): Promise<Shop[]>;
  getShop(id: number): Promise<Shop | undefined>;
  getShopBySlug(slug: string): Promise<Shop | undefined>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: number, data: Partial<Shop>): Promise<Shop | undefined>;
  deleteShop(id: number): Promise<void>;
  
  getServices(shopId?: number | null): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  getServicesByShop(shopId: number): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, data: Partial<Service>): Promise<Service | undefined>;
  deleteService(id: number): Promise<void>;
  
  getCustomers(shopId?: number | null): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string, shopId?: number | null): Promise<Customer | undefined>;
  searchCustomers(query: string, shopId?: number | null): Promise<Customer[]>;
  getCustomerHistory(phone: string, shopId?: number | null): Promise<(Booking & { serviceName: string })[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, data: Partial<Customer>): Promise<Customer | undefined>;
  incrementVisitCount(phone: string, shopId?: number | null): Promise<void>;
  createOrUpdateCustomerFromBooking(data: { shopId: number | null; name: string; phone: string; petName?: string; petBreed?: string; petAge?: string; petWeight?: string; memo?: string }): Promise<{ customer: Customer; isFirstVisit: boolean }>;
  
  getBookings(shopId?: number | null): Promise<(Booking & { serviceName: string })[]>;
  getBooking(id: number): Promise<(Booking & { serviceName: string }) | undefined>;
  getBookedTimeSlots(shopId: number, date: string): Promise<{ time: string; duration: number }[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, data: { date?: string; time?: string; serviceId?: number }): Promise<Booking | undefined>;
  updateBookingCustomer(id: number, data: { customerName?: string; customerPhone?: string }): Promise<Booking | undefined>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  updateBookingRemind(id: number): Promise<Booking | undefined>;
  requestDeposit(id: number): Promise<Booking | undefined>;
  confirmDeposit(id: number): Promise<Booking | undefined>;
  getTomorrowBookings(shopId: number): Promise<(Booking & { serviceName: string })[]>;
  completeBookingVisit(bookingId: number): Promise<Booking | undefined>;
  processCompletedBookings(shopId?: number | null): Promise<number>;

  // Revenue stats
  getRevenueStats(shopId: number, startDate: string, endDate: string): Promise<{
    totalRevenue: number;
    bookingCount: number;
    byService: { serviceName: string; revenue: number; count: number }[];
    byDate: { date: string; revenue: number; count: number }[];
    byHour: { hour: number; revenue: number; count: number }[];
    byDayOfWeek: { dayOfWeek: number; revenue: number; count: number }[];
  }>;

  // Subscription
  createSubscription(data: any): Promise<Subscription>;
  getAllSubscriptions(): Promise<Subscription[]>;
  getSubscriptionsByShop(shopId: number): Promise<Subscription[]>;
  updateShopSubscription(shopId: number, data: { subscriptionStatus?: string; subscriptionTier?: string; subscriptionStart?: Date; subscriptionEnd?: Date }): Promise<void>;
  updateSubscriptionPaymentMethod(subscriptionId: number, paymentMethod: string): Promise<void>;
  cancelLatestSubscription(shopId: number): Promise<void>;
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

  async updateUserPassword(id: number, password: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ password })
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

  async deleteShop(id: number): Promise<void> {
    // 관련 데이터 삭제 (예약, 고객, 서비스, 사용자)
    await db.delete(bookings).where(eq(bookings.shopId, id));
    await db.delete(customers).where(eq(customers.shopId, id));
    await db.delete(services).where(eq(services.shopId, id));
    await db.delete(users).where(eq(users.shopId, id));
    await db.delete(shops).where(eq(shops.id, id));
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
      return await db.select().from(customers).where(eq(customers.shopId, shopId)).orderBy(desc(customers.lastVisit));
    }
    return await db.select().from(customers).orderBy(desc(customers.lastVisit));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
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
      customerId: bookings.customerId,
      date: bookings.date,
      time: bookings.time,
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      petName: bookings.petName,
      petBreed: bookings.petBreed,
      status: bookings.status,
      serviceId: bookings.serviceId,
      memo: bookings.memo,
      depositStatus: bookings.depositStatus,
      depositDeadline: bookings.depositDeadline,
      isFirstVisit: bookings.isFirstVisit,
      remindSent: bookings.remindSent,
      remindSentAt: bookings.remindSentAt,
      visitCompleted: bookings.visitCompleted,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
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
        .set({ visitCount: customer.visitCount + 1, lastVisit: new Date(), updatedAt: new Date() })
        .where(eq(customers.id, customer.id));
    }
  }

  async updateCustomer(id: number, data: Partial<Customer>): Promise<Customer | undefined> {
    const [customer] = await db.update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async createOrUpdateCustomerFromBooking(data: { shopId: number | null; name: string; phone: string; petName?: string; petBreed?: string; petAge?: string; petWeight?: string; memo?: string }): Promise<{ customer: Customer; isFirstVisit: boolean }> {
    const existingCustomer = await this.getCustomerByPhone(data.phone, data.shopId);

    if (existingCustomer) {
      const updatedMemo = data.memo
        ? (existingCustomer.memo ? `${existingCustomer.memo}\n• ${data.memo} (${new Date().toISOString().split('T')[0]})` : `• ${data.memo} (${new Date().toISOString().split('T')[0]})`)
        : existingCustomer.memo;

      // 예약 생성 시에는 visitCount를 증가시키지 않음 - 예약 시간이 지난 후에만 증가
      const [customer] = await db.update(customers)
        .set({
          name: data.name,
          petName: data.petName || existingCustomer.petName,
          petBreed: data.petBreed || existingCustomer.petBreed,
          petAge: data.petAge || existingCustomer.petAge,
          petWeight: data.petWeight || existingCustomer.petWeight,
          memo: updatedMemo,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, existingCustomer.id))
        .returning();

      return { customer, isFirstVisit: false };
    } else {
      // 새 고객 생성 - visitCount는 0으로 시작 (예약 시간이 지난 후에 증가)
      const [customer] = await db.insert(customers).values({
        shopId: data.shopId,
        name: data.name,
        phone: data.phone,
        petName: data.petName,
        petBreed: data.petBreed,
        petAge: data.petAge,
        petWeight: data.petWeight,
        memo: data.memo ? `• ${data.memo} (${new Date().toISOString().split('T')[0]})` : null,
        firstVisitDate: new Date(),
        visitCount: 0,
      }).returning();

      return { customer, isFirstVisit: true };
    }
  }

  // 예약 시간이 지난 후 방문 완료 처리
  async completeBookingVisit(bookingId: number): Promise<Booking | undefined> {
    const booking = await this.getBooking(bookingId);
    if (!booking || booking.visitCompleted || booking.status !== 'confirmed') {
      return undefined;
    }

    // 고객 방문 횟수 증가
    if (booking.customerId) {
      const customer = await this.getCustomer(booking.customerId);
      if (customer) {
        await db.update(customers)
          .set({
            visitCount: customer.visitCount + 1,
            lastVisit: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customer.id));
      }
    }

    // 예약에 방문 완료 표시
    const [updated] = await db.update(bookings)
      .set({ visitCompleted: true, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId))
      .returning();

    return updated;
  }

  // 지난 예약들 자동 방문 완료 처리
  async processCompletedBookings(shopId?: number | null): Promise<number> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 확정된 예약 중 시간이 지났고 아직 방문 완료 처리 안된 것들
    const conditions = [
      eq(bookings.status, 'confirmed'),
      eq(bookings.visitCompleted, false),
    ];

    if (shopId) {
      conditions.push(eq(bookings.shopId, shopId));
    }

    const pendingBookings = await db.select()
      .from(bookings)
      .where(and(...conditions));

    let completedCount = 0;

    for (const booking of pendingBookings) {
      // 날짜가 오늘 이전이거나, 오늘인데 시간이 지난 경우
      const isPast = booking.date < todayStr ||
        (booking.date === todayStr && booking.time < currentTime);

      if (isPast) {
        await this.completeBookingVisit(booking.id);
        completedCount++;
      }
    }

    return completedCount;
  }

  async getBookings(shopId?: number | null): Promise<(Booking & { serviceName: string })[]> {
    const baseSelect = {
      id: bookings.id,
      shopId: bookings.shopId,
      customerId: bookings.customerId,
      date: bookings.date,
      time: bookings.time,
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      petName: bookings.petName,
      petBreed: bookings.petBreed,
      status: bookings.status,
      serviceId: bookings.serviceId,
      memo: bookings.memo,
      depositStatus: bookings.depositStatus,
      depositDeadline: bookings.depositDeadline,
      isFirstVisit: bookings.isFirstVisit,
      remindSent: bookings.remindSent,
      remindSentAt: bookings.remindSentAt,
      visitCompleted: bookings.visitCompleted,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
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
      customerId: bookings.customerId,
      date: bookings.date,
      time: bookings.time,
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      petName: bookings.petName,
      petBreed: bookings.petBreed,
      status: bookings.status,
      serviceId: bookings.serviceId,
      memo: bookings.memo,
      depositStatus: bookings.depositStatus,
      depositDeadline: bookings.depositDeadline,
      isFirstVisit: bookings.isFirstVisit,
      remindSent: bookings.remindSent,
      remindSentAt: bookings.remindSentAt,
      visitCompleted: bookings.visitCompleted,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
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
    return booking;
  }

  async updateBooking(id: number, data: { date?: string; time?: string; serviceId?: number }): Promise<Booking | undefined> {
    // 날짜나 시간이 변경되면 visitCompleted를 false로 리셋 (새 시간에 맞춰 다시 처리)
    const updateData: any = { ...data };
    if (data.date || data.time) {
      updateData.visitCompleted = false;
    }
    const [booking] = await db.update(bookings)
      .set(updateData)
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
    // 먼저 현재 예약 상태 확인
    const [currentBooking] = await db.select().from(bookings).where(eq(bookings.id, id));

    if (!currentBooking) return undefined;

    // 취소/거절 시: 이미 방문 완료 처리된 예약이면 고객 방문 횟수 감소
    if ((status === 'cancelled' || status === 'rejected') && currentBooking.visitCompleted && currentBooking.customerId) {
      const customer = await this.getCustomer(currentBooking.customerId);
      if (customer && customer.visitCount > 0) {
        await db.update(customers)
          .set({
            visitCount: customer.visitCount - 1,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customer.id));
      }
    }

    const [booking] = await db.update(bookings)
      .set({ status, visitCompleted: false }) // 취소/거절 시 visitCompleted도 리셋
      .where(eq(bookings.id, id))
      .returning();
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

  async updateBookingRemind(id: number): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings)
      .set({ remindSent: true, remindSentAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  async getTomorrowBookings(shopId: number): Promise<(Booking & { serviceName: string })[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const baseSelect = {
      id: bookings.id,
      shopId: bookings.shopId,
      customerId: bookings.customerId,
      date: bookings.date,
      time: bookings.time,
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      petName: bookings.petName,
      petBreed: bookings.petBreed,
      status: bookings.status,
      serviceId: bookings.serviceId,
      memo: bookings.memo,
      depositStatus: bookings.depositStatus,
      depositDeadline: bookings.depositDeadline,
      isFirstVisit: bookings.isFirstVisit,
      remindSent: bookings.remindSent,
      remindSentAt: bookings.remindSentAt,
      visitCompleted: bookings.visitCompleted,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      serviceName: services.name,
    };

    return await db.select(baseSelect)
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .where(
        and(
          eq(bookings.shopId, shopId),
          eq(bookings.date, tomorrowStr),
          eq(bookings.status, 'confirmed')
        )
      )
      .orderBy(bookings.time);
  }

  async getRevenueStats(shopId: number, startDate: string, endDate: string): Promise<{
    totalRevenue: number;
    bookingCount: number;
    byService: { serviceName: string; revenue: number; count: number }[];
    byDate: { date: string; revenue: number; count: number }[];
    byHour: { hour: number; revenue: number; count: number }[];
    byDayOfWeek: { dayOfWeek: number; revenue: number; count: number }[];
  }> {
    // 확정된 예약만 조회 (confirmed 상태)
    const confirmedBookings = await db.select({
      date: bookings.date,
      time: bookings.time,
      serviceName: services.name,
      price: services.price,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .where(
      and(
        eq(bookings.shopId, shopId),
        eq(bookings.status, 'confirmed'),
        gte(bookings.date, startDate),
        lte(bookings.date, endDate)
      )
    );

    // 총 매출 및 예약 수
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.price || 0), 0);
    const bookingCount = confirmedBookings.length;

    // 서비스별 매출
    const serviceMap = new Map<string, { revenue: number; count: number }>();
    confirmedBookings.forEach(b => {
      const current = serviceMap.get(b.serviceName) || { revenue: 0, count: 0 };
      serviceMap.set(b.serviceName, {
        revenue: current.revenue + (b.price || 0),
        count: current.count + 1,
      });
    });
    const byService = Array.from(serviceMap.entries()).map(([serviceName, data]) => ({
      serviceName,
      ...data,
    }));

    // 날짜별 매출
    const dateMap = new Map<string, { revenue: number; count: number }>();
    confirmedBookings.forEach(b => {
      const current = dateMap.get(b.date) || { revenue: 0, count: 0 };
      dateMap.set(b.date, {
        revenue: current.revenue + (b.price || 0),
        count: current.count + 1,
      });
    });
    const byDate = Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 시간대별 매출
    const hourMap = new Map<number, { revenue: number; count: number }>();
    confirmedBookings.forEach(b => {
      const hour = parseInt(b.time.split(':')[0]);
      const current = hourMap.get(hour) || { revenue: 0, count: 0 };
      hourMap.set(hour, {
        revenue: current.revenue + (b.price || 0),
        count: current.count + 1,
      });
    });
    const byHour = Array.from(hourMap.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => a.hour - b.hour);

    // 요일별 매출 (0: 일요일, 6: 토요일)
    const dayMap = new Map<number, { revenue: number; count: number }>();
    confirmedBookings.forEach(b => {
      const dayOfWeek = new Date(b.date).getDay();
      const current = dayMap.get(dayOfWeek) || { revenue: 0, count: 0 };
      dayMap.set(dayOfWeek, {
        revenue: current.revenue + (b.price || 0),
        count: current.count + 1,
      });
    });
    const byDayOfWeek = Array.from(dayMap.entries())
      .map(([dayOfWeek, data]) => ({ dayOfWeek, ...data }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    return {
      totalRevenue,
      bookingCount,
      byService,
      byDate,
      byHour,
      byDayOfWeek,
    };
  }

  // ===== 구독 관련 메서드 =====
  async createSubscription(data: any) {
    const [subscription] = await db.insert(subscriptions).values(data).returning();
    return subscription;
  }

  async getAllSubscriptions() {
    return await db
      .select()
      .from(subscriptions)
      .orderBy(subscriptions.createdAt);
  }

  async getSubscriptionsByShop(shopId: number) {
    return await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.shopId, shopId))
      .orderBy(subscriptions.createdAt);
  }

  async updateShopSubscription(shopId: number, data: {
    subscriptionStatus?: string;
    subscriptionTier?: string;
    subscriptionStart?: Date;
    subscriptionEnd?: Date;
  }) {
    await db
      .update(shops)
      .set(data)
      .where(eq(shops.id, shopId));
  }

  async updateSubscriptionPaymentMethod(subscriptionId: number, paymentMethod: string) {
    await db
      .update(subscriptions)
      .set({ paymentMethod })
      .where(eq(subscriptions.id, subscriptionId));
  }

  async cancelLatestSubscription(shopId: number) {
    const subs = await this.getSubscriptionsByShop(shopId);
    if (subs.length > 0) {
      const latest = subs[subs.length - 1];
      await db.update(subscriptions).set({ autoRenew: false }).where(eq(subscriptions.id, latest.id));
    }
  }
}

export const storage = new DatabaseStorage();
