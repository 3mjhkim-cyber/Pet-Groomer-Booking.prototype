/**
 * 휴무일 판별 유틸리티 함수
 * 특정 날짜가 휴무인지 판단하고 날짜 관련 유틸리티 제공
 */

// 요일 매핑 (영문 -> 한글)
export const DAY_NAMES: Record<string, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

// 요일 순서
export const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// 영업요일 타입 정의
export interface BusinessDay {
  open: string;
  close: string;
  closed: boolean;
}

export type BusinessDays = Record<string, BusinessDay>;

/**
 * 날짜 문자열(YYYY-MM-DD)을 요일 키(mon, tue, ...)로 변환
 */
export function getWeekdayKey(dateStr: string): string {
  const date = new Date(dateStr);
  const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return weekdays[dayIndex];
}

/**
 * 특정 날짜가 임시 휴무일인지 확인
 * @param dateStr - 확인할 날짜 (YYYY-MM-DD)
 * @param closedDatesJson - JSON 문자열로 저장된 휴무일 배열
 * @returns 휴무일 여부
 */
export function isClosedDate(dateStr: string, closedDatesJson: string | null | undefined): boolean {
  if (!closedDatesJson) return false;
  
  try {
    const closedDates = JSON.parse(closedDatesJson);
    if (!Array.isArray(closedDates)) return false;
    return closedDates.includes(dateStr);
  } catch {
    return false;
  }
}

/**
 * 특정 날짜가 정기 휴무일(요일별)인지 확인
 * @param dateStr - 확인할 날짜 (YYYY-MM-DD)
 * @param businessDaysJson - JSON 문자열로 저장된 영업요일 정보
 * @returns 정기 휴무일 여부
 */
export function isRegularClosedDay(dateStr: string, businessDaysJson: string | null | undefined): boolean {
  if (!businessDaysJson) return false;
  
  try {
    const businessDays: BusinessDays = JSON.parse(businessDaysJson);
    const weekday = getWeekdayKey(dateStr);
    const dayInfo = businessDays[weekday];
    
    if (!dayInfo) return false;
    return dayInfo.closed === true;
  } catch {
    return false;
  }
}

/**
 * 특정 날짜가 휴무인지 통합 확인 (임시 휴무 + 정기 휴무)
 * @param dateStr - 확인할 날짜 (YYYY-MM-DD)
 * @param closedDatesJson - 임시 휴무일 JSON
 * @param businessDaysJson - 영업요일 JSON
 * @returns { isClosed: boolean, reason: string }
 */
export function checkClosedStatus(
  dateStr: string,
  closedDatesJson: string | null | undefined,
  businessDaysJson: string | null | undefined
): { isClosed: boolean; reason: string } {
  // 임시 휴무일 체크
  if (isClosedDate(dateStr, closedDatesJson)) {
    return { isClosed: true, reason: '임시 휴무일' };
  }
  
  // 정기 휴무일 체크
  if (isRegularClosedDay(dateStr, businessDaysJson)) {
    const weekday = getWeekdayKey(dateStr);
    const dayName = DAY_NAMES[weekday] || weekday;
    return { isClosed: true, reason: `${dayName}요일 정기 휴무` };
  }
  
  return { isClosed: false, reason: '' };
}

/**
 * 영업요일 정보를 보기 좋은 문자열로 변환
 * 예: "월-금 09:00-18:00, 토 10:00-15:00, 일 휴무"
 */
export function formatBusinessDays(businessDaysJson: string | null | undefined): string {
  if (!businessDaysJson) return '';
  
  try {
    const businessDays: BusinessDays = JSON.parse(businessDaysJson);
    const parts: string[] = [];
    
    for (const day of DAY_ORDER) {
      const info = businessDays[day];
      if (!info) continue;
      
      const dayName = DAY_NAMES[day];
      if (info.closed) {
        parts.push(`${dayName} 휴무`);
      } else {
        parts.push(`${dayName} ${info.open}-${info.close}`);
      }
    }
    
    return parts.join(' / ');
  } catch {
    return '';
  }
}

/**
 * 다음 N일 동안의 휴무일 목록 생성
 * 캘린더에서 disable 처리할 날짜 목록 반환
 */
export function getClosedDatesInRange(
  startDate: Date,
  days: number,
  closedDatesJson: string | null | undefined,
  businessDaysJson: string | null | undefined
): string[] {
  const closedList: string[] = [];
  const current = new Date(startDate);
  
  for (let i = 0; i < days; i++) {
    const dateStr = current.toISOString().split('T')[0];
    const { isClosed } = checkClosedStatus(dateStr, closedDatesJson, businessDaysJson);
    
    if (isClosed) {
      closedList.push(dateStr);
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return closedList;
}
