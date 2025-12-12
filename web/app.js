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
  const userCenterButton = document.getElementById("userCenterButton");
  const userCenterModal = document.getElementById("userCenterModal");
  const closeUserCenterButton = document.getElementById("closeUserCenterButton");
  const connectGmailButton = document.getElementById("connectGmailButton");
  const gmailClientIdInput = document.getElementById("gmailClientIdInput");
  const gmailRedirectInput = document.getElementById("gmailRedirectInput");
  const mailboxesList = document.getElementById("mailboxesList");
  const languageSelect = document.getElementById("languageSelect");
  const languageLabel = document.getElementById("languageLabel");
  const greetingPrefix = document.getElementById("greetingPrefix");
  const chatTitleEl = document.getElementById("chatTitle");
  const chatSubtitleEl = document.getElementById("chatSubtitle");
  const chatHistoryTitle = document.getElementById("chatHistoryTitle");
  const chatHistorySubtitle = document.getElementById("chatHistorySubtitle");
  const userCenterTitle = document.getElementById("userCenterTitle");
  const userCenterSubtitle = document.getElementById("userCenterSubtitle");
  const linkGmailTitle = document.getElementById("linkGmailTitle");
  const linkedMailboxesTitle = document.getElementById("linkedMailboxesTitle");
  let statusTimer = null;

  const GMAIL_CLIENT_ID =
    "654999043656-m1nk36prvumftarm2vmuvnqfh685r9kj.apps.googleusercontent.com";
  const GMAIL_REDIRECT_URI = "http://localhost:3000/oauth-callback.html";
  const I18N_KEY = "uiLanguage";
  const translations = {
    en: {
      languageLabel: "Language",
      greetingPrefix: "Hello,",
      userCenterButton: "User Center",
      logoutButton: "Log Out",
      refreshButton: "Refresh Emails",
      prevPageAria: "Previous page",
      nextPageAria: "Next page",
      searchPlaceholder: "Search subject or sender...",
      pageInfo: "Page {page} / {total}",
      emailDetailPlaceholder: "Select an email to view details",
      chatTitle: "AI Assistant",
      chatSubtitle: "Cites inbox content and answers your questions",
      chatHistoryButton: "Chat History",
      clearChatButton: "Clear Chat",
      newChatButton: "New Chat",
      chatInputPlaceholder: "Ask AI, the reply shows on the right.",
      sendButton: "Send",
      chatHistoryTitle: "Chat History",
      chatHistorySubtitle: "Show session title and created time for this user",
      closeChatHistoryAria: "Close chat history",
      userCenterTitle: "User Center",
      userCenterSubtitle: "Manage authorized mailboxes, support Gmail OAuth re-auth & sync.",
      closeUserCenterAria: "Close user center",
      linkGmailTitle: "Link Gmail",
      linkedMailboxesTitle: "Linked Mailboxes",
      mailboxesNoData: "No data",
      promotionTag: "Promo",
      recipientsLabel: "To:",
      threadLabel: "Thread:",
      externalIdLabel: "External ID:",
      noSubject: "(No subject)",
      statusSessionExpired: "Session expired, please log in again",
      statusLoadingEmails: "Loading email list...",
      statusLoadFailedWithCode: "Load failed: {status} {statusText}",
      statusEmailsLoaded: "Emails loaded",
      statusEmailsLoadFailed: "Unable to load emails",
      statusEmailBodyFailedWithCode: "Failed to load email body: {status}",
      statusEmailBodyFailed: "Failed to load email body",
      placeholderLoadingBody: "Loading full email...",
      chatHistoryEmpty: "No chat history yet",
      sessionUntitled: "(Untitled conversation)",
      statusThinking: "AI is thinking...",
      statusAIRequestFailedWithCode: "AI request failed: {status}",
      aiEmptyResponse: "(No response)",
      statusAnswerReady: "Answer generated",
      statusRequestFailed: "Request failed",
      placeholderChatHistoryLoading: "Loading chat history...",
      statusHistoryFailedWithCode: "Failed to load chat history: {status}",
      statusHistoryLoaded: "Chat history loaded",
      statusHistoryFailed: "Failed to load chat history",
      statusLoadingChatMessages: "Loading chat messages...",
      statusChatMessagesFailedWithCode: "Failed to load chat messages: {status}",
      statusChatMessagesFailed: "Failed to load chat messages",
      statusSwitchedSession: "Switched to session {chatId}",
      statusResetSession: "Switched chat_id: {chatId}",
      placeholderMailboxesLoading: "Loading mailboxes...",
      statusMailboxesFailedWithCode: "Load failed {status}",
      statusMailboxesFailed: "Failed to load mailboxes",
      placeholderMailboxesEmpty: "No linked mailbox yet",
      lastSyncedLabel: "Last sync: {time}",
      neverSynced: "Not synced",
      createdAtLabel: "Created: {time}",
      syncButton: "Sync",
      statusSyncedMailbox: "{email} synced",
      statusSyncFailedWithCode: "Sync failed ({status})",
      statusSyncComplete: "Sync completed: added {count} messages",
      statusSyncNeedsReauth: "Sync failed, try re-authorizing",
      statusNoGmailToken: "No Gmail access_token received",
      statusFetchingGmailProfile: "Fetching Gmail account info...",
      statusGmailProfileFailedWithCode: "Unable to fetch Gmail mailbox ({status})",
      statusNoMailboxEmail: "Could not get mailbox email",
      statusGmailMismatch: "Authorized email does not match mailbox to sync",
      statusGmailAuthFailed: "Gmail authorization failed",
      statusGmailConnectFailedWithCode: "Gmail connect failed ({status})",
      statusGmailConnectSuccess: "Gmail linked, fetched {count} emails",
      statusGmailStateMismatch: "Gmail OAuth state mismatch",
      statusGmailAuthErrorWithDetail: "Gmail authorization failed: {detail}",
    },
    "zh-CN": {
      languageLabel: "语言",
      greetingPrefix: "你好，",
      userCenterButton: "用户中心",
      logoutButton: "退出登录",
      refreshButton: "刷新邮件",
      prevPageAria: "上一页",
      nextPageAria: "下一页",
      searchPlaceholder: "搜索主题或发件人...",
      pageInfo: "第 {page} / {total} 页",
      emailDetailPlaceholder: "选择一封邮件查看详情",
      chatTitle: "AI 助手",
      chatSubtitle: "引用邮箱内容并回答你的问题",
      chatHistoryButton: "聊天历史",
      clearChatButton: "清空聊天",
      newChatButton: "新建聊天",
      chatInputPlaceholder: "向 AI 提问，右侧会显示回答。",
      sendButton: "发送",
      chatHistoryTitle: "聊天历史",
      chatHistorySubtitle: "展示当前用户的会话标题与创建时间",
      closeChatHistoryAria: "关闭聊天历史",
      userCenterTitle: "用户中心",
      userCenterSubtitle: "查看 / 管理已授权邮箱账号，支持 Gmail OAuth 重新授权与同步。",
      closeUserCenterAria: "关闭用户中心",
      linkGmailTitle: "链接 Gmail",
      linkedMailboxesTitle: "已链接邮箱",
      mailboxesNoData: "暂无数据",
      promotionTag: "推广",
      recipientsLabel: "收件人:",
      threadLabel: "线程:",
      externalIdLabel: "外部ID:",
      noSubject: "(无主题)",
      statusSessionExpired: "登录已失效，请重新登录",
      statusLoadingEmails: "正在加载邮件列表...",
      statusLoadFailedWithCode: "加载失败：{status} {statusText}",
      statusEmailsLoaded: "邮件加载完成",
      statusEmailsLoadFailed: "无法加载邮件",
      statusEmailBodyFailedWithCode: "加载正文失败：{status}",
      statusEmailBodyFailed: "加载正文失败",
      placeholderLoadingBody: "正在加载完整正文...",
      chatHistoryEmpty: "暂无聊天记录",
      sessionUntitled: "(未命名会话)",
      statusThinking: "AI 思考中...",
      statusAIRequestFailedWithCode: "AI 请求失败：{status}",
      aiEmptyResponse: "（空响应）",
      statusAnswerReady: "回答已生成",
      statusRequestFailed: "请求失败",
      placeholderChatHistoryLoading: "正在加载聊天历史...",
      statusHistoryFailedWithCode: "加载聊天历史失败：{status}",
      statusHistoryLoaded: "聊天历史已加载",
      statusHistoryFailed: "加载聊天历史失败",
      statusLoadingChatMessages: "正在加载聊天记录...",
      statusChatMessagesFailedWithCode: "加载聊天记录失败：{status}",
      statusChatMessagesFailed: "加载聊天记录失败",
      statusSwitchedSession: "已切换到会话 {chatId}",
      statusResetSession: "已切换 chat_id: {chatId}",
      placeholderMailboxesLoading: "正在加载邮箱...",
      statusMailboxesFailedWithCode: "加载失败 {status}",
      statusMailboxesFailed: "加载邮箱失败",
      placeholderMailboxesEmpty: "暂无已链接邮箱",
      lastSyncedLabel: "最近同步：{time}",
      neverSynced: "未同步",
      createdAtLabel: "创建：{time}",
      syncButton: "同步",
      statusSyncedMailbox: "{email} 已同步",
      statusSyncFailedWithCode: "同步失败 ({status})",
      statusSyncComplete: "同步完成：新增 {count} 封",
      statusSyncNeedsReauth: "同步失败，尝试重新授权",
      statusNoGmailToken: "未获取到 Gmail access_token",
      statusFetchingGmailProfile: "正在获取 Gmail 账户信息...",
      statusGmailProfileFailedWithCode: "无法获取 Gmail 邮箱 ({status})",
      statusNoMailboxEmail: "未能获取邮箱账号",
      statusGmailMismatch: "授权邮箱与待同步邮箱不一致",
      statusGmailAuthFailed: "Gmail 授权失败",
      statusGmailConnectFailedWithCode: "Gmail connect 失败 ({status})",
      statusGmailConnectSuccess: "Gmail 链接成功，已抓取 {count} 封邮件",
      statusGmailStateMismatch: "Gmail OAuth 状态不匹配",
      statusGmailAuthErrorWithDetail: "Gmail 授权失败：{detail}",
    },
  };
  let currentLang = loadFromStorage(I18N_KEY) || "en";

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
    mailboxes: [],
    pendingGmailState: null,
    pendingGmailAction: null,
  };

  apiBaseInput.value = loadFromStorage("apiBase") || apiBaseInput.value;
  if (gmailClientIdInput) {
    gmailClientIdInput.value = GMAIL_CLIENT_ID;
    gmailClientIdInput.readOnly = true;
  }
  if (gmailRedirectInput) {
    gmailRedirectInput.value = GMAIL_REDIRECT_URI;
    gmailRedirectInput.readOnly = true;
  }

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
    if (languageSelect) {
      languageSelect.value = currentLang;
    }
    if (languageLabel) {
      languageLabel.textContent = t("languageLabel");
    }
    if (greetingPrefix) {
      greetingPrefix.textContent = t("greetingPrefix");
    }
    if (userCenterButton) userCenterButton.textContent = t("userCenterButton");
    if (logoutButton) logoutButton.textContent = t("logoutButton");
    if (refreshButton) refreshButton.textContent = t("refreshButton");
    if (searchInput) searchInput.placeholder = t("searchPlaceholder");
    if (prevPageBtn) prevPageBtn.setAttribute("aria-label", t("prevPageAria"));
    if (nextPageBtn) nextPageBtn.setAttribute("aria-label", t("nextPageAria"));
    if (pageInfo) {
      const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
      pageInfo.textContent = t("pageInfo", { page: state.page, total: totalPages });
    }
    if (chatTitleEl) chatTitleEl.textContent = t("chatTitle");
    if (chatSubtitleEl) chatSubtitleEl.textContent = t("chatSubtitle");
    if (chatSessionsButton) chatSessionsButton.textContent = t("chatHistoryButton");
    if (clearChatButton) clearChatButton.textContent = t("clearChatButton");
    if (newChatButton) newChatButton.textContent = t("newChatButton");
    if (chatInput) chatInput.placeholder = t("chatInputPlaceholder");
    if (sendButton) sendButton.textContent = t("sendButton");
    if (chatHistoryTitle) chatHistoryTitle.textContent = t("chatHistoryTitle");
    if (chatHistorySubtitle) chatHistorySubtitle.textContent = t("chatHistorySubtitle");
    if (closeChatHistoryButton)
      closeChatHistoryButton.setAttribute("aria-label", t("closeChatHistoryAria"));
    if (userCenterTitle) userCenterTitle.textContent = t("userCenterTitle");
    if (userCenterSubtitle) userCenterSubtitle.textContent = t("userCenterSubtitle");
    if (closeUserCenterButton)
      closeUserCenterButton.setAttribute("aria-label", t("closeUserCenterAria"));
    if (linkGmailTitle) linkGmailTitle.textContent = t("linkGmailTitle");
    if (connectGmailButton) connectGmailButton.textContent = t("linkGmailTitle");
    if (linkedMailboxesTitle) linkedMailboxesTitle.textContent = t("linkedMailboxesTitle");
    if (mailboxesList && !mailboxesList.children.length) {
      mailboxesList.textContent = t("mailboxesNoData");
    }
    if (chatHistoryModal) {
      chatHistoryModal.setAttribute("aria-label", t("chatHistoryTitle"));
    }
    if (userCenterModal) {
      userCenterModal.setAttribute("aria-label", t("userCenterTitle"));
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
    setStatus(t("statusSessionExpired"), "error", 1800);
    clearSession();
    setTimeout(() => {
      window.location.href = "login.html";
    }, 600);
  }

  function getApiBase() {
    return apiBaseInput.value.replace(/\/+$/, "");
  }

  function getDefaultRedirectUri() {
    return GMAIL_REDIRECT_URI;
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
      throw new Error(t("statusSessionExpired"));
    }
    return res;
  }

  async function fetchEmails() {
    setStatus(t("statusLoadingEmails"));
    try {
      const url = `${getApiBase()}/emails?page=${state.page}&page_size=${state.pageSize}`;
      const res = await apiFetch(url);
      if (!res.ok) {
        throw new Error(
          t("statusLoadFailedWithCode", { status: res.status, statusText: res.statusText })
        );
      }
      const data = await res.json();
      state.emails = data.items || [];
      state.total = data.total || 0;
      renderEmails();
      setStatus(t("statusEmailsLoaded"));
    } catch (err) {
      setStatus(err.message || t("statusEmailsLoadFailed"), "error");
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
          <div class="subject">${escapeHtml(e.subject || t("noSubject"))}</div>
          <div class="meta">${formatDate(e.ts)}</div>
        </div>
        <div class="email-row">
          <div class="meta">${escapeHtml(e.sender || "")}</div>
          <div class="meta">
            ${e.is_promotion ? `<span class="chip">${t("promotionTag")}</span>` : ""}
            <span class="chip">Score ${Number(e.importance_score || 0).toFixed(2)}</span>
          </div>
        </div>
        <div class="snippet">${escapeHtml(e.body_snippet || "")}</div>
      `;
      item.onclick = () => selectEmail(e);
      emailList.appendChild(item);
    });

    const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    pageInfo.textContent = t("pageInfo", { page: state.page, total: totalPages });
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
        throw new Error(t("statusEmailBodyFailedWithCode", { status: res.status }));
      }
      const data = await res.json();
      if (!state.selectedEmail || state.selectedEmail.id !== emailId) return;
      state.selectedEmail = { ...data, loading: false };
      renderEmails();
      renderEmailDetail(state.selectedEmail);
    } catch (err) {
      setStatus(err.message || t("statusEmailBodyFailed"), "error");
    }
  }

  function renderEmailDetail(email) {
    if (!email) {
      emailDetail.classList.add("empty");
      emailDetail.innerHTML = `<div class="placeholder">${t("emailDetailPlaceholder")}</div>`;
      return;
    }
    emailDetail.classList.remove("empty");
    const body = email.loading
      ? `<div class='placeholder'>${t("placeholderLoadingBody")}</div>`
      : `<div class="body-full">${escapeHtml(email.body_text || email.body_snippet || "")}</div>`;
    emailDetail.innerHTML = `
      <h3>${escapeHtml(email.subject || t("noSubject"))}</h3>
      <div class="detail-meta">
        <span>${escapeHtml(email.sender || "")}</span>
        <span>${formatDate(email.ts)}</span>
      </div>
      <div class="detail-meta">
        <span>${t("recipientsLabel")} ${escapeHtml((email.recipients || []).join(", "))}</span>
      </div>
      ${body}
      <div class="detail-meta">
        <span>${t("threadLabel")} ${escapeHtml(email.thread_id || "-")}</span>
        <span>${t("externalIdLabel")} ${escapeHtml(email.external_id || "-")}</span>
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
      chatSessionsList.innerHTML = `<div class="placeholder">${t("chatHistoryEmpty")}</div>`;
      return;
    }
    state.chatSessions.forEach((s) => {
      const item = document.createElement("div");
      item.className = "session-item";
      if (s.chat_id === state.chatId) {
        item.classList.add("active");
      }
      item.innerHTML = `
        <div class="session-title">${escapeHtml(s.title || t("sessionUntitled"))}</div>
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
    setStatus(t("statusThinking"), "info", null);
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
        throw new Error(t("statusAIRequestFailedWithCode", { status: res.status }));
      }
      const data = await res.json();
      appendChatMessage("bot", data.answer || t("aiEmptyResponse"), data.sources || []);
      setStatus(t("statusAnswerReady"));
    } catch (err) {
      appendChatMessage("bot", err.message || t("statusRequestFailed"));
      setStatus(err.message || t("statusRequestFailed"), "error");
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
    chatSessionsList.innerHTML = `<div class="placeholder">${t("placeholderChatHistoryLoading")}</div>`;
    try {
      const res = await apiFetch(`${getApiBase()}/ai/chat-sessions?limit=200`);
      if (!res.ok) {
        throw new Error(t("statusHistoryFailedWithCode", { status: res.status }));
      }
      const data = await res.json();
      state.chatSessions = data.items || [];
      renderChatSessions();
      setStatus(t("statusHistoryLoaded"));
    } catch (err) {
      chatSessionsList.innerHTML = `<div class="placeholder">${escapeHtml(
        err.message || t("statusHistoryFailed")
      )}</div>`;
      setStatus(err.message || t("statusHistoryFailed"), "error");
    }
  }

  function closeChatHistoryModal() {
    chatHistoryModal.classList.add("hidden");
  }

  async function selectChatSession(chatId) {
    closeChatHistoryModal();
    state.chatId = chatId;
    saveToStorage("chatId", chatId);
    setStatus(t("statusLoadingChatMessages"), "info", null);
    try {
      const res = await apiFetch(
        `${getApiBase()}/ai/chat-messages?chat_id=${encodeURIComponent(chatId)}&limit=200`
      );
      if (!res.ok) {
        throw new Error(t("statusChatMessagesFailedWithCode", { status: res.status }));
      }
      const data = await res.json();
      state.chatMessages = (data.items || []).map((m) => ({
        role: m.role === "assistant" ? "bot" : "user",
        content: m.content,
      }));
      renderChat();
      setStatus(t("statusSwitchedSession", { chatId }));
    } catch (err) {
      setStatus(err.message || t("statusChatMessagesFailed"), "error");
    }
  }

  function resetChat(newChatId = null) {
    state.chatMessages = [];
    state.chatId = newChatId || `chat-${Date.now()}`;
    saveToStorage("chatId", state.chatId);
    renderChat();
    setStatus(t("statusResetSession", { chatId: state.chatId }));
  }

  async function fetchMailboxes() {
    if (!mailboxesList) return;
    mailboxesList.innerHTML = `<div class="placeholder">${t("placeholderMailboxesLoading")}</div>`;
    try {
      const res = await apiFetch(`${getApiBase()}/mailboxes`);
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || t("statusMailboxesFailedWithCode", { status: res.status }));
      }
      const data = await res.json();
      state.mailboxes = data.items || [];
      renderMailboxes();
    } catch (err) {
      mailboxesList.innerHTML = `<div class="placeholder">${escapeHtml(
        err.message || t("statusMailboxesFailed")
      )}</div>`;
      setStatus(err.message || t("statusMailboxesFailed"), "error");
    }
  }

  function renderMailboxes() {
    if (!mailboxesList) return;
    mailboxesList.innerHTML = "";
    if (!state.mailboxes.length) {
      mailboxesList.classList.add("placeholder");
      mailboxesList.textContent = t("placeholderMailboxesEmpty");
      return;
    }
    mailboxesList.classList.remove("placeholder");
    state.mailboxes.forEach((m) => {
      const item = document.createElement("div");
      item.className = "mailbox-item";

      const info = document.createElement("div");
      info.className = "mailbox-info";

      const title = document.createElement("div");
      title.className = "subject";
      title.textContent = m.provider || "";

      const meta = document.createElement("div");
      meta.className = "mailbox-meta";
      const typeTag = document.createElement("span");
      typeTag.className = "tag";
      typeTag.textContent = (m.provider_type || "gmail").toUpperCase();
      meta.appendChild(typeTag);
      const lastSync = document.createElement("span");
      const lastSyncTime = formatDate(m.last_synced_at) || t("neverSynced");
      lastSync.textContent = t("lastSyncedLabel", { time: lastSyncTime });
      meta.appendChild(lastSync);
      const createdAt = document.createElement("span");
      createdAt.textContent = t("createdAtLabel", { time: formatDate(m.created_at) });
      meta.appendChild(createdAt);
      info.appendChild(title);
      info.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "mailbox-actions";
      const syncBtn = document.createElement("button");
      syncBtn.className = "ghost";
      syncBtn.textContent = t("syncButton");
      syncBtn.onclick = () => syncMailboxWithRetry(m);
      actions.appendChild(syncBtn);

      item.appendChild(info);
      item.appendChild(actions);
      mailboxesList.appendChild(item);
    });
  }

  function openUserCenter() {
    if (!userCenterModal) return;
    if (gmailRedirectInput && !gmailRedirectInput.value) {
      gmailRedirectInput.value = getDefaultRedirectUri();
    }
    userCenterModal.classList.remove("hidden");
    fetchMailboxes();
  }

  function closeUserCenter() {
    if (!userCenterModal) return;
    userCenterModal.classList.add("hidden");
  }

  function startGmailOAuth(action = { type: "connect" }) {
    const clientId = GMAIL_CLIENT_ID;
    const redirectUri = GMAIL_REDIRECT_URI;
    const stateToken = `gmail-${Date.now()}`;
    state.pendingGmailState = stateToken;
    state.pendingGmailAction = action;
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "token");
    authUrl.searchParams.set(
      "scope",
      "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email"
    );
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("state", stateToken);
    window.open(authUrl.toString(), "gmail_oauth", "width=520,height=700");
  }

  async function handleGmailAccessToken(accessToken, refreshToken = null) {
    if (!accessToken) {
      setStatus(t("statusNoGmailToken"), "error");
      return;
    }
    setStatus(t("statusFetchingGmailProfile"), "info");
    try {
      const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!profileRes.ok) {
        const detail = await profileRes.text();
        throw new Error(
          detail || t("statusGmailProfileFailedWithCode", { status: profileRes.status })
        );
      }
      const profile = await profileRes.json();
      const email = (profile && profile.emailAddress) || "";
      if (!email) {
        throw new Error(t("statusNoMailboxEmail"));
      }
      const pendingAction = state.pendingGmailAction || { type: "connect" };
      state.pendingGmailAction = null;
      if (pendingAction.type === "sync" && pendingAction.email) {
        const target = (pendingAction.email || "").toLowerCase();
        if (target && target !== email.toLowerCase()) {
          throw new Error(t("statusGmailMismatch"));
        }
      }
      if (pendingAction.type === "sync") {
        await callGmailSync(email, { access_token: accessToken, refresh_token: refreshToken });
        setStatus(t("statusSyncedMailbox", { email }));
      } else {
        await callGmailConnect(email, accessToken, refreshToken);
      }
      await fetchMailboxes();
      await fetchEmails();
    } catch (err) {
      setStatus(err.message || t("statusGmailAuthFailed"), "error");
    }
  }

  async function callGmailConnect(email, accessToken, refreshToken) {
    const res = await apiFetch(`${getApiBase()}/gmail/connect`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        email,
        access_token: accessToken,
        refresh_token: refreshToken,
        days_back: 90,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(detail || t("statusGmailConnectFailedWithCode", { status: res.status }));
    }
    const data = await res.json();
    setStatus(t("statusGmailConnectSuccess", { count: data.ingested || 0 }), "info");
    return data;
  }

  async function callGmailSync(email, tokens = null) {
    const payload = {
      email,
      fallback_days_back: 7,
    };
    if (tokens && tokens.access_token) {
      payload.access_token = tokens.access_token;
    }
    if (tokens && tokens.refresh_token) {
      payload.refresh_token = tokens.refresh_token;
    }
    const res = await apiFetch(`${getApiBase()}/gmail/sync`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text();
      const err = new Error(detail || t("statusSyncFailedWithCode", { status: res.status }));
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    setStatus(t("statusSyncComplete", { count: data.ingested || 0 }), "info");
    return data;
  }

  async function syncMailboxWithRetry(mailbox) {
    const email = mailbox.provider;
    try {
      await callGmailSync(email);
      await fetchMailboxes();
      await fetchEmails();
      setStatus(t("statusSyncedMailbox", { email }));
    } catch (err) {
      setStatus((err && err.message) || t("statusSyncNeedsReauth"), "error");
      state.pendingGmailAction = { type: "sync", email };
      startGmailOAuth({ type: "sync", email });
    }
  }

  function handleWindowMessage(event) {
    const data = event.data || {};
    if (data.source !== "gmail-oauth") return;
    if (state.pendingGmailState && data.state && data.state !== state.pendingGmailState) {
      setStatus(t("statusGmailStateMismatch"), "error");
      return;
    }
    state.pendingGmailState = null;
    if (data.error) {
      setStatus(
        t("statusGmailAuthErrorWithDetail", { detail: data.error_description || data.error }),
        "error"
      );
      return;
    }
    handleGmailAccessToken(data.access_token, data.refresh_token);
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
    if (userCenterButton) {
      userCenterButton.onclick = openUserCenter;
    }
    if (closeUserCenterButton) {
      closeUserCenterButton.onclick = closeUserCenter;
    }
    if (userCenterModal) {
      userCenterModal.addEventListener("click", (e) => {
        if (e.target === userCenterModal) {
          closeUserCenter();
        }
      });
    }
    if (connectGmailButton) {
      connectGmailButton.onclick = () => startGmailOAuth({ type: "connect" });
    }
    apiBaseInput.onchange = () => saveToStorage("apiBase", getApiBase());
    logoutButton.onclick = () => {
      clearSession();
      window.location.href = "login.html";
    };
    if (languageSelect) {
      languageSelect.onchange = (e) => {
        currentLang = e.target.value || "en";
        saveToStorage(I18N_KEY, currentLang);
        applyLanguage();
        renderEmails();
        renderEmailDetail(state.selectedEmail);
        renderChat();
        renderChatSessions();
        renderMailboxes();
      };
    }
  }

  function init() {
    if (!requireAuth()) return;
    applyLanguage();
    bindEvents();
    window.addEventListener("message", handleWindowMessage);
    renderEmails();
    renderChat();
    fetchEmails();
    fetchMailboxes();
  }

  init();
})();
