import { useAuth } from "@/hooks/use-auth";
import { useCustomers } from "@/hooks/use-shop";
import { useLocation } from "wouter";
import { Loader2, Users, Phone, Calendar, Award } from "lucide-react";
import { format } from "date-fns";

export default function Customers() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: customers, isLoading: isCustomersLoading } = useCustomers();
  const [_, setLocation] = useLocation();

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!user) {
    setLocation("/login");
    return null;
  }

  const sortedCustomers = customers?.sort((a, b) => b.visitCount - a.visitCount) || [];

  return (
    <div className="min-h-screen bg-secondary/10 pb-20">
      <div className="bg-white border-b border-border shadow-sm sticky top-16 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">고객 관리</h1>
              <p className="text-sm text-muted-foreground">총 {customers?.length || 0}명</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {isCustomersLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : customers?.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-border">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground">등록된 고객이 없습니다</h3>
            <p className="text-muted-foreground">예약이 완료되면 고객이 자동으로 등록됩니다.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-foreground">고객명</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-foreground">전화번호</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-foreground">방문 횟수</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-foreground">최근 방문</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedCustomers.map((customer, idx) => (
                  <tr key={customer.id} className="hover:bg-secondary/20 transition-colors" data-testid={`row-customer-${customer.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          {idx < 3 && (
                            <div className="flex items-center gap-1 text-xs text-yellow-600">
                              <Award className="w-3 h-3" />
                              VIP
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span className="font-mono">{customer.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {customer.visitCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{customer.lastVisit ? format(new Date(customer.lastVisit), 'yyyy-MM-dd') : '-'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
