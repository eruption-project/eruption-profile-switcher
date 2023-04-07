/*
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * Copyright (c) 2019-2023, The Eruption Development Team
 *
 */

"use strict";

const Gettext = imports.gettext;

const {
	Gio,
	GLib,
	GObject,
	Gtk,
	Shell,
	Clutter,
	St
} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Util = imports.misc.util;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;
const Signals = imports.signals;
const ByteArray = imports.byteArray;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const DbusInterface = Me.imports.dbus_interface;
const Devices = Me.imports.devices;

// i18n/l10n
const Domain = Gettext.domain(Me.metadata.uuid);

const _ = Domain.gettext;
const ngettext = Domain.ngettext;

// Global constants
const NOTIFICATION_TIMEOUT_MILLIS = 1200;
const NOTIFICATION_ANIMATION_MILLIS = 500;
const PROCESS_POLL_TIMEOUT_MILLIS = 3000;
const PROCESS_SPAWN_WAIT_MILLIS = 800;

const DEFAULT_SLOT_NAMES = ["Profile Slot 1", "Profile Slot 2",
	"Profile Slot 3", "Profile Slot 4"];

// D-Bus proxy
var eruptionSlot, eruptionProfile, eruptionConfig,
	eruptionStatus, eruptionDevice,
	eruptionFxProxyEffects;

// Panel menu button
var connected = false;
var previous_state = null;
var instance = null,
	eruptionMenuButton, deviceStatusIndicatorBox;

// Global state
var activeSlot,
	slotNames = DEFAULT_SLOT_NAMES,
	activeProfile = [],
	savedProfile,
	enableSfx, enableAmbientFx, brightness = 100,
	deviceStatus = [],
	status_poll_source,
	status_poll_source_toplevel,
	fade_out_source, process_poll_source,
	brightness_slider_source;

var statusIndicatorIcons = [];

var settings;

// Global support variables for showNotification()
var notificationText = null;
var pending_timeout = null;

// Notification types
const GENERAL_NOTIFICATION = 0;
const ERROR_NOTIFICATION = 1;
const PROFILE_SWITCH_NOTIFICATION = 2;
const HOTPLUG_NOTIFICATION = 3;
const SETTINGS_NOTIFICATION = 4;

// Show centered notification on the current monitor
function showNotification(type, msg) {
	if (areNotificationsEnabled(type)) {
		if (pending_timeout !== null) {
			Mainloop.source_remove(pending_timeout)
			pending_timeout = null;

			Main.uiGroup.remove_actor(notificationText);
			notificationText = null;
		}

		let monitor = Main.layoutManager.currentMonitor;

		if (monitor) {
			let text = new St.Label({
				style_class: "notification-label",
				text: msg
			});

			notificationText = text;

			text.opacity = 255;

			Main.uiGroup.add_actor(text);
			text.set_position(
				Math.floor(monitor.width / 2 - text.width / 2),
				Math.floor(monitor.height / 2 - text.height / 2)
			);

			pending_timeout = Mainloop.timeout_add(NOTIFICATION_TIMEOUT_MILLIS, () => {
				if (notificationText) {
					notificationText.ease_property("opacity", 0, {
						duration: NOTIFICATION_ANIMATION_MILLIS,
						mode: Clutter.AnimationMode.EASE_OUT_QUAD,
						onComplete: () => {
							Main.uiGroup.remove_actor(notificationText);

							Mainloop.source_remove(pending_timeout);
							pending_timeout = null;
						}
					});
				}
			});
		}
	}
}

// Programmatically dismiss the notification overlay
function fadeOutNotification() {
	if (areNotificationsEnabled()) {
		fade_out_source = Mainloop.timeout_add(NOTIFICATION_TIMEOUT_MILLIS, () => {
			Mainloop.source_remove(fade_out_source);
			fade_out_source = null;

			if (notificationText) {
				notificationText.ease_property("opacity", 0, {
					duration: NOTIFICATION_ANIMATION_MILLIS,
					mode: Clutter.AnimationMode.EASE_OUT_QUAD,
					onComplete: () => {
						Main.uiGroup.remove_actor(notificationText);
						notificationText = null;
					}
				});
			}
		});
	}
}

// Returns whether notifications should be displayed
function areNotificationsEnabled(type) {
	let result = false;

	try {
		switch (type) {
			case GENERAL_NOTIFICATION:
				result = settings.get_boolean("notifications-general");
				break;

			case PROFILE_SWITCH_NOTIFICATION:
				result = settings.get_boolean("notifications-on-profile-switch");
				break;

			case HOTPLUG_NOTIFICATION:
				result = settings.get_boolean("notifications-on-hotplug");
				break;

			case SETTINGS_NOTIFICATION:
				result = settings.get_boolean("notifications-on-settings-change");
				break;

			default:
				// fallback
				result = settings.get_boolean("notifications-general");
				break;
		}
	} catch (e) {
		log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
		// showNotification(ERROR_NOTIFICATION, e.message);
	}

	return result;
}

function getBatteryLevelIcon(battery_level) {
	let icon_name = "battery-missing-symbolic";

	if (battery_level !== undefined) {
		if (battery_level >= 100) {
			icon_name = "battery-level-100-symbolic";
		} else if (battery_level >= 90) {
			icon_name = "battery-level-90-symbolic";
		} else if (battery_level >= 80) {
			icon_name = "battery-level-80-symbolic";
		} else if (battery_level >= 70) {
			icon_name = "battery-level-70-symbolic";
		} else if (battery_level >= 60) {
			icon_name = "battery-level-60-symbolic";
		} else if (battery_level >= 50) {
			icon_name = "battery-level-50-symbolic";
		} else if (battery_level >= 40) {
			icon_name = "battery-level-40-symbolic";
		} else if (battery_level >= 30) {
			icon_name = "battery-level-30-symbolic";
		} else if (battery_level >= 20) {
			icon_name = "battery-level-20-symbolic";
		} else if (battery_level >= 10) {
			icon_name = "battery-level-10-symbolic";
		} else {
			icon_name = "battery-empty-symbolic";
		}
	}

	return icon_name;
}

