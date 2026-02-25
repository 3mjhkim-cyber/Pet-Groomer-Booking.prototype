import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import MemoryStore from "memorystore";
import { insertShopSchema, Shop } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// 인증 미들웨어: 로그인 여부 확인
function requireAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }
  next();
}

// Super Admin 권한 체크
function requireSuperAdmin(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: "접근 권한이 없습니다." });
  }
  next();
}

// Shop Owner 권한 체크
function requireShopOwner(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }
  if (req.user.role !== 'shop_owner' && req.user.role !== 'super_admin') {
    return res.status(403).json({ message: "접근 권한이 없습니다." });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const SessionStore = MemoryStore(session);
  
  app.set("trust proxy", 1);
  
  app.use(session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    store: new SessionStore({ checkPeriod: 86400000 }),
    cookie: { 
      secure: false,
      sameSite: "lax",
      httpOnly: true
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByUsername(email);
        if (!user) return done(null, false);
        
        // 비밀번호 검증
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) return done(null, false);
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // 로그인 API
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "이메일과 비밀번호를 입력해주세요." });
      }
      
      const user = await storage.getUserByUsername(email);
      if (!user) {
        return res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
      }
      
      // 비밀번호 검증
      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
      }

      // 승인 시스템 제거 - 모든 사용자 바로 로그인 가능

      let shop = null;
      if (user.shopId) {
        shop = await storage.getShop(user.shopId);
      }
      
      // 세션에 사용자 저장
      (req as any).login(user, (err: any) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ message: "로그인 처리 중 오류가 발생했습니다." });
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json({ ...userWithoutPassword, shop });
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: "로그인 처리 중 오류가 발생했습니다." });
    }
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    if (!req.user) return res.json(null);
    const user = req.user as any;
    let shop = null;
    if (user.shopId) {
      shop = await storage.getShop(user.shopId);
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({ ...userWithoutPassword, shop });
  });

  // 비밀번호 변경
  app.post('/api/user/change-password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user as any;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "현재 비밀번호와 새 비밀번호를 입력해주세요." });
      }

      // 비밀번호 형식 검증
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          message: "비밀번호는 영문 대문자, 소문자, 숫자, 특수문자를 포함하여 10자 이상이어야 합니다."
        });
      }

      // 현재 사용자 정보 가져오기
      const currentUser = await storage.getUser(user.id);
      if (!currentUser) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }

      // 현재 비밀번호 확인
      const isPasswordValid = await comparePasswords(currentPassword, currentUser.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "현재 비밀번호가 일치하지 않습니다." });
      }

      // 새 비밀번호 해시화 및 저장
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);

      res.json({ message: "비밀번호가 성공적으로 변경되었습니다." });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ message: "비밀번호 변경 중 오류가 발생했습니다." });
    }
  });

  // 포트원 결제 검증
  app.post('/api/payment/confirm', requireAuth, async (req, res) => {
    try {
      const { paymentId, txId, tier } = req.body;
      const user = req.user as any;

      if (!user.shopId) {
        return res.status(400).json({ message: "가맹점 정보가 없습니다." });
      }

      if (!paymentId) {
        return res.status(400).json({ message: "결제 정보가 올바르지 않습니다." });
      }

      // 포트원 API로 결제 검증
      const portoneApiSecret = process.env.PORTONE_API_SECRET;
      if (!portoneApiSecret) {
        return res.status(500).json({ message: "결제 시스템 설정 오류입니다." });
      }

      const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
        headers: {
          'Authorization': `PortOne ${portoneApiSecret}`,
        },
      });

      const paymentData = await response.json();

      if (!response.ok || paymentData.status !== 'PAID') {
        console.error('PortOne Payment Error:', paymentData);
        return res.status(400).json({ message: '결제 검증에 실패했습니다.' });
      }

      // 플랜별 금액 검증
      const PLAN_PRICES: Record<string, number> = {
        basic: 29000,
        premium: 49000,
        enterprise: 99000,
      };
      const expectedAmount = PLAN_PRICES[tier || 'basic'];
      if (paymentData.amount?.total !== expectedAmount) {
        console.error('PortOne Amount Mismatch:', paymentData.amount?.total, expectedAmount);
        return res.status(400).json({ message: '결제 금액이 일치하지 않습니다.' });
      }

      // 결제 성공 - 구독 활성화
      const now = new Date();
      const subscriptionEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30일 후

      await storage.updateShopSubscription(user.shopId, {
        subscriptionStatus: 'active',
        subscriptionTier: tier || 'basic',
        subscriptionStart: now,
        subscriptionEnd: subscriptionEnd,
      });

      // 결제 기록 저장
      await storage.createSubscription({
        shopId: user.shopId,
        tier: tier || 'basic',
        status: 'active',
        amount: expectedAmount,
        startDate: now,
        endDate: subscriptionEnd,
        autoRenew: true,
        paymentMethod: paymentData.method?.type || 'card',
      });

      res.json({
        success: true,
        message: '결제가 완료되었습니다.',
        subscription: {
          status: 'active',
          tier: tier || 'basic',
          endDate: subscriptionEnd,
        },
      });
    } catch (error: any) {
      console.error('Payment confirm error:', error);
      res.status(500).json({ message: error.message || '결제 처리 중 오류가 발생했습니다.' });
    }
  });

  app.post('/api/payment/demo-confirm', requireAuth, async (req, res) => {
    try {
      const { tier, amount } = req.body;
      const user = req.user as any;

      if (!user.shopId) {
        return res.status(400).json({ message: "가맹점 정보가 없습니다." });
      }

      const PLAN_PRICES: Record<string, number> = {
        basic: 29000,
        premium: 49000,
        enterprise: 99000,
      };

      const validTier = tier && PLAN_PRICES[tier] ? tier : 'basic';
      const expectedAmount = PLAN_PRICES[validTier];

      if (amount !== expectedAmount) {
        return res.status(400).json({ message: '결제 금액이 일치하지 않습니다.' });
      }

      const now = new Date();
      const subscriptionEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await storage.updateShopSubscription(user.shopId, {
        subscriptionStatus: 'active',
        subscriptionTier: validTier,
        subscriptionStart: now,
        subscriptionEnd: subscriptionEnd,
      });

      await storage.createSubscription({
        shopId: user.shopId,
        tier: validTier,
        status: 'active',
        amount: expectedAmount,
        startDate: now,
        endDate: subscriptionEnd,
        autoRenew: true,
        paymentMethod: 'demo',
      });

      res.json({
        success: true,
        message: '데모 결제가 완료되었습니다.',
        subscription: {
          status: 'active',
          tier: validTier,
          endDate: subscriptionEnd,
        },
      });
    } catch (error: any) {
      console.error('Demo payment error:', error);
      res.status(500).json({ message: error.message || '결제 처리 중 오류가 발생했습니다.' });
    }
  });

  // 가맹점 등록 (pending 상태로 생성)
  app.post('/api/shops/register', async (req, res) => {
    try {
      const { email, password, shop: shopData } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "이메일과 비밀번호를 입력해주세요." });
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: "비밀번호는 영문 대문자, 소문자, 숫자, 특수문자를 포함하여 10자 이상이어야 합니다." });
      }

      const name = shopData?.name?.trim();
      const phone = shopData?.phone?.trim();
      const address = shopData?.address?.trim();
      const businessNumber = shopData?.businessNumber?.trim() || null;

      if (!name || name.length < 2) {
        return res.status(400).json({ message: "가게 이름을 2글자 이상 입력해주세요." });
      }
      if (!phone || phone.length < 9) {
        return res.status(400).json({ message: "전화번호를 올바르게 입력해주세요." });
      }
      if (!address || address.length < 5) {
        return res.status(400).json({ message: "주소를 검색하여 선택해주세요." });
      }

      const existingUser = await storage.getUserByUsername(email);
      if (existingUser) {
        return res.status(400).json({ message: "이미 사용중인 이메일입니다." });
      }

      const generateSlug = (shopName: string) => {
        const base = shopName.toLowerCase()
          .replace(/[^a-z0-9가-힣]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'shop';
        return `${base}-${Date.now()}`;
      };

      const shopInput = {
        name,
        slug: generateSlug(name),
        phone,
        address,
        businessHours: shopData.businessHours || '09:00-18:00',
        depositAmount: shopData.depositAmount || 10000,
        depositRequired: shopData.depositRequired ?? true,
      };

      // 가게는 미승인 상태로 생성
      const shop = await storage.createShop(shopInput);
      const hashedPassword = await hashPassword(password);
      
      // 사용자는 active 상태로 생성 (자동 승인)
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        role: 'shop_owner',
        status: 'active',
        shopId: shop.id,
        shopName: shop.name,
        phone: shop.phone,
        address: shop.address,
        businessNumber,
      });

      res.status(201).json({
        message: "가입이 완료되었습니다. 로그인 후 구독을 활성화하시면 바로 서비스를 이용하실 수 있습니다.",
        shop,
        user: { ...user, password: undefined }
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Super Admin Routes
  app.get('/api/admin/shops', requireSuperAdmin, async (req, res) => {
    const shops = await storage.getShops();
    res.json(shops);
  });

  app.patch('/api/admin/shops/:id/approve', requireSuperAdmin, async (req, res) => {
    const shop = await storage.approveShop(Number(req.params.id));
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    res.json(shop);
  });

  // 슈퍼관리자용 가맹점 정보 수정
  app.patch('/api/admin/shops/:id', requireSuperAdmin, async (req, res) => {
    const { name, phone, address, businessHours, depositAmount, depositRequired, isApproved, subscriptionStatus, subscriptionTier, subscriptionEnd, password } = req.body;

    console.log('[Admin Shop Update] Request body:', req.body);
    console.log('[Admin Shop Update] Subscription fields:', { subscriptionStatus, subscriptionTier, subscriptionEnd });

    // 현재 shop 정보 가져오기
    const currentShop = await storage.getShop(Number(req.params.id));
    if (!currentShop) {
      return res.status(404).json({ message: "가맹점을 찾을 수 없습니다." });
    }

    const updates: any = {
      name, phone, address, businessHours, depositAmount, depositRequired, isApproved
    };

    // 구독 정보가 있으면 추가
    if (subscriptionStatus !== undefined) {
      updates.subscriptionStatus = subscriptionStatus;

      // 구독을 활성화하는데 시작일이 없으면 현재 시간으로 설정
      if (subscriptionStatus === 'active' && !currentShop.subscriptionStart) {
        updates.subscriptionStart = new Date();
      }
    }

    if (subscriptionTier !== undefined) {
      updates.subscriptionTier = subscriptionTier;
    }

    if (subscriptionEnd !== undefined) {
      updates.subscriptionEnd = subscriptionEnd ? new Date(subscriptionEnd) : null;
    }

    console.log('[Admin Shop Update] Updates to apply:', updates);

    const shop = await storage.updateShop(Number(req.params.id), updates);
    if (!shop) {
      return res.status(404).json({ message: "가맹점을 찾을 수 없습니다." });
    }

    // 비밀번호 변경이 요청된 경우
    if (password && password.trim()) {
      const hashedPassword = await hashPassword(password);
      await storage.updateUserPassword(currentShop.userId, hashedPassword);
      console.log('[Admin Shop Update] Password updated for shop user');
    }

    console.log('[Admin Shop Update] Updated shop:', shop);
    res.json(shop);
  });

  // 슈퍼관리자용 가맹점 완전 삭제
  app.delete('/api/admin/shops/:id', requireSuperAdmin, async (req, res) => {
    const shop = await storage.getShop(Number(req.params.id));
    if (!shop) {
      return res.status(404).json({ message: "가맹점을 찾을 수 없습니다." });
    }
    await storage.deleteShop(Number(req.params.id));
    res.json({ message: "가맹점이 삭제되었습니다.", shop });
  });

  // 계정 승인 관리 API (Super Admin 전용)
  app.get('/api/admin/pending-users', requireSuperAdmin, async (req, res) => {
    const users = await storage.getPendingUsers();
    res.json(users);
  });

  app.get('/api/admin/pending-users/count', requireSuperAdmin, async (req, res) => {
    const count = await storage.getPendingUsersCount();
    res.json({ count });
  });

  app.patch('/api/admin/users/:id/approve', requireSuperAdmin, async (req, res) => {
    const user = await storage.updateUserStatus(Number(req.params.id), 'approved');
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }
    // 사용자의 가게도 승인
    if (user.shopId) {
      await storage.approveShop(user.shopId);
    }
    res.json(user);
  });

  app.patch('/api/admin/users/:id/reject', requireSuperAdmin, async (req, res) => {
    const user = await storage.updateUserStatus(Number(req.params.id), 'rejected');
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }
    res.json(user);
  });

  // Shop Settings (for shop owners)
  app.get('/api/shop/settings', requireShopOwner, async (req, res) => {
    const user = req.user as any;
    if (!user.shopId) {
      return res.status(400).json({ message: "No shop associated" });
    }
    const shop = await storage.getShop(user.shopId);
    res.json(shop);
  });

  app.patch('/api/shop/settings', requireShopOwner, async (req, res) => {
    const user = req.user as any;
    if (!user.shopId) {
      return res.status(400).json({ message: "No shop associated" });
    }
    const { name, phone, address, businessHours, depositAmount, depositRequired, businessDays, closedDates, shopMemo, blockedSlots, forceOpenSlots } = req.body;
    const shop = await storage.updateShop(user.shopId, {
      name, phone, address, businessHours, depositAmount, depositRequired, businessDays, closedDates, shopMemo, blockedSlots, forceOpenSlots
    });
    res.json(shop);
  });

  // Public shop info
  app.get('/api/shops/:slug', async (req, res) => {
    const shop = await storage.getShopBySlug(req.params.slug);
    if (!shop || !shop.isApproved) {
      return res.status(404).json({ message: "Shop not found" });
    }
    res.json({
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      phone: shop.phone,
      address: shop.address,
      businessHours: shop.businessHours,
      businessDays: shop.businessDays,
      closedDates: shop.closedDates,
      blockedSlots: shop.blockedSlots,
      shopMemo: shop.shopMemo,
      depositAmount: shop.depositAmount,
      depositRequired: shop.depositRequired,
    });
  });

  // Services (shop-scoped)
  app.get(api.services.list.path, async (req, res) => {
    const services = await storage.getServices();
    res.json(services);
  });

  app.get('/api/shops/:slug/services', async (req, res) => {
    const shop = await storage.getShopBySlug(req.params.slug);
    if (!shop || !shop.isApproved) {
      return res.status(404).json({ message: "Shop not found" });
    }
    const services = await storage.getServicesByShop(shop.id);
    res.json(services);
  });

  app.get('/api/shop/services', requireShopOwner, async (req, res) => {
    const user = req.user as any;
    const services = await storage.getServices(user.shopId);
    res.json(services);
  });

  app.post('/api/shop/services', requireShopOwner, async (req, res) => {
    const user = req.user as any;
    const { name, duration, price } = req.body;
    const service = await storage.createService({
      shopId: user.shopId,
      name,
      duration,
      price,
    });
    res.status(201).json(service);
  });

  app.patch('/api/shop/services/:id', requireShopOwner, async (req, res) => {
    const { name, duration, price, isActive } = req.body;
    const service = await storage.updateService(Number(req.params.id), {
      name, duration, price, isActive
    });
    res.json(service);
  });

  app.delete('/api/shop/services/:id', requireShopOwner, async (req, res) => {
    await storage.deleteService(Number(req.params.id));
    res.json({ message: "Service deleted" });
  });

  // Customers (shop-scoped)
  app.get(api.customers.list.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const customers = await storage.getCustomers(user.shopId);
    res.json(customers);
  });

  app.get('/api/customers/search', requireAuth, async (req, res) => {
    const user = req.user as any;
    const query = req.query.q as string || '';
    const customers = await storage.searchCustomers(query, user.shopId);
    res.json(customers);
  });

  app.get('/api/customers/:phone/history', requireAuth, async (req, res) => {
    const user = req.user as any;
    const phone = decodeURIComponent(req.params.phone);
    const customer = await storage.getCustomerByPhone(phone, user.shopId);
    const history = await storage.getCustomerHistory(phone, user.shopId);
    res.json({ customer, history });
  });

  // 고객 상세 정보 조회 (ID로)
  app.get('/api/customers/:id', requireAuth, async (req, res) => {
    const customer = await storage.getCustomer(Number(req.params.id));
    if (!customer) {
      return res.status(404).json({ message: "고객을 찾을 수 없습니다." });
    }
    res.json(customer);
  });

  // 고객 정보 수정
  app.patch('/api/customers/:id', requireAuth, async (req, res) => {
    const { name, phone, petName, petBreed, petAge, petWeight, memo, behaviorNotes, specialNotes } = req.body;
    const customer = await storage.updateCustomer(Number(req.params.id), {
      name, phone, petName, petBreed, petAge, petWeight, memo, behaviorNotes, specialNotes
    });
    if (!customer) {
      return res.status(404).json({ message: "고객을 찾을 수 없습니다." });
    }
    res.json(customer);
  });

  // 고객 전화번호로 기존 고객 조회 (공개 API)
  app.get('/api/shops/:slug/customers/check', async (req, res) => {
    const shop = await storage.getShopBySlug(req.params.slug);
    if (!shop || !shop.isApproved) {
      return res.status(404).json({ message: "가맹점을 찾을 수 없습니다." });
    }
    const phone = req.query.phone as string;
    if (!phone) {
      return res.status(400).json({ message: "전화번호를 입력해주세요." });
    }
    const customer = await storage.getCustomerByPhone(phone, shop.id);
    if (customer) {
      res.json({ exists: true, customer });
    } else {
      res.json({ exists: false });
    }
  });

  // Bookings (shop-scoped)
  app.get(api.bookings.list.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    // 지난 예약들 자동으로 방문 완료 처리 (방문 횟수 증가)
    await storage.processCompletedBookings(user.shopId);
    const bookings = await storage.getBookings(user.shopId);
    res.json(bookings);
  });

  app.get('/api/bookings/:id', async (req, res) => {
    const booking = await storage.getBooking(Number(req.params.id));
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  });

  app.post(api.bookings.create.path, async (req, res) => {
    try {
      const { petName, petBreed, petAge, petWeight, memo, ...rest } = req.body;
      const input = api.bookings.create.input.parse(rest);
      
      // 시간대 중복 체크
      const bookedSlots = await storage.getBookedTimeSlots(input.shopId!, input.date);
      const service = await storage.getService(input.serviceId);
      const serviceDuration = service?.duration || 60;
      
      const newTimeMinutes = parseInt(input.time.split(':')[0]) * 60 + parseInt(input.time.split(':')[1]);
      const newEndMinutes = newTimeMinutes + serviceDuration;
      
      for (const slot of bookedSlots) {
        const slotMinutes = parseInt(slot.time.split(':')[0]) * 60 + parseInt(slot.time.split(':')[1]);
        const slotEndMinutes = slotMinutes + slot.duration;
        
        // 시간대가 겹치는지 확인
        if (newTimeMinutes < slotEndMinutes && newEndMinutes > slotMinutes) {
          return res.status(400).json({ message: "이미 예약된 시간입니다. 다른 시간을 선택해주세요." });
        }
      }
      
      // 고객 생성 또는 업데이트
      const { customer, isFirstVisit } = await storage.createOrUpdateCustomerFromBooking({
        shopId: input.shopId ?? null,
        name: input.customerName,
        phone: input.customerPhone,
        petName,
        petBreed,
        petAge,
        petWeight,
        memo,
      });
      
      // 예약 생성
      const booking = await storage.createBooking({
        ...input,
        customerId: customer.id,
        petName,
        petBreed,
        memo,
        isFirstVisit,
      } as any);
      
      res.status(201).json(booking);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch('/api/bookings/:id/approve', requireAuth, async (req, res) => {
    const booking = await storage.updateBookingStatus(Number(req.params.id), 'confirmed');
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  });

  app.patch('/api/bookings/:id/reject', requireAuth, async (req, res) => {
    const booking = await storage.updateBookingStatus(Number(req.params.id), 'rejected');
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  });

  app.patch('/api/bookings/:id/deposit-request', requireAuth, async (req, res) => {
    const booking = await storage.requestDeposit(Number(req.params.id));
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  });

  app.patch('/api/bookings/:id/deposit-confirm', async (req, res) => {
    const booking = await storage.confirmDeposit(Number(req.params.id));
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  });

  // 관리자용 입금확인 (depositStatus=paid, status=confirmed)
  app.patch('/api/bookings/:id/admin-confirm-deposit', requireAuth, async (req, res) => {
    const bookingId = Number(req.params.id);

    // depositStatus를 paid로, status를 confirmed로 변경
    const booking = await storage.updateBookingStatus(bookingId, 'confirmed');
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // depositStatus도 paid로 업데이트
    const updatedBooking = await storage.confirmDeposit(bookingId);
    res.json(updatedBooking);
  });

  // 예약 취소 (cancelled 상태로 변경, 시간대 해제)
  app.patch('/api/bookings/:id/cancel', requireAuth, async (req, res) => {
    const booking = await storage.updateBookingStatus(Number(req.params.id), 'cancelled');
    if (!booking) {
      return res.status(404).json({ message: "예약을 찾을 수 없습니다." });
    }
    res.json(booking);
  });

  // 리마인드 전송 표시
  app.patch('/api/bookings/:id/remind', requireAuth, async (req, res) => {
    const booking = await storage.updateBookingRemind(Number(req.params.id));
    if (!booking) {
      return res.status(404).json({ message: "예약을 찾을 수 없습니다." });
    }
    res.json(booking);
  });

  // 내일 예약 조회
  app.get('/api/shop/bookings/tomorrow', requireAuth, async (req, res) => {
    const user = req.user as any;
    if (!user.shopId) {
      return res.status(400).json({ message: "No shop associated" });
    }
    const bookings = await storage.getTomorrowBookings(user.shopId);
    res.json(bookings);
  });

  // 예약 정보 수정 (날짜, 시간, 서비스)
  app.patch('/api/bookings/:id', requireAuth, async (req, res) => {
    const { date, time, serviceId } = req.body;
    const bookingId = Number(req.params.id);
    
    // 기존 예약 조회
    const existingBooking = await storage.getBooking(bookingId);
    if (!existingBooking) {
      return res.status(404).json({ message: "예약을 찾을 수 없습니다." });
    }
    
    // 새 시간대로 변경하는 경우 중복 체크
    if (date || time) {
      const newDate = date || existingBooking.date;
      const newTime = time || existingBooking.time;
      const newServiceId = serviceId || existingBooking.serviceId;
      
      // 해당 날짜의 예약된 시간대 조회 (자기 자신 제외)
      const bookedSlots = await storage.getBookedTimeSlots(existingBooking.shopId!, newDate);
      const filteredSlots = bookedSlots.filter(slot => {
        // 자기 자신의 예약은 제외
        if (existingBooking.date === newDate && existingBooking.time === slot.time) {
          return false;
        }
        return true;
      });
      
      // 새 서비스의 소요시간 가져오기
      const newService = await storage.getService(newServiceId);
      const newDuration = newService?.duration || 60;
      
      // 시간대 충돌 체크
      const newTimeMinutes = parseInt(newTime.split(':')[0]) * 60 + parseInt(newTime.split(':')[1]);
      const newEndMinutes = newTimeMinutes + newDuration;
      
      for (const slot of filteredSlots) {
        const slotMinutes = parseInt(slot.time.split(':')[0]) * 60 + parseInt(slot.time.split(':')[1]);
        const slotEndMinutes = slotMinutes + slot.duration;
        
        // 시간대가 겹치는지 확인
        if (newTimeMinutes < slotEndMinutes && newEndMinutes > slotMinutes) {
          return res.status(400).json({ message: "해당 시간에 이미 예약이 있습니다." });
        }
      }
    }
    
    const booking = await storage.updateBooking(bookingId, { date, time, serviceId });
    if (!booking) {
      return res.status(404).json({ message: "예약을 찾을 수 없습니다." });
    }
    res.json(booking);
  });

  // 고객 정보 수정
  app.patch('/api/bookings/:id/customer', requireAuth, async (req, res) => {
    const { customerName, customerPhone } = req.body;
    const booking = await storage.updateBookingCustomer(Number(req.params.id), { customerName, customerPhone });
    if (!booking) {
      return res.status(404).json({ message: "예약을 찾을 수 없습니다." });
    }
    res.json(booking);
  });

  // 예약 가능 시간 조회 (서비스 소요시간 고려)
  app.get('/api/shops/:slug/available-times/:date', async (req, res) => {
    const shop = await storage.getShopBySlug(req.params.slug);
    if (!shop || !shop.isApproved) {
      return res.status(404).json({ message: "가맹점을 찾을 수 없습니다." });
    }

    const { date } = req.params;
    const serviceDuration = parseInt(req.query.duration as string) || 60;

    // 임시 휴무일 체크
    if (shop.closedDates) {
      try {
        const closedDates = JSON.parse(shop.closedDates);
        if (Array.isArray(closedDates) && closedDates.includes(date)) {
          return res.json([{ time: '휴무일', available: false, reason: '임시 휴무일입니다', closed: true }]);
        }
      } catch {}
    }

    // 요일별 영업시간 확인 (날짜 파싱 시 timezone 이슈 방지)
    const [year, month, day] = date.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayKey = dayKeys[dayOfWeek];

    let startHour = 9;
    let startMinute = 0;
    let endHour = 18;
    let endMinute = 0;

    // 요일별 영업시간이 설정되어 있으면 사용
    if (shop.businessDays) {
      try {
        const businessDays = JSON.parse(shop.businessDays);
        const daySchedule = businessDays[dayKey];
        if (daySchedule) {
          if (daySchedule.closed) {
            return res.json([{ time: '휴무일', available: false, reason: '정기 휴무일입니다', closed: true }]);
          }
          const [openHour, openMin] = daySchedule.open.split(':').map(Number);
          const [closeHour, closeMin] = daySchedule.close.split(':').map(Number);
          startHour = openHour;
          startMinute = openMin || 0;
          endHour = closeHour;
          endMinute = closeMin || 0;
        }
      } catch {}
    } else if (shop.businessHours && shop.businessHours.includes('-')) {
      // 기본 영업시간 파싱 (예: "09:00-18:00")
      const [startTime, endTime] = shop.businessHours.split('-');
      const [sH, sM] = startTime.split(':').map(Number);
      const [eH, eM] = endTime.split(':').map(Number);
      startHour = sH;
      startMinute = sM || 0;
      endHour = eH;
      endMinute = eM || 0;
    }

    // 30분 단위로 시간대 생성
    const allSlots: string[] = [];
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const min = minutes % 60;
      allSlots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }

    // 해당 날짜의 예약된 시간대 조회
    const bookedSlots = await storage.getBookedTimeSlots(shop.id, date);

    // 수동 차단된 시간대 확인
    let blockedSlotsForDate: string[] = [];
    if (shop.blockedSlots) {
      try {
        const allBlockedSlots = JSON.parse(shop.blockedSlots);
        if (allBlockedSlots[date] && Array.isArray(allBlockedSlots[date])) {
          blockedSlotsForDate = allBlockedSlots[date];
        }
      } catch {}
    }

    // 강제 오픈된 시간대 확인
    let forceOpenSlotsForDate: string[] = [];
    if (shop.forceOpenSlots) {
      try {
        const allForceOpenSlots = JSON.parse(shop.forceOpenSlots);
        if (allForceOpenSlots[date] && Array.isArray(allForceOpenSlots[date])) {
          forceOpenSlotsForDate = allForceOpenSlots[date];
        }
      } catch {}
    }

    // 오늘 날짜인지 확인 (지나간 시간 비활성화용) - KST(UTC+9) 기준
    const now = new Date();
    const kstOffset = 9 * 60; // KST = UTC+9
    const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
    const todayStr = `${kstTime.getUTCFullYear()}-${String(kstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(kstTime.getUTCDate()).padStart(2, '0')}`;
    const isToday = date === todayStr;
    const currentMinutes = kstTime.getUTCHours() * 60 + kstTime.getUTCMinutes();

    // 각 시간대에 대해 가능 여부 확인
    const availableSlots = allSlots.map(slot => {
      const slotMinutes = parseInt(slot.split(':')[0]) * 60 + parseInt(slot.split(':')[1]);
      const slotEndMinutes = slotMinutes + serviceDuration;

      // 오늘이면 이미 지나간 시간은 예약 불가
      if (isToday && slotMinutes <= currentMinutes) {
        return { time: slot, available: false, reason: '지난 시간' };
      }

      // 수동 차단된 시간대 확인
      if (blockedSlotsForDate.includes(slot)) {
        return { time: slot, available: false, reason: '차단됨' };
      }

      // 영업종료 시간 이후면 불가
      if (slotEndMinutes > endMinutes) {
        return { time: slot, available: false, reason: '영업시간 초과' };
      }

      // 예약된 시간대와 충돌 여부 확인 (강제 오픈된 시간대는 건너뜀)
      if (!forceOpenSlotsForDate.includes(slot)) {
        for (const booked of bookedSlots) {
          const bookedMinutes = parseInt(booked.time.split(':')[0]) * 60 + parseInt(booked.time.split(':')[1]);
          const bookedEndMinutes = bookedMinutes + booked.duration;

          // 시간대가 겹치는지 확인
          if (slotMinutes < bookedEndMinutes && slotEndMinutes > bookedMinutes) {
            return { time: slot, available: false, reason: '예약 불가' };
          }
        }
      }

      return { time: slot, available: true };
    });

    res.json(availableSlots);
  });

  // Shop owner: 특정 날짜의 예약된 시간대 조회 (시간대 관리용)
  app.get('/api/shop/booked-slots/:date', requireShopOwner, async (req, res) => {
    const user = req.user as any;
    if (!user.shopId) {
      return res.status(400).json({ message: "No shop associated" });
    }
    const { date } = req.params;
    const bookedSlots = await storage.getBookedTimeSlots(user.shopId, date);
    // 예약된 시간대 목록 반환 (시간 + duration)
    res.json(bookedSlots);
  });

  // Revenue Stats API (Shop Owner only)
  app.get('/api/revenue/stats', requireShopOwner, async (req, res) => {
    const user = req.user as any;
    if (!user.shopId) {
      return res.status(400).json({ message: "No shop associated" });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required" });
    }

    const stats = await storage.getRevenueStats(
      user.shopId,
      startDate as string,
      endDate as string
    );

    res.json(stats);
  });

  // ===== 구독 API =====
  // 구독 신청
  app.post('/api/subscriptions/subscribe', requireShopOwner, async (req, res) => {
    const user = req.user!;
    const { tier, paymentMethod } = req.body;

    if (!tier || !paymentMethod) {
      return res.status(400).json({ message: "tier and paymentMethod are required" });
    }

    const validTiers = ['basic', 'premium', 'enterprise'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ message: "Invalid subscription tier" });
    }

    const shop = await storage.getShop(user.shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // 가격 설정
    const prices: Record<string, number> = {
      basic: 29000,
      premium: 49000,
      enterprise: 99000,
    };

    const amount = prices[tier];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1개월 후

    // 구독 생성
    const subscription = await storage.createSubscription({
      shopId: user.shopId,
      tier,
      status: 'active',
      amount,
      startDate,
      endDate,
      autoRenew: true,
      paymentMethod,
    });

    // Shop의 구독 상태 업데이트
    await storage.updateShopSubscription(user.shopId, {
      subscriptionStatus: 'active',
      subscriptionTier: tier,
      subscriptionStart: startDate,
      subscriptionEnd: endDate,
    });

    res.json({ success: true, subscription });
  });

  // 구독 취소
  app.post('/api/subscriptions/cancel', requireShopOwner, async (req, res) => {
    const user = req.user!;

    await storage.updateShopSubscription(user.shopId, {
      subscriptionStatus: 'cancelled',
    });

    res.json({ success: true });
  });

  // 구독 목록 조회 (관리자용)
  app.get('/api/admin/subscriptions', requireSuperAdmin, async (req, res) => {
    const subscriptions = await storage.getAllSubscriptions();
    res.json(subscriptions);
  });

  // 가맹점 구독 상태 업데이트 (관리자용)
  app.patch('/api/admin/shops/:shopId/subscription', requireSuperAdmin, async (req, res) => {
    const { shopId } = req.params;
    const { subscriptionStatus, subscriptionTier, subscriptionStart, subscriptionEnd } = req.body;

    const updates: any = {};
    if (subscriptionStatus) updates.subscriptionStatus = subscriptionStatus;
    if (subscriptionTier) updates.subscriptionTier = subscriptionTier;
    if (subscriptionStart) updates.subscriptionStart = new Date(subscriptionStart);
    if (subscriptionEnd) updates.subscriptionEnd = new Date(subscriptionEnd);

    await storage.updateShopSubscription(parseInt(shopId), updates);

    res.json({ success: true });
  });

  // Seed Data - Super Admin
  if (await storage.getUserByUsername("admin@admin.com") === undefined) {
    const hashedPassword = await hashPassword("admin1234");
    await storage.createUser({
      email: "admin@admin.com",
      password: hashedPassword,
      role: 'super_admin',
      status: 'approved',
      shopId: null,
      shopName: null,
      phone: null,
      address: null,
      businessNumber: null,
    });
  }

  // Seed Data - Demo Shop
  let demoShop = await storage.getShopBySlug("gangnam");
  if (!demoShop) {
    demoShop = await storage.createShop({
      name: "정리하개 강남점",
      slug: "gangnam",
      phone: "02-123-4567",
      address: "서울 강남구 테헤란로 123",
      businessHours: "09:00-18:00",
      depositAmount: 10000,
      depositRequired: true,
    });
  }
  if (!demoShop.isApproved) {
    await storage.approveShop(demoShop.id);
    demoShop = await storage.getShop(demoShop.id) as Shop;
  }

  // Seed Data - 테스트 Shop Owner (새 이메일)
  if (await storage.getUserByUsername("test@shop.com") === undefined) {
    const hashedPassword = await hashPassword("test1234");
    await storage.createUser({
      email: "test@shop.com",
      password: hashedPassword,
      role: 'shop_owner',
      status: 'approved',
      shopId: demoShop.id,
      shopName: "정리하개 강남점",
      phone: "02-123-4567",
      address: "서울 강남구 테헤란로 123",
      businessNumber: null,
    });
  }

  const existingServices = await storage.getServices(demoShop.id);
  if (existingServices.length === 0) {
    await storage.createService({ shopId: demoShop.id, name: "전체미용", duration: 120, price: 50000 });
    await storage.createService({ shopId: demoShop.id, name: "부분미용", duration: 60, price: 30000 });
    await storage.createService({ shopId: demoShop.id, name: "목욕", duration: 60, price: 20000 });
  }

  return httpServer;
}
