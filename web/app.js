(() => {
  const apiBaseInput = document.getElementById("apiBaseInput");
  const userIdInput = document.getElementById("userIdInput");
  const searchInput = document.getElementById("searchInput");
  const emailList = document.getElementById("emailList");
  const emailDetail = document.getElementById("emailDetail");
  const pageInfo = document.getElementById("pageInfo");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const refreshButton = document.getElementById("refreshButton");
  const newChatButton = document.getElementById("newChatButton");
  const clearChatButton = document.getElementById("clearChatButton");
  const chatHistory = document.getElementById("chatHistory");
  const chatInput = document.getElementById("chatInput");
  const sendButton = document.getElementById("sendButton");
  const statusBar = document.getElementById("statusBar");

  const state = {
    page: 1,
    pageSize: 20,
    total: 0,
    emails: [],
    selectedEmail: null,
    chatMessages: [],
    chatId: loadFromStorage("chatId") || `chat-${Date.now()}`,
  };

  apiBaseInput.value = loadFromStorage("apiBase") || apiBaseInput.value;
  userIdInput.value = loadFromStorage("userId") || userIdInput.value;

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

  function getApiBase() {
    return apiBaseInput.value.replace(/\/+$/, "");
  }

  function getUserId() {
    return userIdInput.value.trim() || "demo";
  }

  function setStatus(message, type = "info") {
    statusBar.textContent = message;
    statusBar.classList.toggle("error", type === "error");
  }

  function formatDate(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleString();
  }

  async function fetchEmails() {
    setStatus("正在加载邮件列表...");
    try {
      const url = `${getApiBase()}/emails?page=${state.page}&page_size=${state.pageSize}`;
      const res = await fetch(url, {
        headers: {
          "X-User-Id": getUserId(),
        },
      });
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
    pageInfo.textContent = `第 ${state.page} / ${totalPages} 页（${state.total} 封）`;
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
      const res = await fetch(`${getApiBase()}/emails/${emailId}`, {
        headers: { "X-User-Id": getUserId() },
      });
      if (!res.ok) {
        throw new Error(`加载正文失败：${res.status}`);
      }
      const data = await res.json();
      // Ensure we're updating the currently selected email
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
      bubble.innerHTML = escapeHtml(msg.content);
      chatHistory.appendChild(bubble);
    });
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  async function sendMessage() {
    const question = chatInput.value.trim();
    if (!question) return;
    appendChatMessage("user", question);
    chatInput.value = "";
    setStatus("AI 思考中...");
    try {
      const res = await fetch(`${getApiBase()}/ai/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": getUserId(),
        },
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
    apiBaseInput.onchange = () => saveToStorage("apiBase", getApiBase());
    userIdInput.onchange = () => saveToStorage("userId", getUserId());
  }

  function init() {
    bindEvents();
    renderEmails();
    renderChat();
    fetchEmails();
  }

  init();
})();
