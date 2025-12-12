(() => {
  const apiBaseInput = document.getElementById("apiBaseInput");
  const userIdInput = document.getElementById("userIdInput");
  const passwordInput = document.getElementById("passwordInput");
  const loginForm = document.getElementById("loginForm");
  const statusBar = document.getElementById("statusBar");
  const languageSelect = document.getElementById("languageSelect");
  const loginSubtitle = document.getElementById("loginSubtitle");
  const loginLanguageLabel = document.getElementById("loginLanguageLabel");
  const loginSubmitButton = document.getElementById("loginSubmitButton");
  const I18N_KEY = "uiLanguage";
  const translations = {
    en: {
      languageLabel: "Language",
      subtitle: "Access the inbox AI assistant after login",
      userIdPlaceholder: "Enter user ID",
      passwordPlaceholder: "Enter password",
      submit: "Login / Register",
      statusLoginFailedWithCode: "Login failed: {status} {detail}",
      statusFillCredentials: "Please enter user ID and password",
      statusLoggingIn: "Logging in...",
      statusLoginSuccess: "Login successful, redirecting...",
      statusLoginFailed: "Login failed",
    },
    "zh-CN": {
      languageLabel: "语言",
      subtitle: "登录后访问邮箱智能助手",
      userIdPlaceholder: "请输入用户 ID",
      passwordPlaceholder: "请输入密码",
      submit: "登录 / 注册",
      statusLoginFailedWithCode: "登录失败：{status} {detail}",
      statusFillCredentials: "请填写用户ID和密码",
      statusLoggingIn: "正在登录...",
      statusLoginSuccess: "登录成功，正在进入应用...",
      statusLoginFailed: "登录失败",
    },
  };
  let currentLang = loadFromStorage(I18N_KEY) || "en";
  let statusTimer = null;

  apiBaseInput.value = loadFromStorage("apiBase") || apiBaseInput.value;
  applyLanguage();

  function saveToStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      /* ignore */
    }
  }

  function loadFromStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function t(key, params = {}) {
    const table = translations[currentLang] || translations.en;
    const template = table[key] || translations.en[key] || key;
    return template.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : ""));
  }

  function applyLanguage() {
    document.documentElement.lang = currentLang;
    if (languageSelect) languageSelect.value = currentLang;
    if (loginLanguageLabel) loginLanguageLabel.textContent = t("languageLabel");
    if (loginSubtitle) loginSubtitle.textContent = t("subtitle");
    if (userIdInput) userIdInput.placeholder = t("userIdPlaceholder");
    if (passwordInput) passwordInput.placeholder = t("passwordPlaceholder");
    if (loginSubmitButton) loginSubmitButton.textContent = t("submit");
  }

  function clearSession() {
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("chatId");
    } catch (_) {
      /* ignore */
    }
  }

  function setStatus(message, type = "info", duration = 3000) {
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
    statusBar.textContent = message;
    statusBar.classList.toggle("error", type === "error");
    statusBar.style.display = "block";
    if (duration !== null) {
      statusTimer = setTimeout(() => {
        statusBar.style.display = "none";
      }, duration);
    }
  }

  function getApiBase() {
    return apiBaseInput.value.replace(/\/+$/, "");
  }

  if (languageSelect) {
    languageSelect.onchange = (e) => {
      currentLang = e.target.value || "en";
      saveToStorage(I18N_KEY, currentLang);
      applyLanguage();
    };
  }

  async function login(userId, password) {
    const res = await fetch(`${getApiBase()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, password }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(t("statusLoginFailedWithCode", { status: res.status, detail }));
    }
    return res.json();
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = userIdInput.value.trim();
    const password = passwordInput.value.trim();
    if (!userId || !password) {
      setStatus(t("statusFillCredentials"), "error");
      return;
    }
    setStatus(t("statusLoggingIn"), "info", null);
    try {
      const data = await login(userId, password);
      saveToStorage("authToken", data.access_token);
      saveToStorage("userId", data.user_id);
      saveToStorage("apiBase", getApiBase());
      setStatus(t("statusLoginSuccess"));
      setTimeout(() => {
        window.location.href = "index.html";
      }, 300);
    } catch (err) {
      clearSession();
      setStatus(err.message || t("statusLoginFailed"), "error");
    }
  });

  // 已登录直接跳转
  (function autoRedirect() {
    if (loadFromStorage("authToken") && loadFromStorage("userId")) {
      window.location.href = "index.html";
    }
  })();
})();
