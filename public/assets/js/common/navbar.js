// public/assets/js/common/navbar.js

const DEFAULT_AVATAR_URL = "https://api.dicebear.com/7.x/avataaars/svg?seed=base";

// Handle /public base path (Live Server / local setups)
const BASE = window.location.pathname.includes("/public/") ? "/public" : "";
const withBase = (p) => `${BASE}/${String(p).replace(/^\/+/, "")}`.replace(/\/{2,}/g, "/");

function qs(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element with id="${id}"`);
  return el;
}

export function initNavbar({ active = "" } = {}) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = withBase("index.html");
    return;
  }

  // Topbar
  const welcome = qs("welcome-message");
  const avatar = qs("user-avatar");
  const logoutBtn = qs("logout-button");

  welcome.textContent = `Welcome, ${user.full_name || "user"}!`;
  avatar.src = user.avatar_url || DEFAULT_AVATAR_URL;

  logoutBtn.onclick = () => {
    localStorage.removeItem("user");
    window.location.href = withBase("index.html");
  };

  // Menü linkleri
  const navUl = qs("nav-links");

  // ✅ IMPORTANT: NO leading "/" in hrefs
  const teacherLinks = [
    { key: "home", label: "Home", href: "teacher.html" },
    { key: "class", label: "Class & Homework Management", href: "pages/teacher/class-management.html" },
    { key: "reports", label: "Student Reports", href: "pages/teacher/student-report.html" },
    { key: "support", label: "Support", href: "pages/teacher/support.html" },
    { key: "settings", label: "Settings", href: "pages/common/settings.html" },
  ];

  const studentLinks = [
    { key: "home", label: "Home", href: "student.html" },
    { key: "reading", label: "Reading Materials", href: "pages/student/reading.html" },
    { key: "favorites", label: "Favorites", href: "pages/student/favorites.html" },
    { key: "wordlist", label: "Word List", href: "pages/student/wordlist.html" },
    { key: "speaking", label: "Speaking Practice", href: "pages/student/speaking.html" },
    { key: "quiz", label: "Quizzes", href: "pages/student/quiz.html" },
    { key: "ai", label: "AI Assistant", href: "pages/student/ai-chat.html" },
    { key: "support", label: "Support", href: "pages/student/support.html" },
    { key: "profile", label: "My Profile & Statistics", href: "pages/student/profile.html" },
    { key: "settings", label: "Settings", href: "pages/common/settings.html" },
  ];

  const links = user.role === "teacher" ? teacherLinks : studentLinks;

  navUl.innerHTML = links
    .map((l) => {
      const isActive = l.key === active ? "active" : "";
      return `<li class="${isActive}"><a href="${withBase(l.href)}">${l.label}</a></li>`;
    })
    .join("");
}
