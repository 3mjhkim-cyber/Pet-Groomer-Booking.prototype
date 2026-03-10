export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

        {/* 헤더 */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
          <p className="text-sm text-gray-500">시행일: 2026년 3월 10일</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 sm:px-10 py-10 space-y-10 text-gray-700 leading-relaxed">

          {/* 안내 문구 */}
          <section>
            <p>
              정리하게(이하 "회사")는 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」 및 관련 법령을 준수합니다.
              이 방침은 회사가 수집하는 개인정보의 항목, 수집 목적, 보유 기간, 이용자의 권리 등을 안내합니다.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* 1. 수집하는 개인정보 항목 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제1조 수집하는 개인정보 항목</h2>
            <p className="mb-3">회사는 서비스 제공을 위해 아래와 같은 개인정보를 수집할 수 있습니다.</p>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li><span className="font-medium text-gray-800">필수 수집 항목:</span> 이메일 주소, 비밀번호(암호화 처리)</li>
              <li><span className="font-medium text-gray-800">서비스 이용 과정에서 자동 수집:</span> 접속 IP, 로그인·접속 기록, 서비스 이용 기록, 브라우저 정보, 쿠키</li>
              <li><span className="font-medium text-gray-800">결제 관련 정보:</span> 결제 수단 종류, 결제 승인 번호 등 (실제 카드 정보는 결제대행사에서 처리되며 회사가 직접 저장하지 않습니다)</li>
            </ul>
            <p className="mt-3 text-sm text-gray-500">
              회사는 주민등록번호, 계좌번호, 신용카드 전체 번호 등 민감한 금융·식별 정보를 직접 수집하거나 저장하지 않습니다.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* 2. 수집 및 이용 목적 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제2조 개인정보 수집 및 이용 목적</h2>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>회원 가입, 본인 확인, 계정 관리</li>
              <li>서비스 제공, 기능 운영, 이용 이력 관리</li>
              <li>고객 문의 접수 및 응대</li>
              <li>유료 서비스 결제 처리 및 요금 정산</li>
              <li>서비스 개선을 위한 통계 분석 (비식별 처리 후 활용)</li>
              <li>서비스 이용 관련 공지사항 및 중요 안내 발송</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 3. 보유 및 이용기간 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제3조 개인정보 보유 및 이용기간</h2>
            <p className="mb-3">
              회사는 수집한 개인정보를 회원 탈퇴 또는 이용 목적 달성 시 지체 없이 파기합니다.
              단, 관계 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관합니다.
            </p>
            <ul className="space-y-2 pl-4 list-disc list-outside text-sm">
              <li>전자상거래법에 따른 계약·청약철회 관련 기록: 5년</li>
              <li>전자상거래법에 따른 대금결제 및 재화 공급 기록: 5년</li>
              <li>통신비밀보호법에 따른 접속 로그 기록: 3개월</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 4. 제3자 제공 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제4조 개인정보의 제3자 제공</h2>
            <p className="mb-3">
              회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
              다만, 아래의 경우에는 예외적으로 제공될 수 있습니다.
            </p>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령에 따라 수사기관 등 공공기관이 요청하는 경우</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 5. 처리 위탁 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제5조 개인정보 처리 위탁</h2>
            <p className="mb-3">
              회사는 서비스 운영을 위해 아래와 같이 개인정보 처리를 위탁할 수 있습니다.
              위탁 업체가 변경되는 경우 공지사항을 통해 안내합니다.
            </p>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li><span className="font-medium text-gray-800">결제 처리:</span> 외부 결제대행사(PG사)를 통해 처리되며, 실제 결제 정보는 해당 PG사의 보안 정책에 따라 관리됩니다.</li>
              <li><span className="font-medium text-gray-800">클라우드 인프라:</span> 서버 운영 및 데이터 저장을 위해 국내외 클라우드 서비스를 이용할 수 있습니다.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 6. 이용자의 권리 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제6조 이용자의 권리 및 행사 방법</h2>
            <p className="mb-3">이용자는 언제든지 아래 권리를 행사할 수 있습니다.</p>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>본인의 개인정보 열람 요청</li>
              <li>오류가 있는 개인정보 정정 요청</li>
              <li>개인정보 삭제(회원 탈퇴) 요청</li>
              <li>개인정보 처리 정지 요청</li>
            </ul>
            <p className="mt-3">
              위 권리 행사는 아래 이메일로 요청하시면 처리합니다. 법령에 따라 일부 요청이 제한될 수 있습니다.
            </p>
            <p className="mt-1 font-medium text-gray-900">이메일: 3mjhkim@naver.com</p>
          </section>

          <hr className="border-gray-100" />

          {/* 7. 개인정보 보호를 위한 노력 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제7조 개인정보 보호를 위한 노력</h2>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>비밀번호는 암호화하여 저장하며, 복호화가 불가능한 방식으로 처리합니다.</li>
              <li>개인정보에 대한 접근 권한을 필요 최소한의 담당자로 제한합니다.</li>
              <li>개인정보 처리 시스템은 외부 접근을 차단하고 보안 조치를 적용합니다.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 8. 문의 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제8조 문의</h2>
            <p>개인정보 처리와 관련한 문의는 아래로 연락해 주시기 바랍니다.</p>
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
