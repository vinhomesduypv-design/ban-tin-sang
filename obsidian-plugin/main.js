"use strict";
const { Plugin, Notice, requestUrl, normalizePath, TFile } = require("obsidian");

const BASE = "https://raw.githubusercontent.com/vinhomesduypv-design/ban-tin-sang/main/";
const FOLDER = "raw/Bản tin sáng";
const HUB = FOLDER + "/Bản tin sáng.md";
const MARK = "<!-- ban-tin-moi -->";
const LOG = "log.md";
const LOG_HEAD = "# Nhật ký\n";

module.exports = class BanTinSang extends Plugin {
  async onload() {
    this.running = false;
    this.app.workspace.onLayoutReady(() => this.sync(false));
    this.registerInterval(window.setInterval(() => this.sync(false), 30 * 60 * 1000));
    this.addCommand({ id: "tai-ban-tin", name: "Tải bản tin sáng mới", callback: () => this.sync(true) });
  }

  async fetchText(path) {
    const url = BASE + path.split("/").map(encodeURIComponent).join("/") + "?t=" + Date.now();
    const r = await requestUrl({ url, throw: false });
    if (r.status !== 200) throw new Error("HTTP " + r.status + " " + path);
    return r.text;
  }

  async sync(manual) {
    if (this.running) return;
    this.running = true;
    try {
      const index = JSON.parse(await this.fetchText("index.json"));
      const items = (index.items || []).slice(0, 7).reverse();
      let added = 0;
      for (const it of items) {
        const path = normalizePath(FOLDER + "/" + it.file);
        if (await this.app.vault.adapter.exists(path)) continue;
        const text = await this.fetchText("notes/" + it.file);
        if (!(await this.app.vault.adapter.exists(FOLDER))) await this.app.vault.createFolder(FOLDER);
        await this.app.vault.create(path, text);
        await this.addToHub(it);
        await this.addToLog(it);
        added++;
      }
      if (added) new Notice("📰 Đã tải " + added + " bản tin sáng mới");
      else if (manual) new Notice("Bản tin sáng đã mới nhất");
    } catch (e) {
      console.error("ban-tin-sang", e);
      if (manual) new Notice("Chưa tải được bản tin: " + e.message);
    } finally {
      this.running = false;
    }
  }

  async editFile(path, fn) {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (f instanceof TFile) await this.app.vault.process(f, fn);
  }

  async addToHub(it) {
    const name = it.file.replace(/\.md$/, "");
    const line = "- [[" + name + "|📰 " + it.label + "]]\n";
    await this.editFile(HUB, (s) => {
      if (s.includes("[[" + name + "|") || !s.includes(MARK + "\n")) return s;
      return s.replace(MARK + "\n", MARK + "\n" + line).replace(/^updated: .*$/m, "updated: " + it.date);
    });
  }

  async addToLog(it) {
    const name = it.file.replace(/\.md$/, "");
    const head = "## " + it.date + " Bản tin sáng [Claude]";
    await this.editFile(LOG, (s) => {
      if (s.includes(head) || !s.startsWith(LOG_HEAD)) return s;
      const entry = "\n" + head + "\n\n- [[" + name + "]]: " + (it.summary || "") + "\n";
      return LOG_HEAD + entry + s.slice(LOG_HEAD.length);
    });
  }
};