function getSignalStrengthIcon(signal_strength) {
	let icon_name = "network-cellular-signal-none-symbolic";

	if (signal_strength >= 100) {
		icon_name = "network-cellular-signal-excellent-symbolic";
	} else if (signal_strength >= 90) {
		icon_name = "network-cellular-signal-excellent-symbolic";
	} else if (signal_strength >= 80) {
		icon_name = "network-cellular-signal-good-symbolic";
	} else if (signal_strength >= 70) {
		icon_name = "network-cellular-signal-good-symbolic";
	} else if (signal_strength >= 60) {
		icon_name = "network-cellular-signal-good-symbolic";
	} else if (signal_strength >= 50) {
		icon_name = "network-cellular-signal-ok-symbolic";
	} else if (signal_strength >= 40) {
		icon_name = "network-cellular-signal-ok-symbolic";
	} else if (signal_strength >= 30) {
		icon_name = "network-cellular-signal-weak-symbolic";
	} else if (signal_strength >= 20) {
		icon_name = "network-cellular-signal-weak-symbolic";
	} else if (signal_strength >= 10) {
		icon_name = "network-cellular-signal-weak-symbolic";
	} else {
		icon_name = "network-cellular-signal-none-symbolic";
	}

	return icon_name;
}

// Returns `true` if the Pyroclasm UI is executable
function isPyroclasmUiAvailable() {
	try {
		let cmdline = "/usr/bin/pyroclasm";

		let file = Gio.File.new_for_path(cmdline);
		let file_info = file.query_info("standard::*", Gio.FileQueryInfoFlags.NONE, null);

		let file_type = file_info.get_file_type();

		if (file_type == Gio.FileType.REGULAR ||
			file_type == Gio.FileType.SYMBOLIC_LINK) {
			return true;
		} else {
			return false;
		}
	} catch (e) {
		log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
		return false;
	}
}

// Returns `true` if the Eruption GTK3+ GUI is executable
function isEruptionGuiAvailable() {
	try {
		let cmdline = "/usr/bin/eruption-gui-gtk3";

		let file = Gio.File.new_for_path(cmdline);
		let file_info = file.query_info("standard::*", Gio.FileQueryInfoFlags.NONE, null);

		let file_type = file_info.get_file_type();

		if (file_type == Gio.FileType.REGULAR ||
			file_type == Gio.FileType.SYMBOLIC_LINK) {
			return true;
		} else {
			return false;
		}
	} catch (e) {
		log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
		return false;
	}
}

// Execute the Pyroclasm UI
function runPyroclasmUi() {
	try {
		let cmdline = "/usr/bin/pyroclasm";

		Util.spawn([`${cmdline}`]);
	} catch (e) {
		log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
		showNotification(ERROR_NOTIFICATION, e.message);
	}
}

// Execute Eruption GTK3+ GUI
function runEruptionGui() {
	try {
		let cmdline = "/usr/bin/eruption-gui-gtk3";

		Util.spawn([`${cmdline}`]);
	} catch (e) {
		log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
		showNotification(ERROR_NOTIFICATION, e.message);
	}
}

// Find the name of a supported device from the SUPPORTED_DEVICES table, using USB IDs
function getDeviceNameFromUSBIDs(usb_vid, usb_pid) {
	let device = Devices.SUPPORTED_DEVICES.find((e) => e.usb_vid == usb_vid && e.usb_pid == usb_pid);
	if (device != undefined) {
		return `${device.make} ${device.model}`;
	} else {
		return "<Unknown Device>";
	}
}

// Find if the given device supports status reporting
function deviceSupportsStatusReporting(usb_vid, usb_pid) {
	let device = Devices.SUPPORTED_DEVICES.find((e) => e.usb_vid == usb_vid && e.usb_pid == usb_pid);
	if (device != undefined) {
		return device.has_status;
	} else {
		return false;
	}
}

// Get the profile name from a given .profile filename
function _profileFileToName(filename) {
	let result = eruptionProfile.EnumProfilesSync();

	let name = result[0].find(profile => {
		if (profile[1].localeCompare(filename) === 0) {
			return true;
		} else {
			return false;
		}
	});

	if (name)
		return name[0];
	else
		return ["<unknown>"];
}

// Represents an eruption .profile file
class Profile {
	constructor(profile_name, filename, data) {
		this._name = profile_name;
		this._filename = filename;
		this._data = data;
	}

	getName() {
		return this._name;
	}

	getFileName() {
		return this._filename;
	}

	getData() {
		return this._data;
	}
}

var CustomPopupMenuItem = GObject.registerClass(
	class CustomPopupMenuItem extends PopupMenu.PopupBaseMenuItem {
		_init(text, cb, params) {
			super._init(params);

			this.label = new St.Label({
				text: text,
			});
			this.add_actor(this.label);

			this._callback = cb;

			this.connect("activate", this._activate.bind(this));
		}

		_activate(_menuItem, _cb, _event) {
			return this._callback(this);
		}
	}
);

