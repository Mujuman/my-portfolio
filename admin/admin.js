const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");
const dashboardStatus = document.getElementById("dashboard-status");
let csrfToken = "";
let state = { profile: null, skills: [], projects: [] };

// Cross-origin credentials fix - version 2
// Allows cookies to be sent across different domains
// Admin: mujahidh-admin.vercel.app, API: mujahidh-api.vercel.app

function setNotice(element, message, kind = "") {
  element.textContent = message;
  element.dataset.kind = kind;
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.method && options.method !== "GET" && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "include"  // CRITICAL: Include cookies for cross-origin requests
  });
  if (response.status === 204) {
    return null;
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      csrfToken = "";
      showLogin();
    }
    // Log errors for debugging
    console.error(`API Error: ${options.method || 'GET'} ${path} - ${response.status}`, result);
    throw new Error(result.error || `Request failed (${response.status} ${response.statusText}).`);
  }
  return result;
}

function showLogin() {
  dashboardView.hidden = true;
  loginView.hidden = false;
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
}

function fillForm(form, values) {
  for (const [name, value] of Object.entries(values)) {
    const input = form.elements.namedItem(name);
    if (input) {
      input.value = value ?? "";
    }
  }
}

function readForm(form, numberFields = []) {
  const values = Object.fromEntries(new FormData(form).entries());
  for (const field of numberFields) {
    values[field] = Number(values[field]);
  }
  delete values.id;
  return values;
}

function makeButton(label, className, action) {
  const button = document.createElement("button");
  button.className = `button secondary ${className || ""}`.trim();
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

function renderSkills() {
  const list = document.getElementById("skills-list");
  list.replaceChildren();
  if (!state.skills.length) {
    list.innerHTML = '<p class="empty-state">No skills added yet.</p>';
    return;
  }

  for (const skill of state.skills) {
    const item = document.createElement("article");
    item.className = "item";
    const copy = document.createElement("div");
    copy.className = "item-copy";
    const title = document.createElement("strong");
    title.textContent = `${skill.name} — ${skill.percent}%`;
    const order = document.createElement("p");
    order.textContent = `Display order: ${skill.order}`;
    copy.append(title, order);
    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.append(
      makeButton("Edit", "", () => editSkill(skill)),
      makeButton("Delete", "danger", () => deleteItem(`/admin/skills/${encodeURIComponent(skill.id)}`, `Delete ${skill.name}?`))
    );
    item.append(copy, actions);
    list.append(item);
  }
}

function editSkill(skill) {
  const form = document.getElementById("skill-form");
  fillForm(form, skill);
  document.getElementById("skill-save").textContent = "Save skill";
  form.querySelector('[data-cancel="skill-form"]').hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderProjects() {
  const list = document.getElementById("projects-list");
  list.replaceChildren();
  if (!state.projects.length) {
    list.innerHTML = '<p class="empty-state">No projects added yet.</p>';
    return;
  }

  for (const project of state.projects) {
    const item = document.createElement("article");
    item.className = "item";
    const copy = document.createElement("div");
    copy.className = "item-copy";
    const title = document.createElement("strong");
    title.textContent = project.title;
    const description = document.createElement("p");
    description.textContent = project.description;
    const technologies = document.createElement("p");
    technologies.textContent = project.technologies || "No technologies listed";
    copy.append(title, description, technologies);
    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.append(
      makeButton("Edit", "", () => editProject(project)),
      makeButton("Delete", "danger", () => deleteItem(`/admin/projects/${encodeURIComponent(project.id)}`, `Delete ${project.title}?`))
    );
    item.append(copy, actions);
    list.append(item);
  }
}

function editProject(project) {
  const form = document.getElementById("project-form");
  fillForm(form, project);
  document.getElementById("project-save").textContent = "Save project";
  form.querySelector('[data-cancel="project-form"]').hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderMessages(messages) {
  const list = document.getElementById("messages-list");
  list.replaceChildren();
  if (!messages.length) {
    list.innerHTML = '<p class="empty-state">No contact messages yet.</p>';
    return;
  }

  for (const message of messages) {
    const item = document.createElement("article");
    item.className = "item message-item";
    const copy = document.createElement("div");
    copy.className = "item-copy";
    const title = document.createElement("strong");
    title.textContent = `${message.name}${message.readAt ? "" : " · New"}`;
    const contact = document.createElement("a");
    contact.href = `mailto:${message.email}`;
    contact.textContent = message.email;
    const body = document.createElement("p");
    body.className = "message-body";
    body.textContent = message.message;
    const date = document.createElement("p");
    date.textContent = new Date(message.createdAt).toLocaleString();
    copy.append(title, contact, body, date);
    if (message.phone) {
      const phone = document.createElement("p");
      phone.textContent = message.phone;
      copy.append(phone);
    }
    const actions = document.createElement("div");
    actions.className = "item-actions";
    actions.append(
      makeButton(message.readAt ? "Mark unread" : "Mark read", "", () => updateMessage(message)),
      makeButton("Delete", "danger", () => deleteMessage(message))
    );
    item.append(copy, actions);
    list.append(item);
  }
}

async function loadMessages() {
  const { messages } = await api("/admin/messages");
  renderMessages(messages);
}

async function loadDashboard() {
  const result = await api("/admin/portfolio");
  state = result;
  fillForm(document.getElementById("profile-form"), result.profile);
  renderSkills();
  renderProjects();
  await loadMessages();
}

async function deleteItem(path, question) {
  if (!window.confirm(question)) {
    return;
  }
  try {
    await api(path, { method: "DELETE" });
    await loadDashboard();
    setNotice(dashboardStatus, "Item deleted.", "success");
  } catch (error) {
    setNotice(dashboardStatus, error.message, "error");
  }
}

async function updateMessage(message) {
  try {
    await api(`/admin/messages/${encodeURIComponent(message._id)}`, {
      method: "PATCH",
      body: JSON.stringify({ read: !message.readAt })
    });
    await loadMessages();
    setNotice(dashboardStatus, "Message updated.", "success");
  } catch (error) {
    setNotice(dashboardStatus, error.message, "error");
  }
}

async function deleteMessage(message) {
  if (!window.confirm(`Delete the message from ${message.name}?`)) {
    return;
  }
  try {
    await api(`/admin/messages/${encodeURIComponent(message._id)}`, { method: "DELETE" });
    await loadMessages();
    setNotice(dashboardStatus, "Message deleted.", "success");
  } catch (error) {
    setNotice(dashboardStatus, error.message, "error");
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setNotice(loginStatus, "Signing in…");
  const submit = loginForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const credentials = Object.fromEntries(new FormData(loginForm).entries());
    const result = await api("/admin/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    });
    csrfToken = result.csrfToken;
    loginForm.reset();
    showDashboard();
    await loadDashboard();
    setNotice(dashboardStatus, `Signed in as ${result.username}.`, "success");
  } catch (error) {
    setNotice(loginStatus, error.message, "error");
  } finally {
    submit.disabled = false;
  }
});

document.getElementById("profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const profile = readForm(event.currentTarget, [
      "age", "experienceYears", "projectCount", "clientCount"
    ]);
    const result = await api("/admin/profile", {
      method: "PUT",
      body: JSON.stringify(profile)
    });
    state.profile = result.profile;
    setNotice(dashboardStatus, "Personal information saved.", "success");
  } catch (error) {
    setNotice(dashboardStatus, error.message, "error");
  }
});

