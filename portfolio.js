const menu = document.getElementById("menu");
const nav = document.getElementById("nav");
const times = document.getElementById("times");
const apiBase = "/api";

menu.addEventListener("click", () => {
  nav.style.right = "0";
});

times.addEventListener("click", () => {
  nav.style.right = "-100%";
});

nav.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", () => {
    nav.style.right = "-100%";
  });
});

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function renderSkills(skills) {
  const primary = document.getElementById("skills-primary");
  const secondary = document.getElementById("skills-secondary");
  primary.replaceChildren();
  secondary.replaceChildren();

  const firstColumnLength = Math.ceil(skills.length / 2);
  skills.forEach((skill, index) => {
    const box = makeElement("div", "skill-box");
    const name = makeElement("div", "skill-name");
    const title = makeElement("h3", "", skill.name);
    const bar = makeElement("div", "bar");
    const progress = makeElement("div", "progress");
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", skill.name);
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.setAttribute("aria-valuenow", String(skill.percent));
    const fill = makeElement("div", "skill-fill");
    fill.style.width = `${skill.percent}%`;
    const percent = makeElement("span", "", `${skill.percent}%`);
    progress.append(fill);
    bar.append(progress, percent);
    name.append(title, bar);
    box.append(name);
    (index < firstColumnLength ? primary : secondary).append(box);
  });

  const footerSkills = document.getElementById("footer-skill-list");
  footerSkills.replaceChildren();
  skills.forEach((skill) => footerSkills.append(makeElement("p", "", skill.name)));
}

function makeProjectLink(url, label, icon) {
  if (!url) {
    return null;
  }
  const link = makeElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", label);
  const symbol = makeElement("i", icon);
  symbol.setAttribute("aria-hidden", "true");
  link.append(symbol);
  return link;
}

function renderProjects(projects) {
  const list = document.getElementById("project-list");
  list.replaceChildren();

  projects.forEach((project) => {
    const card = makeElement("article", "pro-card");
    const image = makeElement("img", "pro-img");
    image.src = project.imageUrl;
    image.alt = project.title;
    image.loading = "lazy";

    const details = makeElement("div", "pro-link");
    details.append(makeElement("h3", "", project.title));
    const description = makeElement("p");
    description.append(document.createTextNode(`${project.description} `));
    if (project.technologies) {
      description.append(makeElement("span", "tech", project.technologies));
    }

    const links = makeElement("div", "links");
    const liveLink = makeProjectLink(project.liveUrl, `View ${project.title}`, "fa-solid fa-eye");
    const sourceLink = makeProjectLink(project.sourceUrl, `${project.title} source code`, "fa-brands fa-github");
    if (liveLink) {
      links.append(liveLink);
    }
    if (sourceLink) {
      links.append(sourceLink);
    }
    details.append(description, links);
    card.append(image, details);
    list.append(card);
  });
}

function renderProfile(profile) {
  document.querySelectorAll("[data-profile]").forEach((element) => {
    const key = element.dataset.profile;
    if (Object.hasOwn(profile, key) && profile[key] !== null && profile[key] !== "") {
      element.textContent = String(profile[key]);
    }
  });
  document.querySelectorAll(".profile-name").forEach((element) => {
    element.textContent = profile.name;
  });
}

async function loadPortfolio() {
  const response = await fetch(`${apiBase}/portfolio`, {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) {
    throw new Error(`Portfolio API returned HTTP ${response.status}.`);
  }
  const portfolio = await response.json();
  renderProfile(portfolio.profile);
  renderSkills(portfolio.skills);
  renderProjects(portfolio.projects);
}

loadPortfolio().catch((error) => {
  console.warn("Portfolio content could not be refreshed from the server.", error);
});

const contactForm = document.getElementById("contact-form");
const contactStatus = document.getElementById("contact-status");
contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!contactForm.reportValidity()) {
    return;
  }

  const submitButton = contactForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  contactStatus.textContent = "Sending your message…";
  contactStatus.dataset.kind = "";

  try {
    const formData = new FormData(contactForm);
    const response = await fetch(`${apiBase}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "Your message could not be sent. Please try again.");
    }
    contactForm.reset();
    contactStatus.textContent = result.message;
    contactStatus.dataset.kind = "success";
  } catch (error) {
    contactStatus.textContent = error.message || "Unable to send your message. Please try again.";
    contactStatus.dataset.kind = "error";
  } finally {
    submitButton.disabled = false;
  }
});