var SlotMenuItem = GObject.registerClass(
	class SlotMenuItem extends PopupMenu.PopupBaseMenuItem {
		_init(slot, params) {
			super._init(params);

			this.index = new St.Label({
				text: `${slot + 1}:`,
				style_class: "slot-index"
			});

			let slot_name = DEFAULT_SLOT_NAMES[slot];
			if (slotNames[slot]) {
				slot_name = slotNames[slot];
			}

			this.label = new St.Label({
				text: slot_name,
				style_class: "slot-label"
			});

			this._slot = slot;
			this.setToggleState(false);

			this.add_actor(this.index);
			this.add_actor(this.label);

			this.connect("activate", this._activate.bind(this));
		}

		_activate(_menuItem, _event) {
			if (this._slot !== activeSlot) {
				eruptionMenuButton.uncheckAllSlotCheckmarks();

				try {
					eruptionSlot.SwitchSlotSync(this._slot);
				} catch (e) {
					log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
					showNotification(ERROR_NOTIFICATION, _("Could not switch slots! Is Eruption running?"));
				}
			}
		}

		setToggleState(checked) {
			this.setOrnament(checked ? PopupMenu.Ornament.DOT : PopupMenu.Ornament.NONE);
		}
	}
);

// Menu item with associated profile object
var ProfileMenuItem = GObject.registerClass(
	class ProfileMenuItem extends PopupMenu.PopupBaseMenuItem {
		_init(profile, params) {
			super._init(params);

			this.label = new St.Label({
				text: profile.getName()
			});

			this._profile = profile;
			this.setToggleState(false);

			this.add_actor(this.label);

			this.connect("activate", this._activate.bind(this));
		}

		_activate(_menuItem, _event) {
			eruptionMenuButton.uncheckAllProfileCheckmarks();

			try {
				eruptionProfile.SwitchProfileSync(this._profile.getFileName());
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
				showNotification(ERROR_NOTIFICATION, _("Could not switch profiles! Is Eruption running?"));
			}
		}

		setToggleState(checked) {
			this.setOrnament(checked ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
		}
	}
);

var EruptionMenuButton = GObject.registerClass(
	class ProfilesMenuButton extends PanelMenu.Button {
		_init() {
			super._init(0.0, _("Eruption Menu"));

			try {
				// setup proxies and connect to DBus interfaces
				this._setupDBusProxyForEruptionSlot();
				this._setupDBusProxyForEruptionProfile();
				this._setupDBusProxyForEruptionConfig();
				this._setupDBusProxyForEruptionStatus();
				this._setupDBusProxyForEruptionDevice();

				this._setupDBusProxyForFxProxyEffects();

			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
				showNotification(ERROR_NOTIFICATION, e.message);
			}

			let hbox = new St.BoxLayout({
				style_class: "panel-status-menu-box"
			});

			this.icon = new St.Icon({
				icon_name: connected ? "keyboard-brightness" : "gtk-no",
				style_class: "status-icon-notify system-status-icon"
			});

			let indicator_hbox = new St.BoxLayout({
				style_class: "panel-indicator-box"
			});

			deviceStatusIndicatorBox = indicator_hbox;

			hbox.add_actor(this.icon);
			hbox.add_actor(PopupMenu.arrowIcon(St.Side.BOTTOM));
			hbox.add_actor(indicator_hbox);
			this.add_actor(hbox);

			this._statusMenuItems = [];
			this.populateMenu();
		}

		_setupDBusProxyForEruptionSlot() {
			try {
				const EruptionSlotProxy = Gio.DBusProxy.makeProxyWrapper(
					DbusInterface.eruptionSlotIface
				);

				eruptionSlot = new EruptionSlotProxy(
					Gio.DBus.system,
					"org.eruption",
					"/org/eruption/slot",
					(proxy, error) => {
						if (error) {
							log("[eruption] error: " + error.message);
							return;
						}

						proxy.connect("g-properties-changed", this._sync_slot.bind(this));
						this._sync_slot(proxy, null, null, true);
					}
				);

				this._active_slot_changed_id = eruptionSlot.connectSignal(
					"ActiveSlotChanged",
					this._activeSlotChanged.bind(this)
				);
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
				showNotification(ERROR_NOTIFICATION, e.message);
			}
		}

		_setupDBusProxyForEruptionProfile() {
			try {
				const EruptionProfileProxy = Gio.DBusProxy.makeProxyWrapper(
					DbusInterface.eruptionProfileIface
				);

				eruptionProfile = new EruptionProfileProxy(
					Gio.DBus.system,
					"org.eruption",
					"/org/eruption/profile",
					(proxy, error) => {
						if (error) {
							log("[eruption] error: " + error.message);
							return;
						}

						proxy.connect("g-properties-changed", this._sync_profile.bind(this));
						this._sync_profile(proxy, null, null, true);
					}
				);

				this._active_profile_changed_id = eruptionProfile.connectSignal(
					"ActiveProfileChanged",
					this._activeProfileChanged.bind(this)
				);

				this._profiles_changed_id = eruptionProfile.connectSignal(
					"ProfilesChanged",
					this._profilesChanged.bind(this)
				);
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
				showNotification(ERROR_NOTIFICATION, e.message);
			}
		}

		_setupDBusProxyForEruptionConfig() {
			try {
				const EruptionConfigProxy = Gio.DBusProxy.makeProxyWrapper(
					DbusInterface.eruptionConfigIface
				);

				eruptionConfig = new EruptionConfigProxy(
					Gio.DBus.system,
					"org.eruption",
					"/org/eruption/config",
					(proxy, error) => {
						if (error) {
							log("[eruption] error: " + error.message);
							return;
						}

						proxy.connect("g-properties-changed", this._sync_config.bind(this));
						this._sync_config(proxy, null, null, true);
					}
				);

				// this._brightness_changed_id = eruptionConfig.connectSignal(
				// 	"BrightnessChanged",
				// 	this._brightnessChanged.bind(this)
				// );
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
				showNotification(ERROR_NOTIFICATION, e.message);
			}
		}

		_setupDBusProxyForEruptionStatus() {
			try {
				const EruptionStatusProxy = Gio.DBusProxy.makeProxyWrapper(
					DbusInterface.eruptionStatusIface
				);

				eruptionStatus = new EruptionStatusProxy(
					Gio.DBus.system,
					"org.eruption",
					"/org/eruption/status",
					(proxy, error) => {
						if (error) {
							log("[eruption] error: " + error.message);
							return;
						}

						proxy.connect("g-properties-changed", this._sync_status.bind(this));
						this._sync_status(proxy, null, null, true);
					}
				);

				this._status_changed_id = eruptionStatus.connectSignal(
					"StatusChanged",
					this._statusChanged.bind(this)
				);
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
				showNotification(ERROR_NOTIFICATION, e.message);
			}
		}

		_setupDBusProxyForEruptionDevice() {
			try {
				const EruptionDeviceProxy = Gio.DBusProxy.makeProxyWrapper(
					DbusInterface.eruptionDeviceIface
				);

				eruptionDevice = new EruptionDeviceProxy(
					Gio.DBus.system,
					"org.eruption",
					"/org/eruption/devices",
					(proxy, error) => {
						if (error) {
							log("[eruption] error: " + error.message);
							return;
						}

						proxy.connect("g-properties-changed", this._sync_device.bind(this));
						this._sync_device(proxy, null, null, true);
					}
				);

				this._device_status_changed_id = eruptionDevice.connectSignal(
					"DeviceStatusChanged",
					this._deviceStatusChanged.bind(this)
				);

				this._device_hotplug_id = eruptionDevice.connectSignal(
					"DeviceHotplug",
					this._deviceHotplug.bind(this)
				);
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
				showNotification(ERROR_NOTIFICATION, e.message);
			}
		}

		_setupDBusProxyForFxProxyEffects() {
			try {
				const EruptionFxProxy = Gio.DBusProxy.makeProxyWrapper(
					DbusInterface.eruptionFxProxyEffectsIface
				);

				eruptionFxProxyEffects = new EruptionFxProxy(
					Gio.DBus.session,
					"org.eruption.fx_proxy",
					"/org/eruption/fx_proxy/effects",
					(proxy, error) => {
						if (error) {
							log("[eruption] error: " + error.message);
							return;
						}

						proxy.connect("g-properties-changed", this._sync_fx_proxy.bind(this));
						this._sync_fx_proxy(proxy, null, null, true);
					}
				);
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
				showNotification(ERROR_NOTIFICATION, e.message);
			}
		}

		_onDestroy() {
			super._onDestroy();
		}

		updateIcon() {
			this.icon.icon_name = connected ? "keyboard-brightness" : "gtk-no";
		}

		populateMenu(config) {
			try {
				if (!connected) {
					this.menu.removeAll();

					// add "slots" header
					let header = new PopupMenu.PopupMenuItem(_("Not connected to Eruption"), {
						activate: false,
						reactive: false,
						can_focus: false,
						style_class: "popup-menu-item-header"
					});

					this.menu.addMenuItem(header);
				} else {

					// initialize to sane defaults
					if (!config) {
						config = {
							active_slot: activeSlot,
							active_item: undefined,
							status_only: false
						}
					}

					if (config.status_only === null || config.status_only === undefined) {
						config.status_only = false;
					}

					if (!config.status_only) {
						this.menu.removeAll();

						if (!settings.get_boolean("compact-mode")) {
							// add "slots" header
							let slot_header = new PopupMenu.PopupMenuItem(_("Slots"), {
								activate: false,
								reactive: false,
								can_focus: false,
								style_class: "popup-menu-item-header"
							});

							this.menu.addMenuItem(slot_header);
						}

						// create user slots items
						for (let i = 0; i < 4; i++) {
							let slot = new SlotMenuItem(i)
							if (i == activeSlot) {
								slot.setToggleState(true);
							}

							this.menu.addMenuItem(slot);
						}

						// add separator
						let separator = new PopupMenu.PopupSeparatorMenuItem();
						this.menu.addMenuItem(separator);

						if (!settings.get_boolean("compact-mode")) {
							// add "profile" header
							let profile_header = new PopupMenu.PopupMenuItem(_("Active Profile"), {
								activate: false,
								reactive: false,
								can_focus: false,
								style_class: "popup-menu-item-header"
							});

							this.menu.addMenuItem(profile_header);
						}

						// add "current profile" header
						let profile_name = _("<unknown>");
						try {
							profile_name = _profileFileToName(activeProfile[activeSlot]);
						} catch (e) {
							log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
						}

						if (profile_name) {
							let current_profile_header = new PopupMenu.PopupMenuItem(`${profile_name}`, {
								activate: false,
								reactive: false,
								can_focus: false,
								style_class: "popup-menu-item-current-profile"
							});

							this.menu.addMenuItem(current_profile_header);
						}

						// add sub-menu
						this.profiles_sub = new PopupMenu.PopupSubMenuMenuItem(_("Select profile for current slot"), {
							activate: true,
							reactive: true,
							can_focus: true,
							style_class: "popup-menu-item-profiles"
						});

						this.menu.addMenuItem(this.profiles_sub);

						// if (!settings.get_boolean("compact-mode")) {
						// 	// add "profiles" header
						// 	let profiles_header = new PopupMenu.PopupMenuItem(_("Available Profiles"), {
						// 		activate: false,
						// 		reactive: false,
						// 		can_focus: false,
						// 		style_class: "popup-menu-item-header"
						// 	});
						//
						// 	this.profiles_sub.menu.addMenuItem(profiles_header);
						// }

						try {
							let active_profile =
								config.active_item === undefined ? eruptionProfile.ActiveProfile : config.active_item;

							// add profiles radio menu items
							let result = eruptionProfile.EnumProfilesSync();
							result[0].forEach(profile => {
								let item = new ProfileMenuItem(new Profile(profile[0], profile[1]), {
									activate: true,
									reactive: true,
									can_focus: true,
									style_class: "popup-menu-item-profile"
								});

								if (active_profile && active_profile.localeCompare(profile[1]) === 0) {
									item.setToggleState(true);
								}

								this.profiles_sub.menu.addMenuItem(item);
							});
						} catch (e) {
							log("[eruption] could not enumerate profiles: " + e.lineNumber + ": " + e.message);
						}

						// add separator
						separator = new PopupMenu.PopupSeparatorMenuItem();
						this.menu.addMenuItem(separator);

						// add Pyroclasm UI menu item
						if (isPyroclasmUiAvailable()) {
							this.pyroclasmItem = new CustomPopupMenuItem(_("Run Pyroclasm UI…"), (_item) => {
								runPyroclasmUi();
							}, {
								activate: true,
								reactive: true,
								can_focus: true,
								// style_class: "popup-menu-item-action"
							});

							this.menu.addMenuItem(this.pyroclasmItem);
						}

						// add Eruption GUI menu item
						if (isEruptionGuiAvailable()) {
							this.guiItem = new CustomPopupMenuItem(_("Run Eruption GUI…"), (_item) => {
								runEruptionGui();
							}, {
								activate: true,
								reactive: true,
								can_focus: true,
								// style_class: "popup-menu-item-action"
							});

							this.menu.addMenuItem(this.guiItem);
						}

						// add preferences menu item
						const prefs_item = new CustomPopupMenuItem(_("Extension preferences…"), (_item) => {
							ExtensionUtils.openPrefs();
						}, {
							activate: true,
							reactive: true,
							can_focus: true,
							// style_class: "popup-menu-item-action"
						});

						this.menu.addMenuItem(prefs_item);

						// add separator
						separator = new PopupMenu.PopupSeparatorMenuItem();
						this.menu.addMenuItem(separator);

						// add controls for the global configuration options of eruption
						let enableAmbientFxItem = new PopupMenu.PopupSwitchMenuItem(_("Ambient Effect"), false);
						this._enableAmbientFxItem = enableAmbientFxItem;
						enableAmbientFxItem.connect("activate", () => {
							enableAmbientFx = !enableAmbientFx;
							eruptionFxProxyEffects.AmbientEffect = enableAmbientFx;
						});

						this.menu.addMenuItem(enableAmbientFxItem);

						let enableSfxItem = new PopupMenu.PopupSwitchMenuItem(_("Audio Effects"), false);
						this._enableSfxItem = enableSfxItem;
						enableSfxItem.connect("activate", () => {
							enableSfx = !enableSfx;
							eruptionConfig.EnableSfx = enableSfx;
						});

						this.menu.addMenuItem(enableSfxItem);

						// add brightness slider
						let item = new PopupMenu.PopupBaseMenuItem();
						let icon = new St.Icon({
							icon_name: "keyboard-brightness",
							style_class: "menu-icon"
						});

						let brightnessSlider = new Slider.Slider(0);
						this._brightnessSlider = brightnessSlider;
						brightnessSlider.value = brightness / 100;
						brightnessSlider.connect(
							"notify::value",
							this._brightnessSliderChanged.bind(this)
						);

						item.add(icon);
						item.add_actor(brightnessSlider);

						item.connect("button-press-event", (_, event) => {
							return brightnessSlider.startDragging(event);
						});

						item.connect("key-press-event", (_, event) => {
							return brightnessSlider.emit("key-press-event", event);
						});

						this.menu.addMenuItem(item);

						this.populateStatusMenuItems();

					} else {
						// only update the device status area of the menu
						this.populateStatusMenuItems();
					}
				}
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
			}
		}

		populateStatusMenuItems() {
			this._statusMenuItems.forEach((item) => item.destroy());
			this._statusMenuItems = [];

			let separator_added = false;

			if (deviceStatus) {
				deviceStatus.map(device => {
					let indicators = 0;

					const item = new PopupMenu.PopupBaseMenuItem({
						activate: false,
						reactive: false,
						can_focus: false,
						style_class: "popup-menu-item-status"
					});

					const label = new St.Label({
						style_class: "popup-menu-item-label",
						text: `${getDeviceNameFromUSBIDs(device.usb_vid, device.usb_pid)}`,
					});

					// signal strength indicator
					if (settings.get_boolean("show-signal-strength")) {
						const signal_strength = device.status["signal-strength-percent"];

						if (signal_strength !== undefined) {
							let icon_name = getSignalStrengthIcon(signal_strength);

							const icon = new St.Icon({
								icon_name: icon_name,
								style_class: "menu-icon"
							});

							let value = `${signal_strength}`;
							let filler = Math.max(0, Math.abs(2 - value.length));
							let text = " ".repeat(filler) + value + "%";

							let level_label = new St.Label({
								text: text,
								style_class: "menu-item-status-label",
							});

							item.add_actor(icon);
							item.add_actor(level_label);

							indicators += 1;
						}
					}

					// battery level indicator
					if (settings.get_boolean("show-battery-level")) {
						const battery_level = device.status["battery-level-percent"];

						if (battery_level !== undefined) {
							const icon_name = getBatteryLevelIcon(device.status["battery-level-percent"]);

							const icon = new St.Icon({
								icon_name: icon_name,
								style_class: "menu-icon"
							});

							let value = `${battery_level}`;
							let filler = Math.max(0, Math.abs(2 - value.length));
							let text = " ".repeat(filler) + value + "%";

							let level_label = new St.Label({
								text: text,
								style_class: "menu-item-label",
							});

							item.add_actor(icon);
							item.add_actor(level_label);

							indicators += 1;
						}

					}

					if (indicators > 0) {
						// add separator
						if (!separator_added) {
							separator_added = true;

							const separator = new PopupMenu.PopupSeparatorMenuItem();
							this.menu.addMenuItem(separator);
							this._statusMenuItems.push(separator);

							if (!settings.get_boolean("compact-mode")) {
								// add "devices" header
								let devices_header = new PopupMenu.PopupMenuItem(_("Connected Devices"), {
									activate: false,
									reactive: false,
									can_focus: false,
									style_class: "popup-menu-item-header"
								});

								this.menu.addMenuItem(devices_header);
								this._statusMenuItems.push(devices_header);
							}
						}

						item.add_actor(label);

						this.menu.addMenuItem(item);
						this._statusMenuItems.push(item);
					}
				});
			} else {
				log("[eruption] warning: Device status not available");
			}
		}

		uncheckAllSlotCheckmarks() {
			this.menu._getMenuItems().forEach(elem => {
				if (elem instanceof SlotMenuItem) elem.setToggleState(false);
			});
		}

		uncheckAllProfileCheckmarks() {
			this.menu._getMenuItems().forEach(elem => {
				if (elem instanceof ProfileMenuItem) elem.setToggleState(false);
			});
		}

		_brightnessSliderChanged() {
			Mainloop.source_remove(brightness_slider_source);
			brightness_slider_source = null;

			// debounce slider
			brightness_slider_source = Mainloop.timeout_add(15, () => {
				let percent = this._brightnessSlider.value * 100;

				brightness = percent;
				eruptionConfig.Brightness = percent;
			});
		}

		// D-Bus signal, emitted when the daemon registered modification of a connected devices' status
		_statusChanged(_proxy, _sender, [_object]) {
			this.populateMenu();
		}

		// D-Bus signal, emitted when the daemon registered modification of the LED brightness
		// _brightnessChanged(proxy, sender, [object]) {
		// 	if (this._brightnessSlider) {
		// 		brightness = object;
		// 		if (brightness == null || brightness < 0 || brightness > 100)
		// 			brightness = 100;

		// 		this._brightnessSlider.value = brightness / 100;
		// 	}
		// }

		// D-Bus signal, emitted when the daemon changed its active slot
		_activeSlotChanged(_proxy, _sender, [object]) {
			activeSlot = object;

			eruptionMenuButton.populateMenu({
				active_slot: object
			});
		}

		// D-Bus signal, emitted when the daemon changed its active profile
		_activeProfileChanged(_proxy, _sender, [object]) {
			activeProfile[activeSlot] = object;

			let new_profile = _profileFileToName(object);
			showNotification(PROFILE_SWITCH_NOTIFICATION, new_profile);

			eruptionMenuButton.populateMenu({
				active_item: object
			});
		}

		// D-Bus signal, emitted when the daemon registered modification or
		// creation of new profile files
		_profilesChanged(_proxy, _sender, [_object]) {
			// showNotification(PROFILE_SWITCH_NOTIFICATION, _("Eruption profiles updated"));
			eruptionMenuButton.populateMenu();
		}

		// D-Bus signal, emitted when the status of a managed device has changed
		_deviceStatusChanged(_proxy, _sender, [object]) {
			try {
				if (object !== null) {
					deviceStatus = JSON.parse(object);

					this.populateMenu({ status_only: true });
					updateDeviceStatusIndicators();
				}
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
			}
		}

		// D-Bus signal, emitted when a device is hotplugged and subsequently bound by the eruption daemon
		_deviceHotplug(_proxy, _sender, [object]) {
			try {
				if (object !== null) {
					let [usb_vid, usb_pid, failed] = object;

					log(`[eruption] new device hot-plugged: ${usb_vid}:${usb_pid}; failed: ${failed}`);

					if (!failed) {
						if (usb_vid !== 0 && usb_pid !== 0) {
							const device_name = getDeviceNameFromUSBIDs(usb_vid, usb_pid);
							showNotification(HOTPLUG_NOTIFICATION, _("Plugged") + ` ${device_name}`);
						} else {
							showNotification(HOTPLUG_NOTIFICATION, _("New device plugged and activated"));
						}
					} else {
						if (usb_vid !== 0 && usb_pid !== 0) {
							const device_name = getDeviceNameFromUSBIDs(usb_vid, usb_pid);
							showNotification(HOTPLUG_NOTIFICATION, _("Removed") + ` ${device_name}`);
						} else {
							showNotification(HOTPLUG_NOTIFICATION, _("Device removed"));
						}
					}

					removeDeviceStatusIndicators();
					showDeviceStatusIndicators();
				}
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
			}
		}

		_sync_fx_proxy(proxy, _changed, _invalidated, suppress_notification) {
			try {
				if (proxy.AmbientEffect != null) {
					enableAmbientFx = proxy.AmbientEffect;

					this._enableAmbientFxItem.setToggleState(enableAmbientFx);

					if (!suppress_notification && enableAmbientFx) {
						showNotification(SETTINGS_NOTIFICATION, _("Ambient Effect enabled"));
					} else {
						showNotification(SETTINGS_NOTIFICATION, _("Ambient Effect disabled"));
					}
				}
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
			}
		}

		_sync_slot(proxy, _changed, _invalidated, _suppress_notification) {
			try {
				if (proxy.ActiveSlot != null) {
					activeSlot = proxy.ActiveSlot;

					eruptionMenuButton.populateMenu();
				}

				if (proxy.SlotNames != null) {
					slotNames = proxy.SlotNames;

					eruptionMenuButton.populateMenu();
				}
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
			}
		}

		_sync_profile(proxy, _changed, _invalidated, _suppress_notification) {
			try {
				if (proxy.ActiveProfile != null && activeSlot != null) {
					activeProfile[activeSlot] = proxy.ActiveProfile;

					eruptionMenuButton.populateMenu();
				}
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
			}
		}

		_sync_config(proxy, changed, _invalidated, suppress_notification) {
			try {
				const [changed_attr_name] = Object.entries(changed.deepUnpack())[0];

				if (changed_attr_name === "EnableSfx" && this._enableSfxItem != null) {
					enableSfx = proxy.EnableSfx;

					this._enableSfxItem.setToggleState(enableSfx);

					if (!suppress_notification && enableSfx) {
						showNotification(SETTINGS_NOTIFICATION, _("Audio Effects enabled"));
					} else {
						showNotification(SETTINGS_NOTIFICATION, _("Audio Effects disabled"));
					}
				} else if (changed_attr_name === "Brightness" && this._brightnessSlider != null) {
					brightness = proxy.Brightness;
					if (brightness == null || brightness < 0 || brightness > 100)
						brightness = 100;

					this._brightnessSlider.value = brightness / 100;

					if (!suppress_notification) {
						showNotification(SETTINGS_NOTIFICATION, _("Brightness: ") + brightness.toFixed(0) + "%");
					}
				}
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
			}
		}

		_sync_status(proxy, _changed, _invalidated, _suppress_notification) {
			try {
				this._eruption_running = proxy.Running;

				if (previous_state != this._eruption_running) {
					connected = this._eruption_running;

					if (this._eruption_running) {
						// we (re-)gained the connection to the Eruption daemon
						log("[eruption] connected to Eruption");

						eruptionMenuButton.populateMenu();

						removeDeviceStatusIndicators();
						showDeviceStatusIndicators();
					}

					eruptionMenuButton.updateIcon();

					previous_state = this._eruption_running;
				} else {
					previous_state = this._eruption_running;
				}
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
			}
		}

		_sync_device(proxy, _changed, _invalidated, _suppress_notification) {
			try {
				deviceStatus = JSON.parse(proxy.DeviceStatus);

				if (connected) {
					this.populateMenu({ status_only: true });

					updateDeviceStatusIndicators();
				} else {
					this.populateMenu();

					removeDeviceStatusIndicators();
					// showDeviceStatusIndicators();
				}
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
			}
		}
	}
);

const BATTERY_INDICATOR = 0;
const SIGNAL_STRENGTH_INDICATOR = 1;

let IndicatorMenuButton = GObject.registerClass(
	class IndicatorMenuButton extends PanelMenu.Button {
		_init(type, device) {
			this._device = device;
			this._type = type;

			// log(`[eruption] placing indicator for: ${this.getDeviceName()}`);

			super._init(0.0, _(`${getDeviceNameFromUSBIDs(device.usb_vid, device.usb_pid)}`));

			let icon_name;
			let icon, label;

			switch (this._type) {
				case BATTERY_INDICATOR:
					// battery level indicator
					let battery_level = this._device.status["battery-level-percent"];
					icon_name = getBatteryLevelIcon(this._device.status["battery-level-percent"]);

					icon = new St.Icon({
						icon_name: icon_name,
						style_class: "system-status-icon"
					});

					this.icon = icon;

					deviceStatusIndicatorBox.add_actor(icon);

					if (settings.get_boolean("show-device-indicators-percentages")) {
						var value = `${battery_level}`;
						var filler = Math.max(0, Math.abs(2 - value.length));
						var text = " ".repeat(filler) + value + "%";

						label = new St.Label({
							text: text,
							style_class: "indicator-item-status-label"
						});

						this.label = label;

						deviceStatusIndicatorBox.add_actor(label);
					}
					break;

				case SIGNAL_STRENGTH_INDICATOR:
					// signal strength indicator
					let signal_strength = this._device.status["signal-strength-percent"];
					icon_name = getSignalStrengthIcon(signal_strength);

					icon = new St.Icon({
						icon_name: icon_name,
						style_class: "menu-icon"
					});

					this.icon = icon;

					deviceStatusIndicatorBox.add_actor(icon);

					if (settings.get_boolean("show-device-indicators-percentages")) {
						var value = `${signal_strength}`;
						var filler = Math.max(0, Math.abs(2 - value.length));
						var text = " ".repeat(filler) + value + "%";

						label = new St.Label({
							text: text,
							style_class: "indicator-item-status-label",
						});

						this.label = label;

						deviceStatusIndicatorBox.add_actor(label);
					}
					break;

				default:
					log("[eruption] internal error: Invalid 'type' parameter in IndicatorMenuButton._init(...)");
					break;
			}
		}

		update() {
			// log(`[eruption] updating indicator for: ${this.getDeviceName()}`);

			// update device status
			let device = deviceStatus.find((e, _index, _object) => {
				if (e.usb_vid === this._device.usb_vid && e.usb_pid === this._device.usb_pid)
					return true;
			});

			if (device)
				this._device = device;

			let icon_name;

			switch (this._type) {
				case BATTERY_INDICATOR:
					// battery level indicator
					const battery_level = this._device.status["battery-level-percent"];
					icon_name = getBatteryLevelIcon(this._device.status["battery-level-percent"]);

					this.icon.icon_name = icon_name;

					if (settings.get_boolean("show-device-indicators-percentages")) {
						var value = `${battery_level}`;
						var filler = Math.max(0, Math.abs(2 - value.length));
						var text = " ".repeat(filler) + value + "%";

						this.label.text = text;
					}
					break;

				case SIGNAL_STRENGTH_INDICATOR:
					// signal strength indicator
					const signal_strength = this._device.status["signal-strength-percent"];
					icon_name = getSignalStrengthIcon(signal_strength);

					this.icon.icon_name = icon_name;

					if (settings.get_boolean("show-device-indicators-percentages")) {
						var value = `${signal_strength}`;
						var filler = Math.max(0, Math.abs(2 - value.length));
						var text = " ".repeat(filler) + value + "%";

						this.label.text = text;
					}
					break;

				default:
					log("[eruption] internal error: Invalid 'type' parameter in IndicatorMenuButton.update(...)");
					break;
			}
		}

		destroy() {
			log(`[eruption] destroying indicator for: ${this.getDeviceName()}`);

			if (this.icon)
				deviceStatusIndicatorBox.remove_actor(this.icon);

			if (this.label)
				deviceStatusIndicatorBox.remove_actor(this.label);

			this.icon = null;
			this.label = null;

			super.destroy();
		}

		getDeviceName() {
			return `${getDeviceNameFromUSBIDs(this._device.usb_vid, this._device.usb_pid)}`;
		}
	}
);

function showDeviceStatusIndicators() {
	if (settings.get_boolean("show-device-indicators")) {
		if (deviceStatus) {
			deviceStatus.map(device => {
				try {
					if (deviceSupportsStatusReporting(device.usb_vid, device.usb_pid)) {
						// signal strength indicator
						if (settings.get_boolean("show-signal-strength")) {
							const indicatorMenuButton = new IndicatorMenuButton(SIGNAL_STRENGTH_INDICATOR, device);
							deviceStatusIndicatorBox.add_actor(indicatorMenuButton);
							statusIndicatorIcons.push(indicatorMenuButton);
						}

						// battery level indicator
						if (settings.get_boolean("show-battery-level")) {
							const indicatorMenuButton = new IndicatorMenuButton(BATTERY_INDICATOR, device);
							deviceStatusIndicatorBox.add_actor(indicatorMenuButton);
							statusIndicatorIcons.push(indicatorMenuButton);
						}
					}
				} catch (e) {
					log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
					showNotification(ERROR_NOTIFICATION, e.message);
				}
			});
		} else {
			log("[eruption] warning: Device status not available");
		}
	}
}

function updateDeviceStatusIndicators() {
	if (statusIndicatorIcons.length <= 0) {
		removeDeviceStatusIndicators();
		showDeviceStatusIndicators();
	} else {
		// log(`[eruption] updating ${statusIndicatorIcons.length} indicators...`);

		for (let i = 0; i < statusIndicatorIcons.length; i++) {
			try {
				statusIndicatorIcons[i].update();
			} catch (e) {
				log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
				showNotification(ERROR_NOTIFICATION, e.message);
			}
		}
	}
}

function removeDeviceStatusIndicators() {
	// log(`[eruption] removing ${statusIndicatorIcons.length} indicators...`);

	for (let i = 0; i < statusIndicatorIcons.length; i++) {
		try {
			statusIndicatorIcons[i].destroy();
		} catch (e) {
			log("[eruption] internal error: " + e.lineNumber + ": " + e.message);
			showNotification(ERROR_NOTIFICATION, e.message);
		}
	}

	deviceStatusIndicatorBox.get_children().forEach((e) => {
		deviceStatusIndicatorBox.remove_actor(e);
		e.destroy();
	});

	statusIndicatorIcons = [];
}

class ProfileSwitcherExtension {
	constructor() { }

	enable() {
		log(`[eruption] enabling ${Me.metadata.name}`);

		settings = ExtensionUtils.getSettings();
		settings.connect("changed", this._update.bind(this));

		eruptionMenuButton = new EruptionMenuButton();
		Main.panel.addToStatusArea("eruption-menu", eruptionMenuButton, 1, "right");

		removeDeviceStatusIndicators();
		showDeviceStatusIndicators();
	}

	disable() {
		log(`[eruption] disabling ${Me.metadata.name}`);

		Mainloop.source_remove(pending_timeout);
		pending_timeout = null;

		Mainloop.source_remove(brightness_slider_source);
		brightness_slider_source = null;

		Mainloop.source_remove(status_poll_source_toplevel);
		status_poll_source_toplevel = null;

		Mainloop.source_remove(status_poll_source);
		status_poll_source = null;

		Mainloop.source_remove(fade_out_source);
		fade_out_source = null;

		Mainloop.source_remove(process_poll_source);
		process_poll_source = null;

		removeDeviceStatusIndicators();

		Main.panel.menuManager.removeMenu(eruptionMenuButton.menu);
		eruptionMenuButton.destroy();
	}

	reload() {
		log(`[eruption] reloading ${Me.metadata.name}`);

		this.disable();
		this.enable();
	}

	_update() {
		log(`[eruption] updating settings ${Me.metadata.name}`);

		eruptionMenuButton.populateMenu();

		removeDeviceStatusIndicators();
		showDeviceStatusIndicators();
	}
}

function init() {
	ExtensionUtils.initTranslations(Me.metadata.uuid);

	instance = new ProfileSwitcherExtension();
	return instance;
}
