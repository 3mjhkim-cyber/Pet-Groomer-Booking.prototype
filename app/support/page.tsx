export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

        {/* 헤더 */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">고객센터</h1>
          <p className="text-sm text-gray-500">서비스 이용 중 불편한 점이 있으시면 언제든지 문의해 주세요.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 sm:px-10 py-10 space-y-10 text-gray-700 leading-relaxed">

          {/* 연락처 카드 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">문의 방법</h2>
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-6 py-6 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-gray-400 mt-0.5">📧</span>
                <div>
                  <p className="font-medium text-gray-800">이메일 문의</p>
                  <p className="text-gray-600">3mjhkim@naver.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gray-400 mt-0.5">🕐</span>
                <div>
                  <p className="font-medium text-gray-800">운영시간</p>
                  <p className="text-gray-600">평일 10:00 ~ 18:00</p>
                  <p className="text-gray-400 text-xs mt-0.5">주말 및 공휴일 휴무</p>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* 문의 가능 항목 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">문의 가능 항목</h2>
            <p className="mb-4 text-gray-600">아래 항목에 해당하는 문의를 이메일로 보내주시면 순서대로 답변드립니다.</p>
            <ul className="space-y-3">
              {[
                { icon: "💳", title: "결제 및 환불", desc: "결제 오류, 요금 확인, 환불 요청 등" },
                { icon: "🔑", title: "계정 및 로그인", desc: "비밀번호 분실, 계정 접근 문제, 탈퇴 요청 등" },
                { icon: "⚙️", title: "서비스 이용 문의", desc: "기능 사용 방법, 오류 신고, 개선 제안 등" },
                { icon: "📋", title: "약관 및 정책 문의", desc: "이용약관, 개인정보처리방침 관련 질문 등" },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3 rounded-lg border border-gray-100 px-4 py-4">
                  <span className="text-lg mt-0.5">{item.icon}</span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{item.title}</p>
                    <p className="text-gray-500 text-sm">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 응답 시간 안내 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">응답 시간 안내</h2>
            <ul className="space-y-2 pl-4 list-disc list-outside text-gray-600">
              <li>이메일 문의는 운영시간 기준으로 순차적으로 처리되며, 통상 <span className="font-medium text-gray-800">1~2 영업일 이내</span> 답변드립니다.</li>
              <li>주말·공휴일에 접수된 문의는 다음 영업일부터 처리됩니다.</li>
              <li>문의량이 많은 경우 다소 지연될 수 있으며, 이 경우 별도로 안내드립니다.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 빠른 링크 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">관련 페이지</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { href: "/terms", label: "이용약관" },
                { href: "/privacy", label: "개인정보처리방침" },
                { href: "/refund", label: "환불정책" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-center rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </section>

        </div>

        {/* 사업자 정보 */}
        <div className="mt-10 rounded-xl bg-gray-100 px-6 py-6 text-sm text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700 mb-2">사업자 정보</p>
          <p>서비스명: 정리하게</p>
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
