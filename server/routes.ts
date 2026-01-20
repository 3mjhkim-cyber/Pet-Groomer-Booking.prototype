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

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

function requireSuperAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || req.user.role !== 'super_admin') {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

function requireShopOwner(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || (req.user.role !== 'shop_owner' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const SessionStore = MemoryStore(session);
  
  app.use(session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    store: new SessionStore({ checkPeriod: 86400000 }),
    cookie: { secure: process.env.NODE_ENV === "production" }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByUsername(email);
        if (!user) return done(null, false);
        
        // 테스트 계정은 비밀번호 검증 없이 로그인 허용
        const testAccounts: Record<string, string> = {
          'test@test.com': '1234',
          'admin@jeongrihagae.com': 'admin1234'
        };
        
        if (testAccounts[email] && password === testAccounts[email]) {
          return done(null, user);
        }
        
        // 일반 계정은 해시 비밀번호 검증
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

  // Auth Routes
  app.post(api.auth.login.path, passport.authenticate("local"), async (req, res) => {
    const user = req.user as any;
    let shop = null;
    if (user.shopId) {
      shop = await storage.getShop(user.shopId);
      const bypassApproval = user.role === 'super_admin' || user.email === 'test@test.com';
      if (shop && !shop.isApproved && !bypassApproval) {
        req.logout((err) => {
          if (err) console.error('Logout error:', err);
        });
        return res.status(403).json({ message: "가맹점 승인 대기중입니다. 승인 후 로그인이 가능합니다." });
      }
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({ ...userWithoutPassword, shop });
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

  // Shop Registration
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

      const shop = await storage.createShop(shopInput);
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        role: 'shop_owner',
        shopId: shop.id,
        shopName: shop.name,
        phone: shop.phone,
        address: shop.address,
      });

      res.status(201).json({ shop, user: { ...user, password: undefined } });
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

  app.delete('/api/admin/shops/:id', requireSuperAdmin, async (req, res) => {
    const shop = await storage.updateShop(Number(req.params.id), { isApproved: false });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }
    res.json(shop);
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
    const { name, phone, address, businessHours, depositAmount, depositRequired } = req.body;
    const shop = await storage.updateShop(user.shopId, {
      name, phone, address, businessHours, depositAmount, depositRequired
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

  // Bookings (shop-scoped)
  app.get(api.bookings.list.path, requireAuth, async (req, res) => {
    const user = req.user as any;
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
      const input = api.bookings.create.input.parse(req.body);
      const booking = await storage.createBooking(input);
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

  // Seed Data - Super Admin
  if (await storage.getUserByUsername("admin@jeongrihagae.com") === undefined) {
    const hashedPassword = await hashPassword("admin1234");
    await storage.createUser({
      email: "admin@jeongrihagae.com",
      password: hashedPassword,
      role: 'super_admin',
      shopId: null,
      shopName: null,
      phone: null,
      address: null,
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

  if (await storage.getUserByUsername("test@test.com") === undefined) {
    const hashedPassword = await hashPassword("1234");
    await storage.createUser({
      email: "test@test.com",
      password: hashedPassword,
      role: 'shop_owner',
      shopId: demoShop.id,
      shopName: "정리하개 강남점",
      phone: "02-123-4567",
      address: "서울 강남구 테헤란로 123"
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
