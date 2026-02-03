import { useAuth } from "@/hooks/use-auth";
import { useCustomers } from "@/hooks/use-shop";
import { useLocation } from "wouter";
import { Loader2, Users, Phone, Calendar, Award, Search, PawPrint, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";

export default function Customers() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: customers, isLoading: isCustomersLoading } = useCustomers();
  const [_, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!user) {
    setLocation("/login");
    return null;
  }

  // 검색 및 정렬
  const filteredCustomers = useMemo(() => {
    let result = customers || [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        c.petName?.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => b.visitCount - a.visitCount);
  }, [customers, searchQuery]);

  // 통계
  const stats = useMemo(() => {
    if (!customers || customers.length === 0) return { total: 0, vip: 0, thisMonth: 0 };

    const vipCount = customers.filter(c => c.visitCount >= 3).length;
    const thisMonth = customers.filter(c => {
      if (!c.lastVisit) return false;
      const visitDate = new Date(c.lastVisit);
      const now = new Date();
      return visitDate.getMonth() === now.getMonth() && visitDate.getFullYear() === now.getFullYear();
    }).length;

    return { total: customers.length, vip: vipCount, thisMonth };
  }, [customers]);

  return (
    <div className="min-h-screen bg-secondary/10 pb-20">
      {/* 헤더 */}
      <div className="bg-white border-b border-border shadow-sm sticky top-16 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">고객 관리</h1>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
            <div className="bg-primary/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-xs text-muted-foreground">전체 고객</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.vip}</div>
              <div className="text-xs text-muted-foreground">VIP (3회+)</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.thisMonth}</div>
              <div className="text-xs text-muted-foreground">이번달 방문</div>
            </div>
          </div>

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="이름, 전화번호, 반려동물 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-3xl">
        {isCustomersLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-border">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground">
              {searchQuery ? '검색 결과가 없습니다' : '등록된 고객이 없습니다'}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery ? '다른 검색어로 시도해보세요' : '예약이 완료되면 고객이 자동으로 등록됩니다.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer, idx) => (
              <div
                key={customer.id}
                className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
                data-testid={`card-customer-${customer.id}`}
              >
                <div className="flex items-start gap-3">
                  {/* 프로필 */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {customer.name.charAt(0)}
                    </div>
                    {idx < 3 && customers && customers.length > 3 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                        <Award className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">{customer.name}</span>
                      {idx < 3 && customers && customers.length > 3 && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">VIP</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {customer.phone}
                      </span>
                    </div>

                    {/* 반려동물 정보 */}
                    {customer.petName && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <PawPrint className="w-3.5 h-3.5" />
                        <span>{customer.petName}</span>
                        {customer.petBreed && <span className="text-muted-foreground/70">({customer.petBreed})</span>}
                      </div>
                    )}

                    {/* 하단 정보 */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {customer.lastVisit
                            ? format(new Date(customer.lastVisit), 'M월 d일', { locale: ko })
                            : '방문 기록 없음'
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        {customer.visitCount}회 방문
                      </div>
                    </div>
                  </div>
                </div>

                {/* 메모 */}
                {customer.memo && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-sm text-muted-foreground line-clamp-2">{customer.memo}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
