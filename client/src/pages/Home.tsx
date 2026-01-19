import { Link } from "wouter";
import { Scissors, Calendar, Heart, Star } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 overflow-hidden">
        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm mb-6 border border-primary/20">
              강남 최고의 반려동물 미용실 ✂️
            </span>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              우리 아이가 더<br/>
              <span className="text-primary relative inline-block">
                사랑스러워지는
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span> 순간
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              스트레스 없는 행복한 미용 시간을 선물하세요.<br/>
              전문 스타일리스트가 1:1 맞춤 케어를 진행합니다.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/book/gangnam">
                <button className="px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl text-lg font-bold shadow-xl shadow-primary/25 hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-2">
                  <Calendar className="w-5 h-5" />
                  지금 예약하기
                </button>
              </Link>
              <Link href="/login">
                <button className="px-8 py-4 bg-white hover:bg-gray-50 text-foreground rounded-2xl text-lg font-bold shadow-lg shadow-black/5 border border-border/50 hover:-translate-y-1 transition-all duration-200">
                  관리자 로그인
                </button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Decorative background blobs */}
        <div className="absolute top-1/2 left-10 w-64 h-64 bg-secondary/30 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-accent/30 rounded-full blur-3xl -z-10 animate-pulse delay-700" />
      </section>

      {/* Services Preview */}
      <section className="py-24 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">특별한 서비스</h2>
            <p className="text-muted-foreground">반려동물의 특성에 맞는 최적의 케어를 제공합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <Scissors className="w-8 h-8 text-primary" />,
                title: "전체 미용",
                desc: "스타일 상담부터 목욕, 컷트까지 풀코스 케어",
                price: "50,000원~"
              },
              {
                icon: <Star className="w-8 h-8 text-secondary-foreground" />,
                title: "부분 미용",
                desc: "얼굴, 발, 엉덩이 등 필요한 부분만 깔끔하게",
                price: "30,000원~"
              },
              {
                icon: <Heart className="w-8 h-8 text-accent-foreground" />,
                title: "스파 & 목욕",
                desc: "피부 각질 케어와 힐링 마사지를 동시에",
                price: "20,000원~"
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-3xl border border-border/50 shadow-lg shadow-black/5 hover:shadow-xl transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-secondary/30 flex items-center justify-center mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground mb-4">{item.desc}</p>
                <div className="font-bold text-primary">{item.price}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-20 bg-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-12">안녕 강아지와 고양이를 선택하는 이유</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { num: "5,000+", label: "행복한 댕냥이들" },
              { num: "98%", label: "재방문율" },
              { num: "10년", label: "경력의 원장님" },
              { num: "100%", label: "안심 케어 보장" },
            ].map((stat, i) => (
              <div key={i} className="p-6">
                <div className="text-4xl font-bold text-primary mb-2 font-display">{stat.num}</div>
                <div className="text-foreground/70 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
