import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { fileWatcher } from 'watchAndChange';

export default class Admonition144 extends Plugin {
	fWatch: fileWatcher;

	async onload() {
		this.fWatch = new fileWatcher(this);
		this.fWatch.monitorChanges();
	}

	onunload() {
		this.fWatch.unmonitorChanges();
	}
}
