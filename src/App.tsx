import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCcw, 
  ShoppingBag, 
  Target, 
  MessageSquare, 
  Layout,
  Zap,
  Box,
  ChevronRight,
  ArrowRight,
  LogOut,
  User as UserIcon,
  History,
  Trash2,
  Mail,
  Lock,
  X,
  Moon,
  Sun,
  Download
} from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  setDoc,
  getDoc
} from "firebase/firestore";
import { auth, signInWithGoogle, logout, db, signInWithEmail, signUpWithEmail } from "./lib/firebase";
import { handleFirestoreError, OperationType } from "./lib/firestoreUtils";
import { generateProductDescription, type ProductInput } from "./services/gemini";
import { cn } from "./lib/utils";

const TONES = [
  { name: "Professional", desc: "Formal and authoritative" },
  { name: "Persuasive", desc: "Strong focus on benefits and conversion" },
  { name: "Minimalist", desc: "Short, punchy, and modern" },
  { name: "Quirky", desc: "Fun, relatable, and full of personality" },
  { name: "Luxury", desc: "Sophisticated and high-end appeal" },
  { name: "Helpful", desc: "Informative and problem-solving" },
  { name: "Urgent", desc: "Creates scarcity and FOMO" }
];

const PLATFORMS = [
  { id: "common", name: "Generic", icon: Box, desc: "A versatile description for any marketplace" },
  { id: "amazon", name: "Amazon", icon: ShoppingBag, desc: "Bullet points and title optimization" },
  { id: "shopify", name: "Shopify", icon: Layout, desc: "Narrative style with technical specifications" },
  { id: "instagram", name: "Instagram", icon: MessageSquare, desc: "Engaging social caption with emojis" },
];

const LANGUAGES = [
  { code: "English", name: "English", flag: "🇺🇸" },
  { code: "Spanish", name: "Spanish", flag: "🇪🇸" },
  { code: "French", name: "French", flag: "🇫🇷" },
  { code: "German", name: "German", flag: "🇩🇪" },
  { code: "Italian", name: "Italian", flag: "🇮🇹" },
  { code: "Portuguese", name: "Portuguese", flag: "🇵🇹" },
  { code: "Japanese", name: "Japanese", flag: "🇯🇵" },
  { code: "Chinese", name: "Chinese", flag: "🇨🇳" },
  { code: "Hindi", name: "Hindi", flag: "🇮🇳" }
];

