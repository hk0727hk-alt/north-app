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

async function boot() {
  const appEl = document.getElementById("app");

  if (!isUnlocked()) {
    appEl.replaceChildren(renderAccessGate({
      onSuccess: () => { setUnlocked(); boot(); },
    }));
    return;
  }

  appEl.replaceChildren(h("div", { class: "page empty-state" }, [
    h("div", { class: "icon" }, "⏳"),
    h("div", { class: "msg" }, "読み込み中..."),
  ]));

  try {
    await initStore();
  } catch {
    // initStore() already falls back internally; this is a last-resort guard
    // so the app never gets stuck on the loading screen.
  }

  registerAllRoutes();
  mountHeader(document.body);
  mountBottomNav(document.body);
  startRouter();
}

boot().catch((err) => {
  const appEl = document.getElementById("app");
  appEl.replaceChildren(h("div", { class: "page empty-state" }, [
    h("div", { class: "icon" }, "⚠️" ),
    h("div", { class: "msg" }, "読み込みに失敗しました。再読み込みしてください。"),
  ]));
  console.error(err);
});
