import { h } from "../../utils/dom.js";
import { navigate } from "../../router.js";
import { listVehicles, countOpenIssues } from "../../db/vehicles.js";
import { statusBadge } from "../../components/statusBadge.js";
import { getCurrentUser, isManager } from "../../db/session.js";

export function renderVehicleList() {
  const vehicles = listVehicles();
  const user = getCurrentUser();

  const items = vehicles.length
    ? vehicles.map((v) => {
        const openIssues = countOpenIssues(v.id);
        return h("button", {
          class: "list-item",
          style: "width:100%; text-align:left; border:1px solid var(--color-border); background:var(--color-surface);",
          onclick: () => navigate(`/vehicles/${v.id}`),
        }, [
          v.photo
            ? h("img", { class: "list-item__thumb", src: v.photo })
            : h("div", { class: "list-item__thumb" }, "🚚"),
          h("div", { class: "list-item__body" }, [
            h("div", { class: "list-item__title" }, v.name),
            h("div", { class: "list-item__sub" }, `${v.vehicleNumber || ""} ${v.plateNumber ? "・" + v.plateNumber : ""}`),
            h("div", { style: "margin-top:6px; display:flex; gap:6px;" }, [
              statusBadge(v.status),
              openIssues > 0 ? h("span", { class: "status status-danger" }, `不具合 ${openIssues}`) : null,
            ]),
          ]),
          h("div", { class: "list-item__chevron" }, "›"),
        ]);
      })
    : [h("div", { class: "empty-state" }, [
        h("div", { class: "icon" }, "🚚"),
        h("div", { class: "msg" }, "登録されている車両がありません"),
      ])];

  return h("div", { class: "page" }, [
    h("div", { class: "page-title" }, "車両管理"),
    isManager(user) ? h("button", {
      class: "btn btn-accent",
      style: "margin-bottom:16px;",
      onclick: () => navigate("/vehicles/new"),
    }, "＋ 車両を登録") : null,
    isManager(user) ? h("button", {
      class: "btn btn-outline",
      style: "margin-bottom:16px;",
      onclick: () => navigate("/vehicles/issues"),
    }, "⚠ 不具合一覧（管理者）") : null,
    ...items,
  ]);
}
