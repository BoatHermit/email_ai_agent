(() => {
  const apiBaseInput = document.getElementById("apiBaseInput");
  const userGreeting = document.getElementById("userGreeting");
  const logoutButton = document.getElementById("logoutButton");
  const searchInput = document.getElementById("searchInput");
  const emailList = document.getElementById("emailList");
  const emailDetail = document.getElementById("emailDetail");
  const pageInfo = document.getElementById("pageInfo");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const refreshButton = document.getElementById("refreshButton");
  const newChatButton = document.getElementById("newChatButton");
  const clearChatButton = document.getElementById("clearChatButton");
  const chatSessionsButton = document.getElementById("chatSessionsButton");
  const chatHistoryModal = document.getElementById("chatHistoryModal");
  const closeChatHistoryButton = document.getElementById("closeChatHistoryButton");
  const chatSessionsList = document.getElementById("chatSessionsList");
  const chatHistory = document.getElementById("chatHistory");
  const chatInput = document.getElementById("chatInput");
  const sendButton = document.getElementById("sendButton");
  const statusBar = document.getElementById("statusBar");
  let statusTimer = null;

  const state = {
    page: 1,
    pageSize: 20,
    total: 0,
    emails: [],
    selectedEmail: null,
    chatMessages: [],
    chatId: loadFromStorage("chatId") || `chat-${Date.now()}`,
    chatSessions: [],
    userId: loadFromStorage("userId"),
    authToken: loadFromStorage("authToken"),
  };

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

  function requireAuth() {
    if (!state.userId || !state.authToken) {
      window.location.href = "login.html";
      return false;
    }
    if (userGreeting) {
      userGreeting.textContent = state.userId;
    }
    return true;
  }

  function handleUnauthorized() {
    setStatus("登录已失效，请重新登录", "error", 1800);
    clearSession();
    setTimeout(() => {
      window.location.href = "login.html";
    }, 600);
  }

  function getApiBase() {
    return apiBaseInput.value.replace(/\/+$/, "");
  }

  function authHeaders(extra = {}) {
    return {
      Authorization: `Bearer ${state.authToken || ""}`,
      ...extra,
    };
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

  function formatDate(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleString();
  }

  async function apiFetch(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: authHeaders(options.headers || {}),
    });
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error("登录已失效，请重新登录");
    }
    return res;
  }

  async function fetchEmails() {
    setStatus("正在加载邮件列表...");
    try {
      const url = `${getApiBase()}/emails?page=${state.page}&page_size=${state.pageSize}`;
      const res = await apiFetch(url);
      if (!res.ok) {
        throw new Error(`加载失败：${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      state.emails = data.items || [];
      state.total = data.total || 0;
      renderEmails();
      setStatus("邮件加载完成");
    } catch (err) {
      setStatus(err.message || "无法加载邮件", "error");
    }
  }

  function renderEmails() {
    const kw = searchInput.value.trim().toLowerCase();
    const filtered = kw
      ? state.emails.filter((e) => {
          return (
            (e.subject || "").toLowerCase().includes(kw) ||
            (e.sender || "").toLowerCase().includes(kw)
          );
        })
      : state.emails;

    emailList.innerHTML = "";
    filtered.forEach((e) => {
      const item = document.createElement("div");
      item.className = "email-item";
      if (state.selectedEmail && state.selectedEmail.id === e.id) {
        item.classList.add("active");
      }
      item.innerHTML = `
        <div class="email-row">
          <div class="subject">${escapeHtml(e.subject || "(无主题)")}</div>
          <div class="meta">${formatDate(e.ts)}</div>
        </div>
        <div class="email-row">
          <div class="meta">${escapeHtml(e.sender || "")}</div>
          <div class="meta">
            ${e.is_promotion ? '<span class="chip">推广</span>' : ""}
            <span class="chip">Score ${Number(e.importance_score || 0).toFixed(2)}</span>
          </div>
        </div>
        <div class="snippet">${escapeHtml(e.body_snippet || "")}</div>
      `;
      item.onclick = () => selectEmail(e);
      emailList.appendChild(item);
    });

    const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    pageInfo.textContent = `第 ${state.page} / ${totalPages} 页`;
    prevPageBtn.disabled = state.page <= 1;
    nextPageBtn.disabled = state.page >= totalPages;
  }

  function selectEmail(email) {
    state.selectedEmail = { ...email, loading: true };
    renderEmails();
    renderEmailDetail(state.selectedEmail);
    fetchEmailDetail(email.id);
  }

  async function fetchEmailDetail(emailId) {
    try {
      const res = await apiFetch(`${getApiBase()}/emails/${emailId}`);
      if (!res.ok) {
        throw new Error(`加载正文失败：${res.status}`);
      }
      const data = await res.json();
      if (!state.selectedEmail || state.selectedEmail.id !== emailId) return;
      state.selectedEmail = { ...data, loading: false };
      renderEmails();
      renderEmailDetail(state.selectedEmail);
    } catch (err) {
      setStatus(err.message || "加载正文失败", "error");
    }
  }

  function renderEmailDetail(email) {
    if (!email) {
      emailDetail.classList.add("empty");
      emailDetail.innerHTML = '<div class="placeholder">选择一封邮件查看详情</div>';
      return;
    }
    emailDetail.classList.remove("empty");
    const body = email.loading
      ? "<div class='placeholder'>正在加载完整正文...</div>"
      : `<div class="body-full">${escapeHtml(email.body_text || email.body_snippet || "")}</div>`;
    emailDetail.innerHTML = `
      <h3>${escapeHtml(email.subject || "(无主题)")}</h3>
      <div class="detail-meta">
        <span>${escapeHtml(email.sender || "")}</span>
        <span>${formatDate(email.ts)}</span>
      </div>
      <div class="detail-meta">
        <span>收件人: ${escapeHtml((email.recipients || []).join(", "))}</span>
      </div>
      ${body}
      <div class="detail-meta">
        <span>Thread: ${escapeHtml(email.thread_id || "-")}</span>
        <span>外部ID: ${escapeHtml(email.external_id || "-")}</span>
      </div>
    `;
  }

  function escapeHtml(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderChat() {
    chatHistory.innerHTML = "";
    state.chatMessages.forEach((msg) => {
      const bubble = document.createElement("div");
      bubble.className = `chat-bubble ${msg.role}`;
      if (msg.role === "bot") {
        bubble.innerHTML = `<div class="md">${renderMarkdown(msg.content)}</div>`;
      } else {
        bubble.innerHTML = escapeHtml(msg.content);
      }
      chatHistory.appendChild(bubble);
    });
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  function renderChatSessions() {
    chatSessionsList.innerHTML = "";
    if (!state.chatSessions.length) {
      chatSessionsList.innerHTML = '<div class="placeholder">暂无聊天记录</div>';
      return;
    }
    state.chatSessions.forEach((s) => {
      const item = document.createElement("div");
      item.className = "session-item";
      if (s.chat_id === state.chatId) {
        item.classList.add("active");
      }
      item.innerHTML = `
        <div class="session-title">${escapeHtml(s.title || "(未命名会话)")}</div>
        <div class="session-meta">
          <span>${escapeHtml(s.chat_id || "")}</span>
          <span>${formatDate(s.created_at)}</span>
        </div>
      `;
      item.onclick = () => selectChatSession(s.chat_id);
      chatSessionsList.appendChild(item);
    });
  }

  async function sendMessage() {
    const question = chatInput.value.trim();
    if (!question) return;
    appendChatMessage("user", question);
    chatInput.value = "";
    setStatus("AI 思考中...", "info", null);
    try {
      const res = await apiFetch(`${getApiBase()}/ai/ask`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          question,
          current_thread_id: state.selectedEmail ? state.selectedEmail.thread_id : null,
          chat_id: state.chatId,
        }),
      });
      if (!res.ok) {
        throw new Error(`AI 请求失败：${res.status}`);
      }
      const data = await res.json();
      appendChatMessage("bot", data.answer || "（空响应）", data.sources || []);
      setStatus("回答已生成");
    } catch (err) {
      appendChatMessage("bot", err.message || "请求失败");
      setStatus(err.message || "请求失败", "error");
    }
  }

  function appendChatMessage(role, content, sources) {
    state.chatMessages.push({ role, content, sources: sources || [] });
    renderChat();
  }

  function renderMarkdown(text) {
    let escaped = escapeHtml(text || "");
    escaped = escaped
      .replace(/^###\s+(.+)$/gm, "<h4>$1</h4>")
      .replace(/^##\s+(.+)$/gm, "<h3>$1</h3>")
      .replace(/^#\s+(.+)$/gm, "<h2>$1</h2>");

    escaped = escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

    const lines = escaped.split(/\r?\n/);
    let inList = false;
    const htmlLines = [];
    for (const line of lines) {
      if (/^\s*[-*+]\s+/.test(line)) {
        if (!inList) {
          htmlLines.push("<ul>");
          inList = true;
        }
        htmlLines.push("<li>" + line.replace(/^\s*[-*+]\s+/, "") + "</li>");
      } else {
        if (inList) {
          htmlLines.push("</ul>");
          inList = false;
        }
        if (line.trim() === "") {
          htmlLines.push("<br>");
        } else {
          htmlLines.push(line);
        }
      }
    }
    if (inList) htmlLines.push("</ul>");

    return htmlLines.join("\n");
  }

  async function openChatHistoryModal() {
    chatHistoryModal.classList.remove("hidden");
    chatSessionsList.innerHTML = '<div class="placeholder">正在加载聊天历史...</div>';
    try {
      const res = await apiFetch(`${getApiBase()}/ai/chat-sessions?limit=200`);
      if (!res.ok) {
        throw new Error(`加载聊天历史失败：${res.status}`);
      }
      const data = await res.json();
      state.chatSessions = data.items || [];
      renderChatSessions();
      setStatus("聊天历史已加载");
    } catch (err) {
      chatSessionsList.innerHTML = `<div class="placeholder">${escapeHtml(
        err.message || "加载聊天历史失败"
      )}</div>`;
      setStatus(err.message || "加载聊天历史失败", "error");
    }
  }

  function closeChatHistoryModal() {
    chatHistoryModal.classList.add("hidden");
  }

  async function selectChatSession(chatId) {
    closeChatHistoryModal();
    state.chatId = chatId;
    saveToStorage("chatId", chatId);
    setStatus("正在加载聊天记录...", "info", null);
    try {
      const res = await apiFetch(
        `${getApiBase()}/ai/chat-messages?chat_id=${encodeURIComponent(chatId)}&limit=200`
      );
      if (!res.ok) {
        throw new Error(`加载聊天记录失败：${res.status}`);
      }
      const data = await res.json();
      state.chatMessages = (data.items || []).map((m) => ({
        role: m.role === "assistant" ? "bot" : "user",
        content: m.content,
      }));
      renderChat();
      setStatus(`已切换到会话 ${chatId}`);
    } catch (err) {
      setStatus(err.message || "加载聊天记录失败", "error");
    }
  }

  function resetChat(newChatId = null) {
    state.chatMessages = [];
    state.chatId = newChatId || `chat-${Date.now()}`;
    saveToStorage("chatId", state.chatId);
    renderChat();
    setStatus(`已切换 chat_id: ${state.chatId}`);
  }

  function bindEvents() {
    refreshButton.onclick = () => {
      state.page = 1;
      fetchEmails();
    };
    searchInput.oninput = () => renderEmails();
    prevPageBtn.onclick = () => {
      if (state.page > 1) {
        state.page -= 1;
        fetchEmails();
      }
    };
    nextPageBtn.onclick = () => {
      const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
      if (state.page < totalPages) {
        state.page += 1;
        fetchEmails();
      }
    };
    sendButton.onclick = sendMessage;
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        sendMessage();
      }
    });
    newChatButton.onclick = () => resetChat();
    clearChatButton.onclick = () => resetChat(state.chatId);
    chatSessionsButton.onclick = openChatHistoryModal;
    closeChatHistoryButton.onclick = closeChatHistoryModal;
    chatHistoryModal.addEventListener("click", (e) => {
      if (e.target === chatHistoryModal) {
        closeChatHistoryModal();
      }
    });
    apiBaseInput.onchange = () => saveToStorage("apiBase", getApiBase());
    logoutButton.onclick = () => {
      clearSession();
      window.location.href = "login.html";
    };
  }

  function init() {
    if (!requireAuth()) return;
    bindEvents();
    renderEmails();
    renderChat();
    fetchEmails();
  }

  init();
})();
