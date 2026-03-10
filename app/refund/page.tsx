export default function RefundPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

        {/* 헤더 */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">환불정책</h1>
          <p className="text-sm text-gray-500">시행일: 2026년 3월 10일</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 sm:px-10 py-10 space-y-10 text-gray-700 leading-relaxed">

          {/* 안내 문구 */}
          <section>
            <p>
              정리하게(이하 "회사")는 디지털 서비스·SaaS 특성에 맞게 합리적인 환불 기준을 운영합니다.
              환불 요청 전 아래 내용을 꼼꼼히 확인해 주세요.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* 1. 환불 요청 방법 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제1조 환불 요청 방법</h2>
            <p className="mb-3">
              환불을 원하시는 경우 아래 이메일로 문의해 주세요. 요청 시 아래 정보를 함께 보내주시면 빠른 처리가 가능합니다.
            </p>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>가입 이메일(계정 정보)</li>
              <li>결제일 및 결제 금액</li>
              <li>환불 요청 사유</li>
            </ul>
            <p className="mt-3 font-medium text-gray-900">환불 문의 이메일: 3mjhkim@naver.com</p>
          </section>

          <hr className="border-gray-100" />

          {/* 2. 환불 가능 기준 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제2조 환불 가능 기준</h2>
            <p className="mb-3">아래 경우에는 환불을 요청하실 수 있습니다.</p>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>결제 후 서비스를 전혀 이용하지 않은 경우</li>
              <li>회사의 귀책 사유(서비스 오류, 장애 등)로 인해 정상적인 서비스 이용이 불가능했던 경우</li>
              <li>중복 결제 등 명백한 결제 오류가 발생한 경우</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 3. 환불 제한 사유 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제3조 환불 제한 사유</h2>
            <p className="mb-3">아래 경우에는 환불이 제한될 수 있습니다.</p>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>이용 기간의 상당 부분을 이미 사용한 경우</li>
              <li>이용자의 귀책 사유(약관 위반, 계정 정지 등)로 서비스 이용이 제한된 경우</li>
              <li>무료 체험 기간 또는 프로모션 혜택으로 제공된 서비스의 경우</li>
              <li>디지털 콘텐츠의 특성상 이용 시작 후 이용자 단순 변심에 의한 경우</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 4. 부분 환불 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제4조 부분 환불 및 차감</h2>
            <p className="mb-3">
              환불이 가능한 경우라도, 이미 서비스를 일부 이용한 기간이나 사용량에 따라 이용 요금이 차감된 후 잔여 금액만 환불될 수 있습니다.
            </p>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>구독형 서비스의 경우 잔여 기간에 해당하는 금액을 기준으로 환불 금액이 산정됩니다.</li>
              <li>구체적인 차감 기준은 환불 요청 시 담당자가 개별 안내합니다.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 5. 환불 처리 기간 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제5조 환불 처리 기간</h2>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>환불 승인 후 영업일 기준 3~7일 이내에 처리됩니다.</li>
              <li>결제수단 또는 PG사(결제대행사)의 처리 일정에 따라 실제 환급 시점이 다소 달라질 수 있습니다.</li>
              <li>신용카드의 경우, 카드사 정책에 따라 실제 반영까지 추가 시간이 소요될 수 있습니다.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 6. 문의 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제6조 문의</h2>
            <p>환불 관련 문의 또는 이의 제기는 아래 이메일로 접수해 주시면 빠르게 확인 후 답변드리겠습니다.</p>
            <p className="mt-2 font-medium text-gray-900">이메일: 3mjhkim@naver.com</p>
          </section>

        </div>

        {/* 사업자 정보 */}
        <div className="mt-10 rounded-xl bg-gray-100 px-6 py-6 text-sm text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700 mb-2">사업자 정보</p>
          <p>상호: 정리하게</p>
          <p>대표자: 김제훈</p>
          <p>사업자등록번호: 855-17-02648</p>
          <p>이메일: 3mjhkim@naver.com</p>
        </div>

        {/* 홈 링크 */}
        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-4 transition-colors">
            홈으로 돌아가기
          </a>
        </div>

      </div>
    </div>
  );
}
