import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { fileWatcher } from 'watchAndChange';

interface A144Settings {
	mySetting: string;
}

const DEFAULT_SETTINGS: A144Settings = {
	mySetting: 'default'
}

export default class Admonition144 extends Plugin {
	settings: A144Settings;
	fWatch: fileWatcher;

	async onload() {
		await this.loadSettings();

		this.fWatch = new fileWatcher(this);
		this.fWatch.monitorChanges();
	}

	onunload() {
		this.fWatch.unmonitorChanges();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
