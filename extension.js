/* extension.js
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
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

"use strict";

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
const Lang = imports.lang;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;
const Signals = imports.signals;
const ByteArray = imports.byteArray;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Preferences = Me.imports.prefs;

// Global constants
const NOTIFICATION_TIMEOUT_MILLIS = 1500;
const NOTIFICATION_ANIMATION_MILLIS = 500;
const PROCESS_POLL_TIMEOUT_MILLIS = 3000;
const PROCESS_SPAWN_WAIT_MILLIS = 800;

const DEFAULT_SLOT_NAMES = ['Profile Slot 1', 'Profile Slot 2', 'Profile Slot 3', 'Profile Slot 4'];

// The following D-Bus Ifaces are auto generated with the command
// `dbus-send --system --dest=org.eruption --type=method_call --print-reply /org/eruption/<path> \
//  org.freedesktop.DBus.Introspectable.Introspect`

// D-Bus interface specification: Slots
const eruptionSlotIface = `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node name="/org/eruption/slot">
  <interface name="org.eruption.Slot">
    <method name="GetSlotProfiles">
      <arg name="values" type="as" direction="out"/>
    </method>
    <method name="SwitchSlot">
      <arg name="slot" type="t" direction="in"/>
      <arg name="status" type="b" direction="out"/>
    </method>
    <property name="ActiveSlot" type="t" access="read">
      <annotation name="org.freedesktop.DBus.Property.EmitsChangedSignal" value="const"/>
    </property>
    <property name="SlotNames" type="as" access="readwrite"/>
    <signal name="ActiveSlotChanged">
      <arg name="new slot" type="t"/>
    </signal>
  </interface>
  <interface name="org.freedesktop.DBus.Introspectable">
    <method name="Introspect">
      <arg name="xml_data" type="s" direction="out"/>
    </method>
  </interface>
  <interface name="org.freedesktop.DBus.Properties">
    <method name="Get">
      <arg name="interface_name" type="s" direction="in"/>
      <arg name="property_name" type="s" direction="in"/>
      <arg name="value" type="v" direction="out"/>
    </method>
    <method name="GetAll">
      <arg name="interface_name" type="s" direction="in"/>
      <arg name="props" type="a{sv}" direction="out"/>
    </method>
    <method name="Set">
      <arg name="interface_name" type="s" direction="in"/>
      <arg name="property_name" type="s" direction="in"/>
      <arg name="value" type="v" direction="in"/>
    </method>
    <signal name="PropertiesChanged">
      <arg name="interface_name" type="s"/>
      <arg name="changed_properties" type="a{sv}"/>
      <arg name="invalidated_properties" type="as"/>
    </signal>
  </interface>
</node>`.trim();

// D-Bus interface specification: Profiles
const eruptionProfileIface = `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node name="/org/eruption/profile">
  <interface name="org.eruption.Profile">
    <method name="EnumProfiles">
      <arg name="profiles" type="a(ss)" direction="out"/>
    </method>
    <method name="SwitchProfile">
      <arg name="filename" type="s" direction="in"/>
      <arg name="status" type="b" direction="out"/>
    </method>
    <property name="ActiveProfile" type="s" access="read">
      <annotation name="org.freedesktop.DBus.Property.EmitsChangedSignal" value="const"/>
    </property>
    <signal name="ActiveProfileChanged">
      <arg name="new profile name" type="s"/>
    </signal>
    <signal name="ProfilesChanged"/>
  </interface>
  <interface name="org.freedesktop.DBus.Introspectable">
    <method name="Introspect">
      <arg name="xml_data" type="s" direction="out"/>
    </method>
  </interface>
  <interface name="org.freedesktop.DBus.Properties">
    <method name="Get">
      <arg name="interface_name" type="s" direction="in"/>
      <arg name="property_name" type="s" direction="in"/>
      <arg name="value" type="v" direction="out"/>
    </method>
    <method name="GetAll">
      <arg name="interface_name" type="s" direction="in"/>
      <arg name="props" type="a{sv}" direction="out"/>
    </method>
    <method name="Set">
      <arg name="interface_name" type="s" direction="in"/>
      <arg name="property_name" type="s" direction="in"/>
      <arg name="value" type="v" direction="in"/>
    </method>
    <signal name="PropertiesChanged">
      <arg name="interface_name" type="s"/>
      <arg name="changed_properties" type="a{sv}"/>
      <arg name="invalidated_properties" type="as"/>
    </signal>
  </interface>
</node>`.trim();

// D-Bus interface specification: Runtime configuration
const eruptionConfigIface = `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node name="/org/eruption/config">
  <interface name="org.eruption.Config">
    <property name="Brightness" type="x" access="readwrite"/>
    <property name="EnableSfx" type="b" access="readwrite"/>
    <signal name="BrightnessChanged">
      <arg name="current brightness" type="x"/>
    </signal>
  </interface>
  <interface name="org.freedesktop.DBus.Introspectable">
    <method name="Introspect">
      <arg name="xml_data" type="s" direction="out"/>
    </method>
  </interface>
  <interface name="org.freedesktop.DBus.Properties">
    <method name="Get">
      <arg name="interface_name" type="s" direction="in"/>
      <arg name="property_name" type="s" direction="in"/>
      <arg name="value" type="v" direction="out"/>
    </method>
    <method name="GetAll">
      <arg name="interface_name" type="s" direction="in"/>
      <arg name="props" type="a{sv}" direction="out"/>
    </method>
    <method name="Set">
      <arg name="interface_name" type="s" direction="in"/>
      <arg name="property_name" type="s" direction="in"/>
      <arg name="value" type="v" direction="in"/>
    </method>
    <signal name="PropertiesChanged">
      <arg name="interface_name" type="s"/>
      <arg name="changed_properties" type="a{sv}"/>
      <arg name="invalidated_properties" type="as"/>
    </signal>
  </interface>
</node>`.trim();

const eruptionStatusIface = `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node name="/org/eruption/status">
  <interface name="org.eruption.Status">
    <method name="GetLedColors">
      <arg name="values" type="a(yyyy)" direction="out"/>
    </method>
    <property name="Running" type="b" access="read"/>
  </interface>
  <interface name="org.freedesktop.DBus.Introspectable">
    <method name="Introspect">
      <arg name="xml_data" type="s" direction="out"/>
    </method>
  </interface>
  <interface name="org.freedesktop.DBus.Properties">
    <method name="Get">
      <arg name="interface_name" type="s" direction="in"/>
      <arg name="property_name" type="s" direction="in"/>
      <arg name="value" type="v" direction="out"/>
    </method>
    <method name="GetAll">
      <arg name="interface_name" type="s" direction="in"/>
      <arg name="props" type="a{sv}" direction="out"/>
    </method>
    <method name="Set">
      <arg name="interface_name" type="s" direction="in"/>
      <arg name="property_name" type="s" direction="in"/>
      <arg name="value" type="v" direction="in"/>
    </method>
    <signal name="PropertiesChanged">
      <arg name="interface_name" type="s"/>
      <arg name="changed_properties" type="a{sv}"/>
      <arg name="invalidated_properties" type="as"/>
    </signal>
  </interface>
</node>`.trim();

// D-Bus proxy
var eruptionSlot, eruptionProfile, eruptionConfig, eruptionStatus;

// Panel menu button
var connected = false;
var previous_state = null;
var instance = null,
	eruptionMenuButton;

// Global state
var activeSlot,
	slotNames = DEFAULT_SLOT_NAMES,
	activeProfile = [],
	savedProfile,
	enableSfx, enableNetFxAmbient, brightness = 100;

// Since we don't want to show the brightness indicator after startup
// we need to track the number of calls
var call_counter_on_slider_changed = 0;

function getSettings() {
	let GioSSS = Gio.SettingsSchemaSource;
	let schemaSource = GioSSS.new_from_directory(
		Me.dir.get_child("schemas").get_path(),
		GioSSS.get_default(),
		false
	);
	let schemaObj = schemaSource.lookup(
		'org.gnome.shell.extensions.eruption-profile-switcher', true);
	if (!schemaObj) {
		throw new Error('cannot find schemas');
	}
	return new Gio.Settings({
		settings_schema: schemaObj
	});
}

// Show centered notification on the current monitor
function _showNotification(msg) {
	if (_notificationsEnabled()) {
		let monitor = Main.layoutManager.currentMonitor;

		// be sure to not overlay multiple notifications
		// hide any other visible notification first
		if (notificationText) {
			notificationText.ease_property('opacity', 0, {
				duration: NOTIFICATION_ANIMATION_MILLIS,
				mode: Clutter.AnimationMode.EASE_OUT_QUAD,
				onComplete: () => {
					Main.uiGroup.remove_actor(notificationText);
				}
			});
		}

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

			Mainloop.timeout_add(NOTIFICATION_TIMEOUT_MILLIS, () => {
				if (notificationText) {
					notificationText.ease_property('opacity', 0, {
						duration: NOTIFICATION_ANIMATION_MILLIS,
						mode: Clutter.AnimationMode.EASE_OUT_QUAD,
						onComplete: () => {
							Main.uiGroup.remove_actor(notificationText);
						}
					});
				}
			});
		} else {
			// call_counter_on_slider_changed = 0;
		}
	}
}

// Global support variables for _showOrUpdateNotification()
var notificationText = null;
var notificationTimeouts = [];

// Show centered notification on the current monitor
// The notification is faded out conditionally
function _showOrUpdateNotification(msg) {
	if (_notificationsEnabled()) {
		if (!notificationText) {
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

				notificationTimeouts.push(Mainloop.timeout_add(NOTIFICATION_TIMEOUT_MILLIS, () => {
					notificationText.ease_property('opacity', 0, {
						duration: NOTIFICATION_ANIMATION_MILLIS,
						mode: Clutter.AnimationMode.EASE_OUT_QUAD,
						onComplete: () => {
							Main.uiGroup.remove_actor(notificationText);
							notificationText = null;
						}
					});
				}));
			} else {
				// call_counter_on_slider_changed = 0;
			}
		} else {
			notificationText.text = msg;

			notificationTimeouts.forEach(timeout => Mainloop.source_remove(timeout));

			notificationTimeouts.push(Mainloop.timeout_add(NOTIFICATION_TIMEOUT_MILLIS, () => {
				notificationText.ease_property('opacity', 0, {
					duration: NOTIFICATION_ANIMATION_MILLIS,
					mode: Clutter.AnimationMode.EASE_OUT_QUAD,
					onComplete: () => {
						Main.uiGroup.remove_actor(notificationText);
						notificationText = null;

						notificationTimeouts = [];
					}
				});
			}));
		}
	}
}

// Programmatically dismiss the notification overlay
function _fadeOutNotification() {
	if (_notificationsEnabled()) {
		Mainloop.timeout_add(NOTIFICATION_TIMEOUT_MILLIS, () => {
			if (notificationText) {
				notificationText.ease_property('opacity', 0, {
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

// Enable or disable the NetworkFX Ambient effect
// Switch the profile to `netfx.profile` and start or kill the `eruption-netfx` process
function _toggleNetFxAmbient(enable) {
	if (enable) {
		eruptionProfile.SwitchProfileSync("netfx.profile");

		Mainloop.timeout_add(PROCESS_SPAWN_WAIT_MILLIS, () => {
			Util.spawn(["/usr/bin/eruption-netfx", _getNetFxHostName(), _getNetFxPort().toString(), "ambient"]);
		});
	} else {
		if (savedProfile) {
			eruptionProfile.SwitchProfileSync(savedProfile);
		}

		Util.spawn(["/usr/bin/pkill", "eruption-netfx"]);
	}
}

// Called when we want to switch to a different slot or profile,
// while "NetworkFX Ambient" is enabled
function _switchAwayFromNetfxAmbient() {
	_toggleNetFxAmbient(false);
	enableNetFxAmbient = false;
}

// Returns whether notifications should be displayed
function _notificationsEnabled() {
	let result = false;

	try {
		result = getSettings().get_boolean("notifications");
	} catch (e) {
		log(e.message);
		// _showNotification(e.message);
	}

	return result;
}

// Returns the configured hostname
function _getNetFxHostName() {
	let result = "localhost";

	try {
		result = getSettings().get_string("netfx-host-name");
	} catch (e) {
		log(e.message);
		_showNotification(e.message);
	}

	return result;
}

// Returns the configured port number
function _getNetFxPort() {
	let result = 2359;

	try {
		result = getSettings().get_int("netfx-port-number");
	} catch (e) {
		log(e.message);
		_showNotification(e.message);
	}

	return result;
}

// Returns true if "eruption-netfx" is running, otherwise returns false
function isNetFxAmbientRunning() {
	// let cmdline = `eruption-netfx ${_getNetFxHostName()} ${_getNetFxPort()} ambient`;
	let cmdline = "eruption-netfx";
	let [ok, out, err, exit] = GLib.spawn_command_line_sync(`/bin/sh -c '/usr/bin/ps -e -o comm | /usr/bin/grep -i ${cmdline} | /usr/bin/grep -v defunct'`);

	try {
		let result = ByteArray.toString(out);
		if (result.includes("eruption-netfx")) {
			return true;
		}
	} catch (e) {
		log(e.message);
		_showNotification(e.message);
	}

	return false;
}

// Returns `true` if the Eruption GUI is executable
function isEruptionGuiAvailable() {
	// TODO: Implement this
	return false;
}

// Execute Eruption GUI
function runEruptionGui() {
	try {
		let cmdline = "/usr/bin/eruption-gui";

		let _result = Util.spawn([`${cmdline}`]);
	} catch (e) {
		log(e.message);
		_showNotification(e.message);
	}
}

// Get the profile name from a given .profile filename
function _profileFileToName(filename) {
	let name = ["<unknown>"];
	let result = eruptionProfile.EnumProfilesSync();

	name = result[0].find(profile => {
		if (profile[1].localeCompare(filename) === 0) {
			return true;
		} else {
			return false;
		}
	});

	return name[0];
}

// Represents an eruption .profile file
class Profile {
	constructor(profile_name, filename, data) {
		this._name = profile_name;
		this._filename = filename;
		this._data = data;
	}

	get_name() {
		return this._name;
	}

	get_filename() {
		return this._filename;
	}

	get_data() {
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
			this.add_child(this.label);

			this._callback = cb;

			this.connect("activate", this._activate.bind(this));
		}

		_activate(_menuItem, cb, _event) {
			log(this.label.text);
			return this._callback(this);
		}
	}
);

var SlotMenuItem = GObject.registerClass(
	class SlotMenuItem extends PopupMenu.PopupBaseMenuItem {
		_init(slot, params) {
			super._init(params);

			this.checkmark = new St.Icon({
				icon_name: "radio-checked-symbolic",
				style_class: "checkmark-slot"
			});

			this.label = new St.Label({
				text: slotNames[slot],
				style_class: 'slot-label'
			});

			this.add_child(this.checkmark);
			this.add_child(this.label);

			this._slot = slot;
			this.setToggleState(false);

			this.connect("activate", this._activate.bind(this));
		}

		_activate(_menuItem, _event) {
			if (this._slot !== activeSlot) {
				if (enableNetFxAmbient) {
					_switchAwayFromNetfxAmbient();
				}

				eruptionMenuButton.uncheckAllSlotCheckmarks();

				try {
					eruptionSlot.SwitchSlotSync(this._slot);
				} catch (e) {
					log(e.message);
					_showNotification("Could not switch slots! Is the Eruption daemon running?");
				}
			}
		}

		setToggleState(checked) {
			this.checkmark.set_icon_name(checked ? "radio-checked" : "radio");
		}
	}
);

// Menu item with associated profile object
var ProfileMenuItem = GObject.registerClass(
	class ProfileMenuItem extends PopupMenu.PopupBaseMenuItem {
		_init(profile, params) {
			super._init(params);

			this.checkmark = new St.Icon({
				icon_name: "radio-checked-symbolic",
				style_class: "checkmark"
			});

			this.label = new St.Label({
				text: profile.get_name()
			});

			this.add_child(this.checkmark);
			this.add_child(this.label);

			this._profile = profile;
			this.setToggleState(false);

			this.connect("activate", this._activate.bind(this));
		}

		_activate(_menuItem, _event) {
			if (enableNetFxAmbient) {
				_switchAwayFromNetfxAmbient();
			}

			eruptionMenuButton.uncheckAllProfileCheckmarks();

			try {
				eruptionProfile.SwitchProfileSync(this._profile.get_filename());
			} catch (e) {
				log(e.message);
				_showNotification("Could not switch profiles! Is the Eruption daemon running?");
			}
		}

		setToggleState(checked) {
			this.checkmark.set_icon_name(checked ? "radio-checked" : "radio");
		}
	}
);

let EruptionMenuButton = GObject.registerClass(
	class ProfilesMenuButton extends PanelMenu.Button {
		_init() {
			super._init(0.0, _("Eruption Menu"));

			try {
				const EruptionSlotProxy = Gio.DBusProxy.makeProxyWrapper(
					eruptionSlotIface
				);

				eruptionSlot = new EruptionSlotProxy(
					Gio.DBus.system,
					"org.eruption",
					"/org/eruption/slot",
					(proxy, error) => {
						if (error) {
							log(error.message);
							return;
						}

						proxy.connect("g-properties-changed", this._sync_slot.bind(this));
						this._sync_slot(proxy);
					}
				);

				this._active_slot_changed_id = eruptionSlot.connectSignal(
					"ActiveSlotChanged",
					this._activeSlotChanged.bind(this)
				);

				const EruptionProfileProxy = Gio.DBusProxy.makeProxyWrapper(
					eruptionProfileIface
				);

				eruptionProfile = new EruptionProfileProxy(
					Gio.DBus.system,
					"org.eruption",
					"/org/eruption/profile"
				);

				this._active_profile_changed_id = eruptionProfile.connectSignal(
					"ActiveProfileChanged",
					this._activeProfileChanged.bind(this)
				);

				this._profiles_changed_id = eruptionProfile.connectSignal(
					"ProfilesChanged",
					this._profilesChanged.bind(this)
				);

				activeProfile[activeSlot] = eruptionProfile.ActiveProfile;

				const EruptionConfigProxy = Gio.DBusProxy.makeProxyWrapper(
					eruptionConfigIface
				);
				eruptionConfig = new EruptionConfigProxy(
					Gio.DBus.system,
					"org.eruption",
					"/org/eruption/config",
					(proxy, error) => {
						if (error) {
							log(error.message);
							return;
						}

						proxy.connect("g-properties-changed", this._sync_config.bind(this));
						this._sync_config(proxy);
					}
				);

				this._brightness_changed_id = eruptionConfig.connectSignal(
					"BrightnessChanged",
					this._brightnessChanged.bind(this)
				);

				const EruptionStatusProxy = Gio.DBusProxy.makeProxyWrapper(
					eruptionStatusIface
				);

				eruptionStatus = new EruptionStatusProxy(
					Gio.DBus.system,
					"org.eruption",
					"/org/eruption/status",
					(proxy, error) => {
						if (error) {
							log(error.message);
							return;
						}

						proxy.connect("g-properties-changed", this._sync_status.bind(this));
						this._sync_status(proxy);
					}
				);
			} catch (e) {
				log(e.message);
				_showNotification(e.message);
			}

			let hbox = new St.BoxLayout({
				style_class: "panel-status-menu-box"
			});

			this.icon = new St.Icon({
				icon_name: connected ? "keyboard-brightness" : "gtk-no",
				style_class: "status-icon-notify system-status-icon"
			});

			hbox.add_child(this.icon);
			hbox.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
			this.add_child(hbox);

			this.populateMenu();
		}

		_onDestroy() {
			super._onDestroy();
		}

		updateIcon() {
			this.icon.icon_name = connected ? "keyboard-brightness" : "gtk-no";
		}

		populateMenu(config) {
			try {
				this.menu.removeAll();

				// initialize to sane defaults
				if (config === undefined) {
					config = {
						active_slot: activeSlot,
						active_item: undefined
					}
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

				// add sub-menu
				this.profiles_sub = new PopupMenu.PopupSubMenuMenuItem('Profiles');
				this.menu.addMenuItem(this.profiles_sub);

				try {
					let active_profile =
						config.active_item === undefined ? eruptionProfile.ActiveProfile : config.active_item;

					// add profiles radio menu items
					let result = eruptionProfile.EnumProfilesSync();
					result[0].forEach(profile => {
						let item = new ProfileMenuItem(new Profile(profile[0], profile[1]));
						if (active_profile.localeCompare(profile[1]) === 0) {
							item.setToggleState(true);
						}

						this.profiles_sub.menu.addMenuItem(item);
					});
				} catch (e) {
					log("Could not enumerate profiles: " + e.message);
				}

				// add separator
				separator = new PopupMenu.PopupSeparatorMenuItem();
				this.menu.addMenuItem(separator);

				// add Eruption GUI menu item
				if (isEruptionGuiAvailable()) {
					this.guiItem = new CustomPopupMenuItem('Eruption GUI…', (_item) => {
						runEruptionGui();
					});
					this.menu.addMenuItem(this.guiItem);
				}

				// add separator
				separator = new PopupMenu.PopupSeparatorMenuItem();
				this.menu.addMenuItem(separator);

				// add controls for the global configuration options of eruption
				let enableNetFxAmbientItem = new PopupMenu.PopupSwitchMenuItem("NetworkFX Ambient Effect", false);
				this._enableNetFxAmbientItem = enableNetFxAmbientItem;
				enableNetFxAmbientItem.connect("activate", this._toggleNetFx.bind(this));
				enableNetFxAmbientItem.setToggleState(enableNetFxAmbient);
				this.menu.addMenuItem(enableNetFxAmbientItem);

				let enableSfxItem = new PopupMenu.PopupSwitchMenuItem("SoundFX Audio Effects", false);
				this._enableSfxItem = enableSfxItem;
				enableSfxItem.connect("activate", event => {
					enableSfx = !enableSfx;
					eruptionConfig.EnableSfx = enableSfx;
				});

				enableSfxItem.setToggleState(enableSfx);
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

				brightnessSlider.connect(
					"button-release-event",
					this._brightnessSliderChangeCompleted.bind(this)
				);

				item.add(icon);
				item.add_child(brightnessSlider);

				item.connect("button-press-event", (actor, event) => {
					return brightnessSlider.startDragging(event);
				});

				item.connect("key-press-event", (actor, event) => {
					return brightnessSlider.emit("key-press-event", event);
				});

				this.menu.addMenuItem(item);
			} catch (e) {
				log("Internal error: " + e.message);
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

		_toggleNetFx() {
			enableNetFxAmbient = !enableNetFxAmbient;

			if (enableNetFxAmbient) {
				savedProfile = activeProfile[activeSlot];
			}

			_toggleNetFxAmbient(enableNetFxAmbient);

			if (enableNetFxAmbient) {
				this._processPollSource = Mainloop.timeout_add(PROCESS_POLL_TIMEOUT_MILLIS, () => {
					if (enableNetFxAmbient && !isNetFxAmbientRunning()) {
						// eruption-netfx process terminated, update our internal state
						enableNetFxAmbient = false;
						this.populateMenu();

						return false;
					}

					return true; // keep timer enabled
				});
			} else {
				Mainloop.source_remove(this._processPollSource);
			}
		}

		_brightnessSliderChanged() {
			// debounce slider
			Mainloop.timeout_add(100, () => {
				let percent = this._brightnessSlider.value * 100;

				brightness = percent;
				eruptionConfig.Brightness = percent;

				// don't show notification directly after startup
				if (call_counter_on_slider_changed > 1) {
					_showOrUpdateNotification("Brightness: " + brightness.toFixed(0) + "%");
				}
			});

			call_counter_on_slider_changed++;
		}

		_brightnessSliderChangeCompleted() {
			_fadeOutNotification();
		}

		// D-Bus signal, emitted when the daemon registered modification of the LED brightness
		_brightnessChanged(proxy, sender, [object]) {
			if (this._brightnessSlider) {
				brightness = object;
				if (brightness == null || brightness < 0 || brightness > 100)
					brightness = 100;

				this._brightnessSlider.value = brightness / 100;
			}
		}

		// D-Bus signal, emitted when the daemon changed its active slot
		_activeSlotChanged(proxy, sender, [object]) {
			activeSlot = object;
			eruptionMenuButton.populateMenu({
				active_slot: object
			});
		}

		// D-Bus signal, emitted when the daemon changed its active profile
		_activeProfileChanged(proxy, sender, [object]) {
			activeProfile[activeSlot] = object;
			let new_profile = _profileFileToName(object);

			_showNotification(new_profile);

			eruptionMenuButton.populateMenu({
				active_item: object
			});
		}

		// D-Bus signal, emitted when the daemon registered modification or
		// creation of new profile files
		_profilesChanged(_proxy, sender, [object]) {
			//_showNotification("Eruption profiles updated");
			eruptionMenuButton.populateMenu();
		}

		_sync_slot(proxy) {
			try {
				if (proxy.SlotNames) {
					activeSlot = proxy.ActiveSlot;
					slotNames = proxy.SlotNames;

					eruptionMenuButton.populateMenu();
				}
			} catch (e) {
				log("Internal error: " + e.message);
			}
		}

		_sync_config(proxy) {
			try {
				if (this._enableSfxItem) {
					enableSfx = proxy.EnableSfx;

					this._enableSfxItem.setToggleState(enableSfx);
				}

				if (this._brightnessSlider) {
					brightness = proxy.Brightness;
					if (brightness == null || brightness < 0 || brightness > 100)
						brightness = 100;

					this._brightnessSlider.value = brightness / 100;
				}
			} catch (e) {
				log("Internal error: " + e.message);
			}
		}

		_sync_status(proxy) {
			try {
				this._eruption_running = proxy.Running;

				if (previous_state != this._eruption_running) {
					if (this._eruption_running) {
						// we (re-)gained the connection to the Eruption daemon
						log("Connected to Eruption");
					}

					connected = this._eruption_running;
					eruptionMenuButton.updateIcon();

					previous_state = this._eruption_running;
				} else {
					previous_state = this._eruption_running;
				}
			} catch (e) {
				log("Internal error: " + e.message);
			}
		}
	}
);

class ProfileSwitcherExtension {
	constructor() {}

	enable() {
		eruptionMenuButton = new EruptionMenuButton();
		Main.panel.addToStatusArea("eruption-menu", eruptionMenuButton, 1, "right");
	}

	disable() {
		Main.panel.menuManager.removeMenu(eruptionMenuButton.menu);
		eruptionMenuButton.destroy();
	}

	reload() {
		this.disable();
		this.enable();
	}
}

function init() {
	instance = new ProfileSwitcherExtension();
	return instance;
}