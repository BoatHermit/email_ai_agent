(() => {
  const apiBaseInput = document.getElementById("apiBaseInput");
  const userIdInput = document.getElementById("userIdInput");
  const passwordInput = document.getElementById("passwordInput");
  const loginForm = document.getElementById("loginForm");
  const statusBar = document.getElementById("statusBar");
  let statusTimer = null;

  apiBaseInput.value = loadFromStorage("apiBase") || apiBaseInput.value;

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

  async function login(userId, password) {
    const res = await fetch(`${getApiBase()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, password }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`登录失败：${res.status} ${detail}`);
    }
    return res.json();
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = userIdInput.value.trim();
    const password = passwordInput.value.trim();
    if (!userId || !password) {
      setStatus("请填写用户ID和密码", "error");
      return;
    }
    setStatus("正在登录...", "info", null);
    try {
      const data = await login(userId, password);
      saveToStorage("authToken", data.access_token);
      saveToStorage("userId", data.user_id);
      saveToStorage("apiBase", getApiBase());
      setStatus("登录成功，正在进入应用...");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 300);
    } catch (err) {
      clearSession();
      setStatus(err.message || "登录失败", "error");
    }
  });

  // 已登录直接跳转
  (function autoRedirect() {
    if (loadFromStorage("authToken") && loadFromStorage("userId")) {
      window.location.href = "index.html";
    }
  })();
})();
