export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

        {/* 헤더 */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">이용약관</h1>
          <p className="text-sm text-gray-500">시행일: 2026년 3월 10일</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 sm:px-10 py-10 space-y-10 text-gray-700 leading-relaxed">

          {/* 1. 목적 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제1조 목적</h2>
            <p>
              이 약관은 정리하게(이하 "회사")가 제공하는 온라인 서비스(이하 "서비스")의 이용 조건 및 절차,
              회사와 이용자 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* 2. 용어의 정의 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제2조 용어의 정의</h2>
            <ul className="space-y-2 list-none">
              <li><span className="font-medium text-gray-800">"서비스"</span>란 회사가 제공하는 정리하게 플랫폼 및 관련 디지털 기능 일체를 의미합니다.</li>
              <li><span className="font-medium text-gray-800">"이용자"</span>란 이 약관에 동의하고 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
              <li><span className="font-medium text-gray-800">"회원"</span>이란 서비스에 가입하여 계정을 보유한 이용자를 말합니다.</li>
              <li><span className="font-medium text-gray-800">"유료 서비스"</span>란 회사가 제공하는 서비스 중 별도의 요금이 부과되는 기능 또는 플랜을 말합니다.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 3. 서비스의 제공 및 변경 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제3조 서비스의 제공 및 변경</h2>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>회사는 서비스를 365일, 24시간 제공하는 것을 원칙으로 하나, 시스템 점검·장애·외부 요인 등으로 인해 일시적으로 서비스가 제한될 수 있습니다.</li>
              <li>회사는 서비스 품질 개선을 위해 기능을 추가, 변경, 종료할 수 있으며, 이 경우 사전에 공지합니다. 단, 불가피한 사유가 있을 경우 사후 고지할 수 있습니다.</li>
              <li>서비스의 내용이 변경될 경우, 변경 내용 및 적용 일자를 서비스 내 공지사항 또는 이메일을 통해 안내합니다.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 4. 회원의 의무 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제4조 회원의 의무</h2>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>회원은 관계 법령, 이 약관의 규정, 이용 안내 및 공지사항 등을 준수하여야 하며, 회사의 업무에 방해가 되는 행위를 해서는 안 됩니다.</li>
              <li>회원은 자신의 계정 정보를 안전하게 관리할 책임이 있으며, 타인에게 양도하거나 공유해서는 안 됩니다.</li>
              <li>계정 도용, 부정 사용, 타인의 개인정보 무단 수집, 서비스 운영 방해, 허위 정보 입력 등의 행위는 금지됩니다.</li>
              <li>회원은 서비스를 이용하여 얻은 정보를 회사의 사전 동의 없이 복제, 재배포, 상업적으로 이용해서는 안 됩니다.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 5. 회사의 의무 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제5조 회사의 의무</h2>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>회사는 관계 법령과 이 약관이 금지하는 행위를 하지 않으며, 안정적인 서비스를 제공하기 위해 최선을 다합니다.</li>
              <li>회사는 이용자의 개인정보를 관련 법령 및 개인정보처리방침에 따라 안전하게 관리합니다.</li>
              <li>회사는 이용자로부터 정당한 의견이나 불만이 접수된 경우, 처리 결과를 이메일 등의 방법으로 안내합니다.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 6. 서비스 이용 제한 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제6조 서비스 이용 제한</h2>
            <p className="mb-3">회사는 회원이 다음 각 호에 해당하는 경우 사전 통보 없이 서비스 이용을 제한하거나 계정을 정지할 수 있습니다.</p>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>타인의 계정을 도용하거나 부정한 방법으로 서비스를 이용하는 경우</li>
              <li>서비스의 정상적인 운영을 방해하거나 해킹·악성코드 등을 유포하는 경우</li>
              <li>허위 정보를 등록하거나 타인의 정보를 무단으로 수집·이용하는 경우</li>
              <li>기타 관계 법령 또는 이 약관을 위반하는 경우</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 7. 결제 및 유료 서비스 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제7조 결제 및 유료 서비스</h2>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>회사는 일부 서비스를 유료로 제공할 수 있으며, 유료 서비스 이용 시 회사가 안내하는 요금을 납부하여야 합니다.</li>
              <li>유료 서비스의 세부 이용 조건, 요금, 결제 수단 등은 서비스 내 별도 안내 또는 구독 플랜 페이지에서 확인할 수 있습니다.</li>
              <li>결제는 신용카드, 계좌이체 등 회사가 지원하는 수단을 통해 이루어지며, 결제 처리는 외부 결제대행사를 통해 진행될 수 있습니다.</li>
              <li>환불에 관한 사항은 별도의 환불정책을 따릅니다.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 8. 면책조항 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제8조 면책조항</h2>
            <ul className="space-y-2 pl-4 list-disc list-outside">
              <li>회사는 천재지변, 전쟁, 테러, 정전, 통신망 장애 등 불가항력적 사유로 인한 서비스 장애에 대해 책임을 지지 않습니다.</li>
              <li>회사는 이용자의 귀책 사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
              <li>회사는 이용자가 서비스를 통해 게시한 정보, 자료 등의 신뢰성·정확성에 대해 보증하지 않습니다.</li>
              <li>회사는 이용자 간 또는 이용자와 제3자 간에 발생한 분쟁에 대해 개입하거나 책임을 지지 않습니다.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* 9. 문의 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">제9조 문의</h2>
            <p>이 약관에 관한 문의 또는 서비스 관련 불만은 아래 이메일로 접수하시면 확인 후 성실히 답변드리겠습니다.</p>
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
