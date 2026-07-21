import { useEffect, useState } from 'react';
import { Trophy, Rocket, Sparkles, Mail, Phone, MapPin, Globe, Heart, Star, Zap, Award, PartyPopper } from 'lucide-react';

const AboutTab = () => {
  const [showFireworks, setShowFireworks] = useState(true);
  const [confetti, setConfetti] = useState([]);
  const [sparkles, setSparkles] = useState([]);

  useEffect(() => {
    // Generate confetti
    const confettiArray = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2,
      color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FFD93D', '#6BCF7F', '#B388FF'][Math.floor(Math.random() * 8)]
    }));
    setConfetti(confettiArray);

    // Generate sparkles
    const sparklesArray = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setSparkles(sparklesArray);

    // Play celebration sound effect (optional)
    const celebrationTimeout = setTimeout(() => {
      setShowFireworks(true);
    }, 100);

    return () => clearTimeout(celebrationTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden -m-6">
      {/* Animated Background Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {sparkles.map((sparkle) => (
          <div
            key={sparkle.id}
            className="absolute animate-pulse"
            style={{
              top: `${sparkle.top}%`,
              left: `${sparkle.left}%`,
              animationDelay: `${sparkle.delay}s`,
            }}
          >
            <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
          </div>
        ))}
      </div>

      {/* Confetti Animation */}
      {showFireworks && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confetti.map((piece) => (
            <div
              key={piece.id}
              className="absolute w-3 h-3 rounded-full animate-confetti"
              style={{
                left: `${piece.left}%`,
                backgroundColor: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Fireworks Effect */}
      {showFireworks && (
        <>
          <div className="firework firework-1"></div>
          <div className="firework firework-2"></div>
          <div className="firework firework-3"></div>
          <div className="firework firework-4"></div>
          <div className="firework firework-5"></div>
        </>
      )}

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-4">
        {/* Celebration Header */}
        <div className="text-center mb-16 animate-bounce-slow">
          <div className="flex justify-center items-center gap-2 mb-6">
            <Trophy className="w-16 h-16 text-yellow-400 animate-spin-slow" />
            <PartyPopper className="w-20 h-20 text-pink-400 animate-bounce" />
            <Trophy className="w-16 h-16 text-yellow-400 animate-spin-slow" />
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent animate-gradient">
            🎉 CELEBRATION TIME! 🎉
          </h1>
          
          <div className="flex justify-center items-center gap-3 mb-6">
            <Rocket className="w-12 h-12 text-blue-400 animate-rocket" />
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              First Project Completed!
            </h2>
            <Sparkles className="w-12 h-12 text-yellow-400 animate-spin" />
          </div>

          <p className="text-2xl text-yellow-300 font-semibold flex items-center justify-center gap-2">
            <Award className="w-8 h-8" />
            Welcome to Malwa CRM - Where Dreams Come True!
            <Award className="w-8 h-8" />
          </p>
        </div>

        {/* Main Card with 3D Effect */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(255,215,0,0.4)] border-4 border-yellow-400/30 p-4 md:p-12 transform hover:scale-105 transition-all duration-500 hover:shadow-[0_30px_80px_rgba(255,215,0,0.6)]">
            
            {/* Success Badge */}
            <div className="flex justify-center mb-8">
              <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-8 py-4 rounded-full text-2xl font-bold shadow-2xl animate-pulse flex items-center gap-3">
                <Zap className="w-8 h-8" />
                Project Status: SUCCESSFULLY COMPLETED
                <Zap className="w-8 h-8" />
              </div>
            </div>

            {/* Founder Information */}
            <div className="text-center mb-12">
              <div className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 p-1 rounded-2xl mb-6 transform hover:rotate-3 transition-transform">
                <div className="bg-gray-900 px-8 py-6 rounded-2xl">
                  <h3 className="text-4xl font-black text-transparent bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text mb-2 flex items-center justify-center gap-3">
                    <Heart className="w-10 h-10 text-red-500 animate-pulse fill-red-500" />
                    Proudly Created By
                    <Heart className="w-10 h-10 text-red-500 animate-pulse fill-red-500" />
                  </h3>
                  <p className="text-5xl font-black text-white mb-2">Sheddy Smith Lab</p>
                  <p className="text-xl text-yellow-300 font-semibold">🚀 Innovation & Excellence 🚀</p>
                </div>
              </div>
            </div>

            {/* Contact Information Cards */}
            <div className="grid md:grid-cols-2 gap-3 mb-10">
              {/* Address Card */}
              <div className="group bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-lg rounded-2xl p-3 border-2 border-blue-400/50 hover:border-blue-300 transition-all duration-300 hover:shadow-[0_10px_40px_rgba(59,130,246,0.5)] transform hover:-translate-y-2">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-500 p-3 rounded-xl group-hover:rotate-12 transition-transform">
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-blue-300 mb-2">Address</h4>
                    <p className="text-white text-lg">Indore, Madhya Pradesh</p>
                  </div>
                </div>
              </div>

              {/* Phone Card */}
              <div className="group bg-gradient-to-br from-green-500/20 to-teal-500/20 backdrop-blur-lg rounded-2xl p-3 border-2 border-green-400/50 hover:border-green-300 transition-all duration-300 hover:shadow-[0_10px_40px_rgba(34,197,94,0.5)] transform hover:-translate-y-2">
                <div className="flex items-start gap-4">
                  <div className="bg-green-500 p-3 rounded-xl group-hover:rotate-12 transition-transform">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-green-300 mb-2">Contact</h4>
                    <p className="text-white text-lg">7447000198</p>
                  </div>
                </div>
              </div>

              {/* Email Card */}
              <div className="group bg-gradient-to-br from-pink-500/20 to-red-500/20 backdrop-blur-lg rounded-2xl p-3 border-2 border-pink-400/50 hover:border-pink-300 transition-all duration-300 hover:shadow-[0_10px_40px_rgba(236,72,153,0.5)] transform hover:-translate-y-2">
                <div className="flex items-start gap-4">
                  <div className="bg-pink-500 p-3 rounded-xl group-hover:rotate-12 transition-transform">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-pink-300 mb-2">Email</h4>
                    <p className="text-white text-lg">Malwa-crm@gmail.com</p>
                  </div>
                </div>
              </div>

              {/* Website Card */}
              <div className="group bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-lg rounded-2xl p-3 border-2 border-yellow-400/50 hover:border-yellow-300 transition-all duration-300 hover:shadow-[0_10px_40px_rgba(251,191,36,0.5)] transform hover:-translate-y-2">
                <div className="flex items-start gap-4">
                  <div className="bg-yellow-500 p-3 rounded-xl group-hover:rotate-12 transition-transform">
                    <Globe className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-yellow-300 mb-2">Website</h4>
                    <a 
                      href="http://www.SheddySmithLab.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-white text-lg hover:text-yellow-200 underline"
                    >
                      www.SheddySmithLab.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievement Section */}
            <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-2xl p-4 border-2 border-purple-400/50 mb-8">
              <h3 className="text-3xl font-bold text-center text-white mb-6 flex items-center justify-center gap-3">
                <Award className="w-10 h-10 text-yellow-400" />
                Malwa CRM - Complete Solution
                <Award className="w-10 h-10 text-yellow-400" />
              </h3>
              <div className="grid md:grid-cols-3 gap-2 text-center">
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="text-4xl font-black text-yellow-400 mb-2">100%</div>
                  <div className="text-white font-semibold">Completion Rate</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="text-4xl font-black text-green-400 mb-2">🏆</div>
                  <div className="text-white font-semibold">First Milestone</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="text-4xl font-black text-blue-400 mb-2">∞</div>
                  <div className="text-white font-semibold">Future Possibilities</div>
                </div>
              </div>
            </div>

            {/* Thank You Message */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-10 py-6 rounded-2xl text-2xl md:text-3xl font-bold shadow-2xl inline-block animate-pulse">
                🎊 Thank You for Using Malwa CRM! 🎊
              </div>
              <p className="text-white text-xl mt-6 font-semibold">
                Built with 💖 by Sheddy Smith Lab
              </p>
              <p className="text-yellow-300 text-lg mt-2">
                Your Success is Our Mission!
              </p>
            </div>
          </div>
        </div>

        {/* Footer Celebration Text */}
        <div className="text-center mt-12">
          <p className="text-white text-2xl font-bold animate-bounce flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-yellow-400" />
            Keep Growing, Keep Celebrating!
            <Sparkles className="w-8 h-8 text-yellow-400" />
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes firework {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }

        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-confetti {
          animation: confetti linear infinite;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-bounce-slow {
          animation: bounce 2s infinite;
        }

        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }

        .animate-rocket {
          animation: rocket 2s ease-in-out infinite;
        }

        @keyframes rocket {
          0%, 100% {
            transform: translateY(0) rotate(-45deg);
          }
          50% {
            transform: translateY(-20px) rotate(-45deg);
          }
        }

        .firework {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          box-shadow: 
            0 0 0 4px #ff0,
            0 0 0 8px #f0f,
            0 0 0 12px #0ff,
            0 0 0 16px #ff0,
            0 0 0 20px #f0f,
            0 0 0 24px #0ff,
            0 0 0 28px #ff0,
            0 0 0 32px #f0f;
          animation: firework 1.5s ease-out infinite;
        }

        .firework-1 {
          top: 20%;
          left: 20%;
          animation-delay: 0s;
        }

        .firework-2 {
          top: 30%;
          left: 80%;
          animation-delay: 0.3s;
        }

        .firework-3 {
          top: 60%;
          left: 30%;
          animation-delay: 0.6s;
        }

        .firework-4 {
          top: 50%;
          left: 70%;
          animation-delay: 0.9s;
        }

        .firework-5 {
          top: 80%;
          left: 50%;
          animation-delay: 1.2s;
        }
      `}</style>
    </div>
  );
};

export default AboutTab;