document.getElementById("skill-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.elements.id.value;
  try {
    const skill = readForm(form, ["percent", "order"]);
    await api(id ? `/admin/skills/${encodeURIComponent(id)}` : "/admin/skills", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(skill)
    });
    form.reset();
    form.elements.order.value = "0";
    document.getElementById("skill-save").textContent = "Add skill";
    form.querySelector('[data-cancel="skill-form"]').hidden = true;
    await loadDashboard();
    setNotice(dashboardStatus, id ? "Skill updated." : "Skill added.", "success");
  } catch (error) {
    setNotice(dashboardStatus, error.message, "error");
  }
});

document.getElementById("project-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.elements.id.value;
  try {
    const project = readForm(form, ["order"]);
    await api(id ? `/admin/projects/${encodeURIComponent(id)}` : "/admin/projects", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(project)
    });
    form.reset();
    form.elements.order.value = "0";
    document.getElementById("project-save").textContent = "Add project";
    form.querySelector('[data-cancel="project-form"]').hidden = true;
    await loadDashboard();
    setNotice(dashboardStatus, id ? "Project updated." : "Project added.", "success");
  } catch (error) {
    setNotice(dashboardStatus, error.message, "error");
  }
});

for (const cancel of document.querySelectorAll("[data-cancel]")) {
  cancel.addEventListener("click", () => {
    const form = document.getElementById(cancel.dataset.cancel);
    form.reset();
    form.elements.order.value = "0";
    form.querySelector('[data-cancel]').hidden = true;
    document.getElementById(cancel.dataset.cancel === "skill-form" ? "skill-save" : "project-save")
      .textContent = cancel.dataset.cancel === "skill-form" ? "Add skill" : "Add project";
  });
}

document.getElementById("refresh-messages").addEventListener("click", async () => {
  try {
    await loadMessages();
    setNotice(dashboardStatus, "Messages refreshed.", "success");
  } catch (error) {
    setNotice(dashboardStatus, error.message, "error");
  }
});

document.getElementById("logout-button").addEventListener("click", async () => {
  try {
    await api("/admin/logout", { method: "POST" });
    csrfToken = "";
    showLogin();
    setNotice(loginStatus, "You have signed out.", "success");
  } catch (error) {
    setNotice(dashboardStatus, error.message, "error");
  }
});

try {
  const session = await api("/admin/session");
  csrfToken = session.csrfToken;
  showDashboard();
  await loadDashboard();
} catch (error) {
  showLogin();
  if (error.message !== "Please sign in to continue.") {
    setNotice(loginStatus, error.message, "error");
  }
}
