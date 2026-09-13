// TEMP DIAGNOSTIC: runs immediately when this module loads, independent of
// everything else below, to check whether a bare fetch()+setInterval works
// when this code is loaded as part of the app's real module graph.
(function diagBlock() {
  const box = document.createElement("div");
  box.style.cssText = "position:fixed; top:0; left:0; right:0; z-index:99999; background:#000; color:#0f0; font-size:12px; padding:6px; font-family:monospace; white-space:pre-wrap; word-break:break-all;";
  box.textContent = "diag: starting...";
  document.body.appendChild(box);
  let sec = 0;
  setInterval(() => {
    sec += 1;
    box.textContent = box.textContent.replace(/^diag:.*?\n/, "") ;
    box.textContent = `diag sec=${sec}\n` + box.textContent.split("\n").slice(1).join("\n");
  }, 1000);
  box.textContent = "diag sec=0\nfetch: pending...";
  const t0 = Date.now();
  fetch("https://firestore.googleapis.com/v1/projects/north-app-web/databases/(default)/documents/users?pageSize=300&key=AIzaSyAtcgZII2a3grevgwOGdEbXKpCT_va4Keo")
    .then((r) => r.json())
    .then((d) => {
      box.textContent = box.textContent.split("\n")[0] + `\nfetch: OK ${Date.now() - t0}ms n=${(d.documents || []).length}`;
    })
    .catch((e) => {
      box.textContent = box.textContent.split("\n")[0] + `\nfetch: ERR ${Date.now() - t0}ms ${e.message}`;
    });
})();

import { registerRoute, setNotFound, onNavigate, navigate, startRouter } from "./router.js";
import { initStore } from "./db/storage.js";
import { getCurrentUser, isManager, isMaster } from "./db/session.js";
import { isUnlocked, setUnlocked } from "./db/access.js";
import { mountHeader, updateHeader } from "./components/header.js";
import { mountBottomNav, updateBottomNav } from "./components/bottomNav.js";
import { h } from "./utils/dom.js";

import { renderAccessGate } from "./pages/accessGate.js";
import { renderHome } from "./pages/home.js";
import { renderLogin } from "./pages/login.js";
import { renderSettings } from "./pages/settings.js";

import { renderVehicleList } from "./pages/vehicles/list.js";
import { renderVehicleDetail } from "./pages/vehicles/detail.js";
import { renderVehicleForm } from "./pages/vehicles/form.js";
import { renderDailyReport } from "./pages/vehicles/dailyReport.js";
import { renderInspection } from "./pages/vehicles/inspection.js";
import { renderIssueReport } from "./pages/vehicles/issueReport.js";
import { renderIssueList } from "./pages/vehicles/issueList.js";

import { renderToolList } from "./pages/tools/list.js";
import { renderToolDetail } from "./pages/tools/detail.js";
import { renderToolForm } from "./pages/tools/form.js";
import { renderToolCheckout } from "./pages/tools/checkout.js";
import { renderToolReturn } from "./pages/tools/return.js";
import { renderToolHistory } from "./pages/tools/history.js";

import { renderUserList } from "./pages/users/list.js";
import { renderUserForm } from "./pages/users/form.js";

function guard(renderFn, { role = null } = {}) {
  return (params) => {
    const user = getCurrentUser();
    if (!user) {
      navigate("/login");
      return h("div", { class: "page" });
    }
    if (role === "manager" && !isManager(user)) {
      return h("div", { class: "page empty-state" }, [h("div", { class: "msg" }, "この操作には管理者権限が必要です")]);
    }
    if (role === "master" && !isMaster(user)) {
      return h("div", { class: "page empty-state" }, [h("div", { class: "msg" }, "この操作にはマスター管理者権限が必要です")]);
    }
    return renderFn(params);
  };
}

function registerAllRoutes() {
  registerRoute("/", guard(renderHome), { title: "North業務アプリ", live: true });
  registerRoute("/login", () => renderLogin(), { title: "ユーザー選択", live: true });

  registerRoute("/vehicles", guard(renderVehicleList), { title: "車両管理", back: "/", live: true });
  registerRoute("/vehicles/new", guard(renderVehicleForm, { role: "manager" }), { title: "車両登録", back: "/vehicles" });
  registerRoute("/vehicles/issues", guard(renderIssueList, { role: "manager" }), { title: "不具合一覧", back: "/vehicles", live: true });
  registerRoute("/vehicles/:id", guard(renderVehicleDetail), { title: "車両詳細", back: "/vehicles", live: true });
  registerRoute("/vehicles/:id/edit", guard(renderVehicleForm, { role: "manager" }), { title: "車両編集", back: "/vehicles" });
  registerRoute("/vehicles/:id/report", guard(renderDailyReport), { title: "車両日報", back: "/vehicles" });
  registerRoute("/vehicles/:id/inspection", guard(renderInspection), { title: "日常点検", back: "/vehicles" });
  registerRoute("/vehicles/:id/issue", guard(renderIssueReport), { title: "不具合報告", back: "/vehicles" });

  registerRoute("/tools", guard(renderToolList), { title: "道具管理", back: "/", live: true });
  registerRoute("/tools/new", guard(renderToolForm, { role: "manager" }), { title: "道具登録", back: "/tools" });
  registerRoute("/tools/checkout", guard(renderToolCheckout), { title: "持ち出し", back: "/tools" });
  registerRoute("/tools/return", guard(renderToolReturn), { title: "返却", back: "/tools" });
  registerRoute("/tools/history", guard(renderToolHistory), { title: "履歴", back: "/tools", live: true });
  registerRoute("/tools/:id", guard(renderToolDetail), { title: "道具詳細", back: "/tools", live: true });
  registerRoute("/tools/:id/edit", guard(renderToolForm, { role: "manager" }), { title: "道具編集", back: "/tools" });

  registerRoute("/users", guard(renderUserList, { role: "master" }), { title: "ユーザー管理", back: "/", live: true });
  registerRoute("/users/new", guard(renderUserForm, { role: "master" }), { title: "ユーザー追加", back: "/users" });
  registerRoute("/users/:id/edit", guard(renderUserForm, { role: "master" }), { title: "ユーザー編集", back: "/users" });
  registerRoute("/settings", guard(renderSettings, { role: "master" }), { title: "アプリ設定", back: "/users" });

  setNotFound(() => h("div", { class: "page empty-state" }, [h("div", { class: "msg" }, "ページが見つかりません")]));

  onNavigate(({ opts }) => {
    updateHeader({ title: opts.title, back: opts.back });
    updateBottomNav();
  });
}

let storeInitiated = false;
let appStarted = false;

function boot() {
  const appEl = document.getElementById("app");

  if (!storeInitiated) {
    storeInitiated = true;
    // Connect to Firestore in the background — never block the UI on it.
    // "live" routes re-render on their own once data arrives.
    initStore().catch((err) => console.error("initStore failed", err));
  }

  if (!isUnlocked()) {
    appEl.replaceChildren(renderAccessGate({
      onSuccess: () => { setUnlocked(); boot(); },
    }));
    return;
  }

  if (appStarted) return;
  appStarted = true;
  registerAllRoutes();
  mountHeader(document.body);
  mountBottomNav(document.body);
  startRouter();
}

try {
  boot();
} catch (err) {
  const appEl = document.getElementById("app");
  appEl.replaceChildren(h("div", { class: "page empty-state" }, [
    h("div", { class: "icon" }, "⚠️"),
    h("div", { class: "msg" }, "読み込みに失敗しました。再読み込みしてください。"),
  ]));
  console.error(err);
}