function Tooltip({ children, text, isDarkMode }: { children: React.ReactNode, text: string, isDarkMode: boolean, key?: string | number }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block w-full" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={cn(
              "absolute z-[60] bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap pointer-events-none shadow-xl",
              isDarkMode ? "bg-white text-black" : "bg-[#1A1A1A] text-white"
            )}
          >
            {text}
            <div className={cn(
              "absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent",
              isDarkMode ? "border-t-white" : "border-t-[#1A1A1A]"
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductInput>({
    name: "",
    features: "",
    targetAudience: "",
    tone: "Professional",
    platform: "common",
    customInstructions: "",
    language: "English"
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, "descriptions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "descriptions");
    });

    return () => unsubscribe();
  }, [user]);

  const handleGenerate = async () => {
    if (!formData.name || !formData.features) return;
    
    setLoading(true);
    try {
      const result = await generateProductDescription(formData);
      setOutput(result);

      if (user) {
        try {
          await addDoc(collection(db, "descriptions"), {
            ...formData,
            content: result,
            userId: user.uid,
            createdAt: serverTimestamp()
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, "descriptions");
        }
      }

      // Wait for next tick to scroll
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, "descriptions", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `descriptions/${id}`);
    }
  };

  const handleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      await syncUser(result.user);
      setShowAuthModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEmailAuth = async () => {
    if (!authEmail || !authPassword) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      let result;
      if (authMode === "login") {
        result = await signInWithEmail(authEmail, authPassword);
      } else {
        result = await signUpWithEmail(authEmail, authPassword);
      }
      await syncUser(result.user);
      setShowAuthModal(false);
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: any) {
      console.error(err);
      let message = "An error occurred during authentication.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        message = "Invalid email or password. Please try again.";
      } else if (err.code === "auth/email-already-in-use") {
        message = "This email is already in use.";
      } else if (err.code === "auth/weak-password") {
        message = "Password should be at least 6 characters.";
      }
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const syncUser = async (u: User) => {
    const userRef = doc(db, "users", u.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      try {
        await setDoc(userRef, {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || u.email?.split('@')[0],
          photoURL: u.photoURL,
          createdAt: serverTimestamp()
        });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.WRITE, `users/${u.uid}`);
      }
    }
  };

  const copyToClipboard = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!output) return;
    const element = document.createElement("a");
    const file = new Blob([output], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${formData.name.replace(/\s+/g, '_')}_description.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-orange-100 selection:text-orange-900 transition-colors duration-300",
      isDarkMode ? "bg-[#121212] text-gray-100 selection:bg-orange-900 selection:text-orange-100" : "bg-[#F8F9FA] text-[#1A1A1A]"
    )}>
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-50 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between transition-all",
        isDarkMode ? "bg-[#121212]/80 border-white/5" : "bg-white/80 border-[#E5E7EB]"
      )}>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <Zap size={20} fill="currentColor" />
          </div>
          <span className={cn("font-bold text-xl tracking-tight", isDarkMode ? "text-white" : "text-gray-900")}>SparkCopy</span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#how-it-works" className={cn("text-sm font-medium transition-colors", isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")}>How it works</a>
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={cn("p-2 rounded-lg transition-colors", isDarkMode ? "bg-white/5 text-gray-400 hover:text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900")}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          {user ? (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                <History size={16} />
                History
              </button>
              <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 overflow-hidden border border-orange-200">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ""} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={16} />
                  )}
                </div>
                <button 
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => {
                setShowAuthModal(true);
                setAuthError(null);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center gap-2"
            >
              Sign In
            </button>
          )}
        </nav>
      </header>

      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden",
                isDarkMode ? "bg-[#1A1A1A] border border-white/5" : "bg-white"
              )}
            >
              <div className="p-8">
                <button 
                  onClick={() => setShowAuthModal(false)}
                  className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>

                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-orange-200">
                    <Zap size={24} fill="currentColor" />
                  </div>
                  <h2 className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                    {authMode === "login" ? "Welcome Back" : "Create Account"}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {authMode === "login" ? "Sign in to access your history" : "Join SparkCopy to save your work"}
                  </p>
                </div>

                <div className="space-y-4">
                  {authError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2"
                    >
                      <X size={14} className="shrink-0" />
                      {authError}
                    </motion.div>
                  )}
                  <button 
                    onClick={handleLogin}
                    className={cn(
                      "w-full border flex items-center justify-center gap-3 py-3 rounded-xl font-semibold transition-colors",
                      isDarkMode ? "border-white/10 hover:bg-white/5 text-gray-200" : "border-gray-200 hover:bg-gray-50 text-gray-900"
                    )}
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                    Continue with Google
                  </button>

                  <div className={cn(
                    "relative flex items-center py-4 text-xs font-bold uppercase tracking-widest",
                    isDarkMode ? "text-gray-600" : "text-gray-300"
                  )}>
                    <div className={cn("flex-1 border-t", isDarkMode ? "border-white/5" : "border-gray-100")} />
                    <span className="px-4">Or use email</span>
                    <div className={cn("flex-1 border-t", isDarkMode ? "border-white/5" : "border-gray-100")} />
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="email"
                        placeholder="Email Address"
                        className={cn(
                          "w-full rounded-xl pl-12 pr-4 py-3 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all text-sm",
                          isDarkMode ? "bg-white/5 border-white/5 text-white" : "bg-gray-50 border-gray-200"
                        )}
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="password"
                        placeholder="Password"
                        className={cn(
                          "w-full rounded-xl pl-12 pr-4 py-3 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all text-sm",
                          isDarkMode ? "bg-white/5 border-white/5 text-white" : "bg-gray-50 border-gray-200"
                        )}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleEmailAuth}
                    disabled={authLoading || !authEmail || !authPassword}
                    className={cn(
                      "w-full py-4 rounded-xl font-bold transition-all disabled:opacity-50",
                      isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-[#1A1A1A] hover:bg-black text-white"
                    )}
                  >
                    {authLoading ? "One moment..." : authMode === "login" ? "Sign In" : "Sign Up"}
                  </button>

                  <p className="text-center text-sm text-gray-500 mt-6">
                    {authMode === "login" ? "New here?" : "Already have an account?"}
                    <button 
                      onClick={() => {
                        setAuthMode(authMode === "login" ? "signup" : "login");
                        setAuthError(null);
                      }}
                      className="ml-2 font-bold text-orange-500 hover:text-orange-600"
                    >
                      {authMode === "login" ? "Create an account" : "Sign in instead"}
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-16 grid lg:grid-cols-2 gap-12 items-start">
        {/* Left Col: Editor */}
        <section className="space-y-8">
          <div className="space-y-3">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]", isDarkMode ? "text-white" : "text-gray-900")}
            >
              Write descriptions that <span className="text-orange-500 italic">sell.</span>
            </motion.h1>
            <p className={cn("text-lg max-w-md", isDarkMode ? "text-gray-400" : "text-gray-500")}>
              Turn your product features into compelling stories with AI tailored for every marketplace.
            </p>
            {!user && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold", isDarkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600")}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Sign in to save your generation history
              </motion.div>
            )}
          </div>

          <div className={cn(
            "rounded-3xl p-8 border transition-all duration-300 space-y-6",
            isDarkMode ? "bg-white/5 border-white/5 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.4)]" : "bg-white border-[#E5E7EB] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)]"
          )}>
            <div className="space-y-4">
              <div>
                <label className={cn("text-xs font-bold uppercase tracking-widest mb-2 block", isDarkMode ? "text-gray-500" : "text-gray-400")}>Product Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Ultra-Soft Bamboo Bed Sheets"
                  className={cn(
                    "w-full rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all text-sm",
                    isDarkMode ? "bg-white/5 border-white/5 text-white placeholder:text-gray-600" : "bg-gray-50 border-gray-200"
                  )}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className={cn("text-xs font-bold uppercase tracking-widest mb-2 block", isDarkMode ? "text-gray-500" : "text-gray-400")}>Key Features & Specs</label>
                <textarea 
                  rows={4}
                  placeholder="e.g. 100% Organic, Cooling technology, 400 thread count, hypoallergenic..."
                  className={cn(
                    "w-full rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all resize-none text-sm",
                    isDarkMode ? "bg-white/5 border-white/5 text-white placeholder:text-gray-600" : "bg-gray-50 border-gray-200"
                  )}
                  value={formData.features}
                  onChange={(e) => setFormData({...formData, features: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn("text-xs font-bold uppercase tracking-widest mb-2 block", isDarkMode ? "text-gray-500" : "text-gray-400")}>Target Audience</label>
                  <input 
                    type="text"
                    placeholder="e.g. Eco-conscious homeowners"
                    className={cn(
                      "w-full rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all text-sm",
                      isDarkMode ? "bg-white/5 border-white/5 text-white placeholder:text-gray-600" : "bg-gray-50 border-gray-200"
                    )}
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                  />
                </div>
                <div>
                  <label className={cn("text-xs font-bold uppercase tracking-widest mb-2 block", isDarkMode ? "text-gray-500" : "text-gray-400")}>Tone of Voice</label>
                  <Tooltip text={TONES.find(t => t.name === formData.tone)?.desc || ""} isDarkMode={isDarkMode}>
                    <div className="relative">
                      <select 
                        className={cn(
                          "w-full rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all appearance-none cursor-pointer text-sm",
                          isDarkMode ? "bg-white/5 border-white/5 text-white" : "bg-gray-50 border-gray-200"
                        )}
                        value={formData.tone}
                        onChange={(e) => setFormData({...formData, tone: e.target.value})}
                      >
                        {TONES.map(t => <option key={t.name} value={t.name} className={isDarkMode ? "bg-[#1A1A1A]" : ""}>{t.name}</option>)}
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </Tooltip>
                </div>
              </div>

              <div>
                <label className={cn("text-xs font-bold uppercase tracking-widest mb-2 block", isDarkMode ? "text-gray-500" : "text-gray-400")}>Target Language</label>
                <div className="relative">
                  <select 
                    className={cn(
                      "w-full rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all appearance-none cursor-pointer text-sm",
                      isDarkMode ? "bg-white/5 border-white/5 text-white" : "bg-gray-50 border-gray-200"
                    )}
                    value={formData.language}
                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                  >
                    {LANGUAGES.map(l => <option key={l.code} value={l.code} className={isDarkMode ? "bg-[#1A1A1A]" : ""}>{l.flag} {l.name}</option>)}
                  </select>
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div>
                <label className={cn("text-xs font-bold uppercase tracking-widest mb-2 block", isDarkMode ? "text-gray-500" : "text-gray-400")}>Custom Instructions (Optional)</label>
                <textarea 
                  rows={2}
                  placeholder="e.g. Use a storytelling approach, include a call to action, or focus on durability."
                  className={cn(
                    "w-full rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all resize-none text-sm",
                    isDarkMode ? "bg-white/5 border-white/5 text-white placeholder:text-gray-600" : "bg-gray-50 border-gray-200"
                  )}
                  value={formData.customInstructions}
                  onChange={(e) => setFormData({...formData, customInstructions: e.target.value})}
                />
              </div>

              <div>
                <label className={cn("text-xs font-bold uppercase tracking-widest mb-4 block", isDarkMode ? "text-gray-500" : "text-gray-400")}>Target Platform</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PLATFORMS.map((p) => {
                    const Icon = p.icon;
                    const isActive = formData.platform === p.id;
                    return (
                      <Tooltip key={p.id} text={p.desc} isDarkMode={isDarkMode}>
                        <button
                          onClick={() => setFormData({...formData, platform: p.id as any})}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200 w-full",
                            isActive 
                              ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200" 
                              : isDarkMode ? "bg-white/5 border-white/5 text-gray-400 hover:border-white/20" : "bg-white border-gray-200 text-gray-500 hover:border-orange-200"
                          )}
                        >
                          <Icon size={18} />
                          <span className="text-xs font-semibold">{p.name}</span>
                        </button>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            </div>

            <button
              id="generate-button"
              onClick={handleGenerate}
              disabled={loading || !formData.name || !formData.features}
              className={cn(
                "w-full group px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                isDarkMode 
                  ? "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20" 
                  : "bg-[#1A1A1A] hover:bg-black text-white shadow-black/10"
              )}
            >
              {loading ? (
                <>
                  <RefreshCcw className="animate-spin" size={20} />
                  <span>Processing Magic...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} className="text-orange-400 group-hover:scale-110 transition-transform" />
                  <span>Generate Description</span>
                  <ArrowRight size={18} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                </>
              )}
            </button>
          </div>
        </section>

        {/* Right Col: Output or History */}
        <section className="sticky top-28" ref={scrollRef}>
          <AnimatePresence mode="wait">
            {showHistory && user ? (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  "rounded-3xl border shadow-xl overflow-hidden flex flex-col h-[700px] transition-all duration-300",
                  isDarkMode ? "bg-[#1A1A1A] border-white/5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]" : "bg-white border-gray-200 shadow-xl"
                )}
              >
                <div className={cn(
                  "p-6 border-b flex items-center justify-between",
                  isDarkMode ? "border-white/5 bg-white/5" : "border-gray-100 bg-gray-50/50"
                )}>
                  <h3 className={cn("font-bold text-lg flex items-center gap-2", isDarkMode ? "text-white" : "text-gray-900")}>
                    <History size={18} className="text-orange-500" />
                    Generation History
                  </h3>
                  <button 
                    onClick={() => setShowHistory(false)}
                    className="text-sm font-semibold text-orange-500 hover:text-orange-600"
                  >
                    Back to Editor
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-6 space-y-4 custom-scrollbar">
                  {history.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                      <p>No history yet. Start generating!</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "group border rounded-2xl p-4 transition-all cursor-pointer",
                          isDarkMode 
                            ? "border-white/5 hover:border-orange-500/30 hover:bg-white/5" 
                            : "border-gray-100 hover:border-orange-200 hover:bg-orange-50/10"
                        )} 
                        onClick={() => {
                        setFormData({
                          name: item.name,
                          features: item.features,
                          targetAudience: item.targetAudience,
                          tone: item.tone,
                          platform: item.platform,
                          customInstructions: item.customInstructions || "",
                          language: item.language || "English"
                        });
                        setOutput(item.content);
                        setShowHistory(false);
                      }}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className={cn("font-bold text-sm", isDarkMode ? "text-gray-200" : "text-gray-900")}>{item.name}</h4>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHistoryItem(item.id);
                            }}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className={cn("text-xs line-clamp-2 mb-3 leading-relaxed", isDarkMode ? "text-gray-500" : "text-gray-500")}>
                          {item.content}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                            isDarkMode ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"
                          )}>
                            {item.platform}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                            isDarkMode ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"
                          )}>
                            {LANGUAGES.find(l => l.code === item.language)?.flag || "🇺🇸"} {item.language || "English"}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {item.createdAt?.toDate().toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : !output && !loading ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "h-[600px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-12 space-y-4 transition-colors",
                  isDarkMode ? "border-white/10" : "border-gray-200"
                )}
              >
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center",
                  isDarkMode ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-400"
                )}>
                  <Box size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className={cn("font-bold text-lg", isDarkMode ? "text-white" : "text-gray-900")}>Your magic happens here</h3>
                  <p className="text-sm text-gray-400">Fill in the product details and click generate to see the AI in action.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="output"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "rounded-3xl overflow-hidden shadow-2xl relative transition-all duration-300",
                  isDarkMode ? "bg-black border border-white/5" : "bg-[#1A1A1A]"
                )}
              >
                <div className="bg-white/5 border-b border-white/5 px-8 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="ml-2 text-xs font-mono text-gray-400 uppercase tracking-widest">Optimized Content</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleDownload}
                      className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors relative group"
                    >
                      <Download size={18} />
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Download as TXT
                      </span>
                    </button>
                    <button 
                      onClick={copyToClipboard}
                      className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors relative group"
                    >
                      {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {copied ? "Copied!" : "Copy to clipboard"}
                      </span>
                    </button>
                  </div>
                </div>
                
                <div className="p-8 md:p-12 h-[600px] overflow-auto custom-scrollbar">
                  {loading ? (
                    <div className="space-y-6">
                      <div className="h-8 bg-white/5 rounded-lg animate-pulse w-3/4" />
                      <div className="space-y-3">
                        <div className="h-4 bg-white/5 rounded animate-pulse" />
                        <div className="h-4 bg-white/5 rounded animate-pulse w-5/6" />
                        <div className="h-4 bg-white/5 rounded animate-pulse w-4/6" />
                      </div>
                      <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-orange max-w-none">
                      <div className="whitespace-pre-wrap text-gray-300 font-sans leading-relaxed text-lg">
                        {output}
                      </div>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/80 to-transparent pointer-events-none">
                  <div className="pointer-events-auto flex gap-4">
                     <button 
                      onClick={handleGenerate}
                      className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
                     >
                      <RefreshCcw size={16} />
                      Regenerate
                     </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* How it works Section */}
      <section id="how-it-works" className={cn(
        "max-w-7xl mx-auto px-4 md:px-6 py-24 border-t transition-colors",
        isDarkMode ? "border-white/5" : "border-gray-100"
      )}>
        <div className="text-center mb-16 space-y-4">
          <h2 className={cn("text-3xl md:text-4xl font-bold tracking-tight", isDarkMode ? "text-white" : "text-gray-900")}>Three steps to better sales</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">Our AI model analyzes your product's DNA and matches it with the best-performing copy patterns for your chosen platform.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              step: "01", 
              title: "Define your product", 
              description: "Input your product name and list the RAW features. No need for fancy writing yet.",
              icon: <Box className="text-orange-500" size={24} />
            },
            { 
              step: "02", 
              title: "Choose your vibe", 
              description: "Select from professional to quirky tones and pick your target marketplace.",
              icon: <Target className="text-orange-500" size={24} />
            },
            { 
              step: "03", 
              title: "Generate & Refine", 
              description: "Get SEO-optimized copy in seconds. Tailor it to your brand and watch conversions soar.",
              icon: <Sparkles className="text-orange-500" size={24} />
            }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className={cn(
                "p-8 rounded-3xl border shadow-sm hover:shadow-md transition-all relative overflow-hidden group",
                isDarkMode ? "bg-white/5 border-white/5" : "bg-white border-gray-100"
              )}
            >
              <div className={cn(
                "text-6xl font-black absolute -top-4 -right-4 transition-transform group-hover:scale-110",
                isDarkMode ? "text-white/[0.03]" : "text-gray-50"
              )}>{item.step}</div>
              <div className="relative">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
                  isDarkMode ? "bg-orange-500/10" : "bg-orange-50"
                )}>
                  {item.icon}
                </div>
                <h3 className={cn("text-xl font-bold mb-3", isDarkMode ? "text-white" : "text-gray-900")}>{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className={cn(
        "max-w-7xl mx-auto px-6 py-12 border-t mt-12 text-center md:text-left transition-colors",
        isDarkMode ? "border-white/5" : "border-gray-200"
      )}>
        <div className="grid md:grid-cols-4 gap-12">
          <div className="col-span-2 space-y-4">
             <div className="flex items-center justify-center md:justify-start gap-2">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white">
                  <Zap size={16} fill="currentColor" />
                </div>
                <span className={cn("font-bold text-lg tracking-tight", isDarkMode ? "text-white" : "text-gray-900")}>SparkCopy</span>
              </div>
              <p className="text-gray-400 max-w-xs mx-auto md:mx-0 text-sm">
                The world's most advanced AI copywriter for e-commerce brands. Scale your conversions with intent-driven content.
              </p>
          </div>
          <div>
            <h4 className={cn("font-bold mb-4 text-sm uppercase tracking-widest", isDarkMode ? "text-gray-300" : "text-gray-900")}>Product</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#" className="hover:text-orange-500 transition-colors">Integrations</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">API Access</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">Templates</a></li>
            </ul>
          </div>
          <div>
            <h4 className={cn("font-bold mb-4 text-sm uppercase tracking-widest", isDarkMode ? "text-gray-300" : "text-gray-900")}>Company</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#" className="hover:text-orange-500 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-orange-500 transition-colors">Privacy</a></li>
            </ul>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}
