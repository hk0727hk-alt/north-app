import { onDataChange } from "./db/storage.js";

const routes = [];
let notFoundRender = () => document.createTextNode("Not Found");
let onRouteChange = () => {};
let liveUnsub = null;

export function registerRoute(pattern, render, opts = {}) {
  const paramNames = [];
  const regex = new RegExp(
    "^" +
      pattern
        .split("/")
        .map((seg) => {
          if (seg.startsWith(":")) {
            paramNames.push(seg.slice(1));
            return "([^/]+)";
          }
          return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        })
        .join("/") +
      "$"
  );
  routes.push({ regex, paramNames, render, opts });
}

export function setNotFound(render) {
  notFoundRender = render;
}

export function onNavigate(cb) {
  onRouteChange = cb;
}

export function navigate(path) {
  if (location.hash.slice(1) === path) {
    render();
  } else {
    location.hash = path;
  }
}

export function currentPath() {
  return location.hash.slice(1) || "/";
}

function matchRoute(path) {
  for (const route of routes) {
    const m = path.match(route.regex);
    if (m) {
      const params = {};
      route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
      return { route, params };
    }
  }
  return null;
}

function render({ fromData = false } = {}) {
  if (liveUnsub) { liveUnsub(); liveUnsub = null; }
  const path = currentPath();
  const matched = matchRoute(path);
  const app = document.getElementById("app");
  // A data-driven re-render must keep the user's scroll position.
  if (!fromData) {
    app.scrollTop = 0;
    window.scrollTo(0, 0);
  }
  let node;
  try {
    node = matched ? matched.route.render(matched.params) : notFoundRender();
  } catch (err) {
    console.error("Page render failed", err);
    const errBox = document.createElement("div");
    errBox.className = "page empty-state";
    errBox.style.wordBreak = "break-all";
    errBox.textContent = "表示エラー: " + (err && err.message ? err.message : String(err));
    node = errBox;
  }
  app.replaceChildren(node);
  onRouteChange({ path, opts: matched ? matched.route.opts : {} });
  if (matched && matched.route.opts.live) {
    liveUnsub = onDataChange(() => render({ fromData: true }));
  }
}

export function startRouter() {
  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "/";
  render();
}
