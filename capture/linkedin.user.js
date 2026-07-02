// ==UserScript==
// @name         Professional-Protocal 采集器 (LinkedIn)
// @namespace    professional-protocal
// @version      0.1.0
// @description  在 LinkedIn 页面右上角放一个悬浮按钮，一键把当前页原文投递到 Professional-Protocal 后端，供 AI 解析与人工审阅入库。见 Memory/DataGovernance.md。
// @author       Professional-Protocal
// @match        https://www.linkedin.com/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @connect      *
// ==/UserScript==

/*
 * 用法：
 * 1. 在油猴（Tampermonkey）里新建脚本，粘贴本文件内容并保存。
 * 2. 点击油猴菜单里的「配置后端地址」「配置采集令牌」分别填入：
 *      - 后端地址：如 http://localhost:3000 或 http://192.168.1.10:3000（不含 /intake）
 *      - 采集令牌：在系统「个人主页 → 采集令牌」里生成/查看。
 * 3. 打开一个你感兴趣的 LinkedIn 个人页，点击右上角「采集到 PP」按钮即可。
 *
 * 原则（见 Memory/DataGovernance.md）：由你的眼睛做筛选，脚本只负责把「你本来会手动看的这一页」原文搬回后端。
 * 它不遍历、不翻页、不批量抓取。
 */

(function () {
  "use strict";

  const KEY_BASE_URL = "pp_base_url";
  const KEY_TOKEN = "pp_intake_token";

  function getBaseUrl() {
    return (GM_getValue(KEY_BASE_URL, "") || "").replace(/\/+$/, "");
  }
  function getToken() {
    return GM_getValue(KEY_TOKEN, "") || "";
  }

  GM_registerMenuCommand("配置后端地址", () => {
    const cur = getBaseUrl();
    const next = window.prompt(
      "Professional-Protocal 后端地址（不含 /intake）\n如 http://localhost:3000",
      cur,
    );
    if (next !== null) {
      GM_setValue(KEY_BASE_URL, next.trim());
      toast("已保存后端地址");
    }
  });

  GM_registerMenuCommand("配置采集令牌", () => {
    const cur = getToken();
    const next = window.prompt(
      "采集令牌（在 个人主页 → 采集令牌 生成/查看）",
      cur,
    );
    if (next !== null) {
      GM_setValue(KEY_TOKEN, next.trim());
      toast("已保存采集令牌");
    }
  });

  function toast(text, isError) {
    try {
      GM_notification({
        title: "Professional-Protocal",
        text: String(text),
        timeout: 3500,
      });
    } catch (_) {
      // 某些环境不支持 GM_notification，退化到 console。
    }
    // 同时在按钮上给个即时反馈。
    const btn = document.getElementById("pp-capture-btn");
    if (btn) {
      btn.dataset.state = isError ? "error" : "ok";
      const label = btn.querySelector(".pp-label");
      if (label) label.textContent = isError ? "投递失败" : "已采集 ✓";
      setTimeout(() => {
        btn.dataset.state = "idle";
        if (label) label.textContent = "采集到 PP";
      }, 2500);
    }
  }

  // 抓取当前页可见原文：优先 main 区域，退化到整页。
  function grabRawContent() {
    const main = document.querySelector("main");
    const text = (main && main.innerText) || document.body.innerText || "";
    // 折叠过多空行，控制体积。
    return text.replace(/\n{3,}/g, "\n\n").trim().slice(0, 190000);
  }

  function capture() {
    const baseUrl = getBaseUrl();
    const token = getToken();
    if (!baseUrl) {
      toast("请先在油猴菜单「配置后端地址」", true);
      return;
    }
    if (!token) {
      toast("请先在油猴菜单「配置采集令牌」", true);
      return;
    }
    const rawContent = grabRawContent();
    if (!rawContent) {
      toast("没抓到可用文本", true);
      return;
    }

    const btn = document.getElementById("pp-capture-btn");
    const label = btn && btn.querySelector(".pp-label");
    if (label) label.textContent = "投递中…";

    GM_xmlhttpRequest({
      method: "POST",
      url: baseUrl + "/intake",
      headers: {
        "Content-Type": "application/json",
        "x-intake-token": token,
      },
      data: JSON.stringify({
        source: "linkedin",
        sourceUrl: location.href,
        rawContent: rawContent,
        rawFormat: "text",
      }),
      onload: (res) => {
        if (res.status >= 200 && res.status < 300) {
          toast("已投递，去「导入收件箱」解析入库");
        } else {
          let msg = "HTTP " + res.status;
          try {
            const body = JSON.parse(res.responseText);
            if (body && body.message) msg = body.message;
          } catch (_) {}
          toast("投递失败：" + msg, true);
        }
      },
      onerror: () => toast("投递失败：无法连接后端", true),
      ontimeout: () => toast("投递失败：超时", true),
      timeout: 15000,
    });
  }

  function mountButton() {
    if (document.getElementById("pp-capture-btn")) return;

    const style = document.createElement("style");
    style.textContent = `
      #pp-capture-btn {
        position: fixed; top: 84px; right: 20px; z-index: 2147483647;
        display: flex; align-items: center; gap: 8px;
        padding: 10px 14px; border: none; border-radius: 999px;
        background: #1677ff; color: #fff; cursor: pointer;
        font: 600 13px/1 -apple-system, system-ui, sans-serif;
        box-shadow: 0 4px 14px rgba(0,0,0,.25);
        transition: transform .1s ease, background .2s ease;
      }
      #pp-capture-btn:hover { transform: translateY(-1px); }
      #pp-capture-btn:active { transform: translateY(0); }
      #pp-capture-btn[data-state="ok"] { background: #52c41a; }
      #pp-capture-btn[data-state="error"] { background: #ff4d4f; }
      #pp-capture-btn .pp-dot {
        width: 8px; height: 8px; border-radius: 50%; background: #fff;
      }
    `;
    document.head.appendChild(style);

    const btn = document.createElement("button");
    btn.id = "pp-capture-btn";
    btn.dataset.state = "idle";
    btn.title = "把当前页原文采集到 Professional-Protocal";
    btn.innerHTML = '<span class="pp-dot"></span><span class="pp-label">采集到 PP</span>';
    btn.addEventListener("click", capture);
    document.body.appendChild(btn);
  }

  mountButton();
  // LinkedIn 是 SPA，路由切换时按钮可能被移除，定期补挂。
  setInterval(mountButton, 2000);
})();
