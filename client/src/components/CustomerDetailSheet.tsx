import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCustomerHistory, useUpdateCustomer } from "@/hooks/use-shop";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useState } from "react";
import {
  Phone, PawPrint, Calendar, Clock, Award, TrendingUp,
  AlertCircle, Loader2, FileText, Star, Pencil, Check, X,
} from "lucide-react";
import type { Customer } from "@shared/schema";

type CustomerWithRevenue = Customer & { totalRevenue: number; isVip?: boolean; isAtRisk?: boolean; daysSinceVisit?: number; avgCycleDays?: number };

interface CustomerDetailSheetProps {
  customer: CustomerWithRevenue | null;
  open: boolean;
  onClose: () => void;
}

export default function CustomerDetailSheet({ customer, open, onClose }: CustomerDetailSheetProps) {
  const { data: historyData, isLoading: isHistoryLoading } = useCustomerHistory(
    open && customer ? customer.phone : null
  );
  const updateCustomer = useUpdateCustomer();

  const [editingField, setEditingField] = useState<"memo" | "behaviorNotes" | "specialNotes" | null>(null);
  const [draftValue, setDraftValue] = useState("");

  function startEdit(field: "memo" | "behaviorNotes" | "specialNotes", current: string | null) {
    setEditingField(field);
    setDraftValue(current ?? "");
  }

  function cancelEdit() {
    setEditingField(null);
    setDraftValue("");
  }

  function saveEdit() {
    if (!customer || editingField === null) return;
    updateCustomer.mutate(
      { id: customer.id, data: { [editingField]: draftValue } },
      { onSuccess: () => { setEditingField(null); setDraftValue(""); } }
    );
  }

  if (!customer) return null;

  const history = historyData?.history || [];

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl px-0 pb-8">
        <SheetHeader className="px-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl flex-shrink-0">
              {customer.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-xl">{customer.name}</SheetTitle>
                {customer.isVip && (
                  <Badge className="bg-yellow-400 text-white text-xs gap-1">
                    <Award className="w-3 h-3" /> VIP
                  </Badge>
                )}
                {customer.isAtRisk && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertCircle className="w-3 h-3" /> 이탈위험
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <Phone className="w-3.5 h-3.5" />
                {customer.phone}
              </div>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        <div className="px-5 pt-4 space-y-5">
          {/* 방문 통계 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-primary/5 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-primary">{customer.visitCount}</div>
              <div className="text-xs text-muted-foreground">총 방문</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-yellow-600">
                {customer.totalRevenue.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">누적매출(원)</div>
            </div>
            <div className={`rounded-xl p-3 text-center ${customer.isAtRisk ? 'bg-red-50' : 'bg-blue-50'}`}>
              <div className={`text-xl font-bold ${customer.isAtRisk ? 'text-red-600' : 'text-blue-600'}`}>
                {customer.daysSinceVisit ?? '-'}
              </div>
              <div className="text-xs text-muted-foreground">미방문일</div>
            </div>
          </div>

          {/* 반려동물 정보 */}
          {customer.petName && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <PawPrint className="w-4 h-4" /> 반려동물
              </h3>
              <div className="bg-secondary/30 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">이름</span>
                  <span className="font-medium">{customer.petName}</span>
                </div>
                {customer.petBreed && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">품종</span>
                    <span className="font-medium">{customer.petBreed}</span>
                  </div>
                )}
                {customer.petAge && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">나이</span>
                    <span className="font-medium">{customer.petAge}</span>
                  </div>
                )}
                {customer.petWeight && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">몸무게</span>
                    <span className="font-medium">{customer.petWeight}kg</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 방문 일정 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> 방문 일정
            </h3>
            <div className="bg-secondary/30 rounded-xl p-3 space-y-1">
              {customer.firstVisitDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">첫 방문</span>
                  <span className="font-medium">
                    {format(new Date(customer.firstVisitDate), 'yyyy년 M월 d일', { locale: ko })}
                  </span>
                </div>
              )}
              {customer.lastVisit && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">마지막 방문</span>
                  <span className="font-medium">
                    {format(new Date(customer.lastVisit), 'yyyy년 M월 d일', { locale: ko })}
                  </span>
                </div>
              )}
              {customer.avgCycleDays && customer.avgCycleDays > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">평균 방문 주기</span>
                  <span className="font-medium">약 {Math.round(customer.avgCycleDays)}일</span>
                </div>
              )}
              {customer.lastVisit && customer.avgCycleDays && customer.avgCycleDays > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">다음 예상 방문</span>
                  <span className="font-medium text-green-600">
                    {format(
                      new Date(new Date(customer.lastVisit).getTime() + customer.avgCycleDays * 86400000),
                      'M월 d일',
                      { locale: ko }
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 메모 / 특이사항 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <FileText className="w-4 h-4" /> 메모 / 특이사항
            </h3>
            <div className="space-y-2">
              {/* 메모 */}
              {editingField === "memo" ? (
                <div className="bg-secondary/30 rounded-xl p-3 text-sm space-y-2">
                  <div className="text-xs text-muted-foreground">메모</div>
                  <textarea
                    className="w-full rounded-lg border border-input bg-background p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                    rows={3}
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-secondary transition-colors">
                      <X className="w-3 h-3" /> 취소
                    </button>
                    <button onClick={saveEdit} disabled={updateCustomer.isPending} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50">
                      <Check className="w-3 h-3" /> 저장
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-secondary/30 rounded-xl p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">메모</span>
                    <button onClick={() => startEdit("memo", customer.memo)} className="p-1 rounded hover:bg-secondary transition-colors">
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                  {customer.memo
                    ? <p className="whitespace-pre-wrap">{customer.memo}</p>
                    : <p className="text-muted-foreground italic">메모 없음 — 연필 아이콘을 눌러 추가하세요</p>
                  }
                </div>
              )}

              {/* 행동 특이사항 */}
              {editingField === "behaviorNotes" ? (
                <div className="bg-orange-50 rounded-xl p-3 text-sm space-y-2">
                  <div className="text-xs text-orange-500">행동 특이사항</div>
                  <textarea
                    className="w-full rounded-lg border border-input bg-background p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                    rows={3}
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-secondary transition-colors">
                      <X className="w-3 h-3" /> 취소
                    </button>
                    <button onClick={saveEdit} disabled={updateCustomer.isPending} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50">
                      <Check className="w-3 h-3" /> 저장
                    </button>
                  </div>
                </div>
              ) : (customer.behaviorNotes || true) && (
                <div className="bg-orange-50 rounded-xl p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-orange-500">행동 특이사항</span>
                    <button onClick={() => startEdit("behaviorNotes", customer.behaviorNotes)} className="p-1 rounded hover:bg-orange-100 transition-colors">
                      <Pencil className="w-3 h-3 text-orange-400" />
                    </button>
                  </div>
                  {customer.behaviorNotes
                    ? <p className="whitespace-pre-wrap">{customer.behaviorNotes}</p>
                    : <p className="text-orange-300 italic">없음</p>
                  }
                </div>
              )}

              {/* 특별 요청 */}
              {editingField === "specialNotes" ? (
                <div className="bg-blue-50 rounded-xl p-3 text-sm space-y-2">
                  <div className="text-xs text-blue-500">특별 요청</div>
                  <textarea
                    className="w-full rounded-lg border border-input bg-background p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                    rows={3}
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-secondary transition-colors">
                      <X className="w-3 h-3" /> 취소
                    </button>
                    <button onClick={saveEdit} disabled={updateCustomer.isPending} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50">
                      <Check className="w-3 h-3" /> 저장
                    </button>
                  </div>
                </div>
              ) : (customer.specialNotes || true) && (
                <div className="bg-blue-50 rounded-xl p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-blue-500">특별 요청</span>
                    <button onClick={() => startEdit("specialNotes", customer.specialNotes)} className="p-1 rounded hover:bg-blue-100 transition-colors">
                      <Pencil className="w-3 h-3 text-blue-400" />
                    </button>
                  </div>
                  {customer.specialNotes
                    ? <p className="whitespace-pre-wrap">{customer.specialNotes}</p>
                    : <p className="text-blue-300 italic">없음</p>
                  }
                </div>
              )}
            </div>
          </div>

          {/* 방문 이력 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="w-4 h-4" /> 방문 이력
            </h3>
            {isHistoryLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground bg-secondary/30 rounded-xl">
                방문 이력이 없습니다
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((booking: any) => (
                  <div key={booking.id} className="bg-secondary/30 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{booking.serviceName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {booking.date} {booking.time}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {booking.status === 'confirmed' ? '완료' : booking.status === 'pending' ? '대기' : '취소'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
