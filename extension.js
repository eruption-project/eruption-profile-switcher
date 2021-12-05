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
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;
const Signals = imports.signals;
const ByteArray = imports.byteArray;

const Me = imports.misc.extensionUtils.getCurrentExtension();

// Global constants
const NOTIFICATION_TIMEOUT_MILLIS = 1500;
const NOTIFICATION_ANIMATION_MILLIS = 500;
const STATUS_POLL_TIMEOUT_MILLIS = 1000;
const PROCESS_POLL_TIMEOUT_MILLIS = 3000;
const PROCESS_SPAWN_WAIT_MILLIS = 800;

const DEFAULT_SLOT_NAMES = ['Profile Slot 1', 'Profile Slot 2',
							'Profile Slot 3', 'Profile Slot 4'];

// Eruption - Version: 0.1.23 - list of supported devices
const SUPPORTED_DEVICES = [
	{ make: "ROCCAT", model: "Vulcan 100/12x",       usb_vid: 0x1e7d, usb_pid: 0x3098 },
	{ make: "ROCCAT", model: "Vulcan 100/12x",       usb_vid: 0x1e7d, usb_pid: 0x307a },

	{ make: "ROCCAT", model: "Vulcan Pro",           usb_vid: 0x1e7d, usb_pid: 0x30f7 },

	{ make: "ROCCAT", model: "Vulcan TKL",           usb_vid: 0x1e7d, usb_pid: 0x2fee },

	{ make: "ROCCAT", model: "Vulcan Pro TKL",       usb_vid: 0x1e7d, usb_pid: 0x311a },

	{ make: "Corsair", model: "Corsair STRAFE Gaming Keyboard", usb_vid: 0x1b1c, usb_pid: 0x1b15 },

	{ make: "ROCCAT", model: "Kone Aimo",            usb_vid: 0x1e7d, usb_pid: 0x2e27 },

	{ make: "ROCCAT", model: "Kone Aimo Remastered", usb_vid: 0x1e7d, usb_pid: 0x2e2c },

	{ make: "ROCCAT", model: "Kone XTD Mouse",       usb_vid: 0x1e7d, usb_pid: 0x2e22 },

	{ make: "ROCCAT", model: "Kone Pure Ultra",      usb_vid: 0x1e7d, usb_pid: 0x2dd2 },

	{ make: "ROCCAT", model: "Burst Pro",            usb_vid: 0x1e7d, usb_pid: 0x2de1 },

	{ make: "ROCCAT", model: "Kain 200/202 AIMO",    usb_vid: 0x1e7d, usb_pid: 0x2d5f },
	{ make: "ROCCAT", model: "Kain 200/202 AIMO",    usb_vid: 0x1e7d, usb_pid: 0x2d60 },

	{ make: "ROCCAT", model: "Kova AIMO",            usb_vid: 0x1e7d, usb_pid: 0x2cf1 },
	{ make: "ROCCAT", model: "Kova AIMO",            usb_vid: 0x1e7d, usb_pid: 0x2cf3 },

	{ make: "ROCCAT", model: "Kova 2016",            usb_vid: 0x1e7d, usb_pid: 0x2cee },
	{ make: "ROCCAT", model: "Kova 2016",            usb_vid: 0x1e7d, usb_pid: 0x2cef },
	{ make: "ROCCAT", model: "Kova 2016",            usb_vid: 0x1e7d, usb_pid: 0x2cf0 },

	{ make: "ROCCAT", model: "Nyth",                 usb_vid: 0x1e7d, usb_pid: 0x2e7c },
	{ make: "ROCCAT", model: "Nyth",                 usb_vid: 0x1e7d, usb_pid: 0x2e7d },

	{ make: "ROCCAT/Turtle Beach", model: "Elo 7.1 Air", usb_vid: 0x1e7d, usb_pid: 0x3a37 },

	{ make: "ROCCAT", model: "Sense AIMO XXL", usb_vid: 0x1e7d, usb_pid: 0x343b }
];

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
    <method name="SetParameter">
      <arg name="profile_file" type="s" direction="in"/>
      <arg name="script_file" type="s" direction="in"/>
      <arg name="param_name" type="s" direction="in"/>
      <arg name="value" type="s" direction="in"/>
      <arg name="status" type="b" direction="out"/>
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
    <method name="Ping">
      <arg name="status" type="b" direction="out"/>
    </method>
    <method name="PingPrivileged">
      <arg name="status" type="b" direction="out"/>
    </method>
    <method name="WriteFile">
      <arg name="filename" type="s" direction="in"/>
      <arg name="data" type="s" direction="in"/>
      <arg name="status" type="b" direction="out"/>
    </method>
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

// D-Bus interface specification: Status
const eruptionStatusIface = `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node name="/org/eruption/status">
  <interface name="org.eruption.Status">
    <method name="GetLedColors">
      <arg name="values" type="a(yyyy)" direction="out"/>
    </method>
    <method name="GetManagedDevices">
      <arg name="values" type="(a(qq)a(qq)a(qq))" direction="out"/>
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

// D-Bus interface specification: Device
const eruptionDeviceIface = `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node name="/org/eruption/devices">
  <interface name="org.eruption.Device">
    <method name="GetDeviceConfig">
      <arg name="device" type="t" direction="in"/>
      <arg name="param" type="s" direction="in"/>
      <arg name="value" type="s" direction="out"/>
    </method>
    <method name="GetDeviceStatus">
      <arg name="device" type="t" direction="in"/>
      <arg name="status" type="s" direction="out"/>
    </method>
    <method name="GetManagedDevices">
      <arg name="values" type="(a(qq)a(qq)a(qq))" direction="out"/>
    </method>
    <method name="SetDeviceConfig">
      <arg name="device" type="t" direction="in"/>
      <arg name="param" type="s" direction="in"/>
      <arg name="value" type="s" direction="in"/>
      <arg name="status" type="b" direction="out"/>
    </method>
  </interface>
  <interface name="org.freedesktop.DBus.Introspectable">
    <method name="Introspect">
      <arg name="xml_data" type="s" direction="out"/>
    </method>
  </interface>
</node>`.trim()

// D-Bus proxy
var eruptionSlot, eruptionProfile, eruptionConfig,
	eruptionStatus, eruptionDevice;

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
	enableSfx, enableNetFxAmbient, brightness = 100,
	deviceStatus = [],
	status_poll_source,
	status_poll_source_toplevel;

var settings;


// Since we don't want to show the brightness indicator after startup
// we need to track the number of calls
var call_counter_on_slider_changed = 0;

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
		eruptionProfile.SwitchProfileSync("/var/lib/eruption/profiles/netfx.profile");

		Mainloop.timeout_add(PROCESS_SPAWN_WAIT_MILLIS, () => {
			Util.spawn(["/usr/bin/eruption-netfx", _getNetFxKeyboardModel(), _getNetFxHostName(),
					   _getNetFxPort().toString(), "ambient"]);
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
		result = settings.get_boolean("notifications");
	} catch (e) {
		log(e.message);
		// _showNotification(e.message);
	}

	return result;
}

// Returns the model of the managed keyboard suitable for
// use with the eruption-netfx client
function _getNetFxKeyboardModel() {
	let managed_devices = eruptionStatus.GetManagedDevicesSync()[0];

	let vid = managed_devices[0][0][0].toString(16);
	let pid = managed_devices[0][0][1].toString(16);

	let model = `${vid}:${pid}`;

	return model;
}

// Returns the configured hostname
function _getNetFxHostName() {
	let result = "localhost";

	try {
		result = settings.get_string("netfx-host-name");
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
		result = settings.get_int("netfx-port-number");
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
	try {
		let cmdline = "/usr/bin/eruption-gui";

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
		log(e.message);
		return false;
	}
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

// Find the name of a supported device from the SUPPORTED_DEVICES table, using USB IDs
function _getDeviceName(usb_vid, usb_pid) {
	const device = SUPPORTED_DEVICES.find((e) => e.usb_vid == usb_vid && e.usb_pid == usb_pid);
	if (device != undefined) {
		return `${device.make} ${device.model}`;
	} else {
		return "<Unknown Device>";
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

			let slot_name = DEFAULT_SLOT_NAMES[slot];
			if (slotNames[slot]) {
				slot_name = slotNames[slot];
			}

			this.label = new St.Label({
				text: slot_name,
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

function _batteryLevelIcon(battery_level) {
	var icon_name = "battery-missing-symbolic";

	if (battery_level !== undefined ) {
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
					"/org/eruption/profile",
					(proxy, error) => {
						if (error) {
							log(error.message);
							return;
						}

						proxy.connect("g-properties-changed", this._sync_profile.bind(this));
						this._sync_profile(proxy);
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

				this._status_changed_id = eruptionStatus.connectSignal(
					"StatusChanged",
					this._statusChanged.bind(this)
				);

				const EruptionDeviceProxy = Gio.DBusProxy.makeProxyWrapper(
					eruptionDeviceIface
				);
				eruptionDevice = new EruptionDeviceProxy(
					Gio.DBus.system,
					"org.eruption",
					"/org/eruption/devices",
					(proxy, error) => {
						if (error) {
							log(error.message);
							return;
						}

						proxy.connect("g-properties-changed", this._sync_device.bind(this));
						this._sync_device(proxy);
					}
				);

				if (settings.get_boolean("show-battery-level") ||
					settings.get_boolean("show-signal-strength")) {

					if (status_poll_source !== undefined && status_poll_source !== null) {
						Mainloop.source_remove(status_poll_source);
						status_poll_source = null;
					}

					status_poll_source = Mainloop.timeout_add(STATUS_POLL_TIMEOUT_MILLIS, () => {
						this._sync_device(eruptionDevice);

						return true; // keep timer enabled
					});
				} else if (!settings.get_boolean("show-battery-level") &&
						   !settings.get_boolean("show-signal-strength")) {
					// all indicators have been disabled
					if (status_poll_source !== undefined && status_poll_source !== null) {
						Mainloop.source_remove(status_poll_source);
						status_poll_source = null;
					}
				}
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

			this._statusMenuItems = [];
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
							if (active_profile && active_profile.localeCompare(profile[1]) === 0) {
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

					// add preferences menu item
					const prefs_item = new CustomPopupMenuItem('Preferences…', (_item) => {
						ExtensionUtils.openPrefs();
					});
					this.menu.addMenuItem(prefs_item);

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

					this.populateStatusMenuItems();

				} else {
					// only update the device status area of the menu
					this.populateStatusMenuItems();
				}
			} catch (e) {
				log("Internal error: " + e.message);
			}
		}

		populateStatusMenuItems() {
			this._statusMenuItems.forEach((item) => item.destroy());
			this._statusMenuItems = [];

			var separator_added = false;

			deviceStatus.map((device, index) => {
				var indicators = 0;

				const item = new PopupMenu.PopupBaseMenuItem();

				const label = new St.Label({
					style_class: "menu-item-label",
					text: `${_getDeviceName(device.usb_vid, device.usb_pid)}`,
				});

				// signal strength indicator
				if (settings.get_boolean("show-signal-strength")) {
					const signal_strength = device.status["signal-strength-percent"];
					if (signal_strength !== undefined ) {
						var icon_name = "network-cellular-signal-none-symbolic";

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

						const icon = new St.Icon({
							icon_name: icon_name,
							style_class: "menu-icon"
						});

						const level_label = new St.Label({
							style_class: "menu-item-label",
							text: `${signal_strength}%`,
						});

						item.add_child(icon);
						item.add_child(level_label);

						indicators += 1;
					} else {
						// place spacer

						// const icon = new St.Icon({
						// 	icon_name: 'none-symbolic',
						// 	style_class: "menu-icon"
						// });

						// const level_label = new St.Label({
						// 	style: "menu-item-label",
						// 	text: `------`,
						// });

						// item.add_child(icon);
						// item.add_child(level_label);
					}
				}

				// battery level indicator
				if (settings.get_boolean("show-battery-level")) {
					const battery_level = device.status["battery-level-percent"];

					if (battery_level !== undefined) {
						const icon_name = _batteryLevelIcon(device.status["battery-level-percent"]);

						const icon = new St.Icon({
							icon_name: icon_name,
							style_class: "menu-icon"
						});

						const level_label = new St.Label({
							style_class: "menu-item-label",
							text: `${battery_level}%`,
						});

						item.add_child(icon);
						item.add_child(level_label);

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
					}

					item.add_child(label);

					this.menu.addMenuItem(item);
					this._statusMenuItems.push(item);
				}
			});
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
			Mainloop.source_remove(this._brightnessSliderSource);

			// debounce slider
			this._brightnessSliderSource = Mainloop.timeout_add(25, () => {
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

		// D-Bus signal, emitted when the daemon registered modification of a connected devices' status
		_statusChanged(proxy, sender, [object]) {
			this.populateMenu();
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
				if (proxy.ActiveSlot != null) {
					activeSlot = proxy.ActiveSlot;

					eruptionMenuButton.populateMenu();
				}

				if (proxy.SlotNames != null) {
					slotNames = proxy.SlotNames;

					eruptionMenuButton.populateMenu();
				}
			} catch (e) {
				log("Internal error: " + e.message);
			}
		}

		_sync_profile(proxy) {
			try {
				if (proxy.ActiveProfile != null && activeSlot != null) {
					activeProfile[activeSlot] = proxy.ActiveProfile;

					eruptionMenuButton.populateMenu();
				}
			} catch (e) {
				log("Internal error: " + e.message);
			}
		}

		_sync_config(proxy) {
			try {
				if (this._enableSfxItem != null) {
					enableSfx = proxy.EnableSfx;

					this._enableSfxItem.setToggleState(enableSfx);
				}

				if (this._brightnessSlider != null) {
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

		_sync_device(proxy) {
			try {
				var devices = proxy.GetManagedDevicesSync()[0];
				devices = [].concat(devices[0], devices[1], devices[2]);

				deviceStatus = [];
				devices.map((device, index) => {
					const vid = device[0];
					const pid = device[1];

					try {
						const stat = proxy.GetDeviceStatusSync(index);
						const device_status = JSON.parse(stat);

						deviceStatus.push({ status: device_status, usb_vid: vid, usb_pid: pid });

						this.populateMenu({ status_only: true });
					} catch (e) {
						log("Could not query device status: " + e.message);
					}
				});
			} catch (e) {
				log("Internal error: " + e.message);
			}
		}
	}
);

/* let IndicatorMenuButton = GObject.registerClass(
	class IndicatorMenuButton extends PanelMenu.Button {
		_init() {
			this._device = 1;

			super._init(0.0, _(`${_getDeviceName()}`));

			let hbox = new St.BoxLayout({
				style_class: "panel-status-menu-box"
			});

			const icon = new St.Icon({
				icon_name: "battery-missing-symbolic",
				style_class: "system-status-icon"
			});

			const level_label = new St.Label({
				style_class: "indicator-item-label",
				text: ``,
			});

			this.icon = icon;
			this.label = level_label;

			hbox.add_child(icon);

			// battery level indicator
			//if (settings.get_boolean("show-battery-level") && deviceStatus[this._device] !== undefined) {
			if (deviceStatus[this._device] !== undefined) {
				const battery_level = deviceStatus[this._device].status["battery-level-percent"];
				const icon_name = _batteryLevelIcon(deviceStatus[this._device].status["battery-level-percent"]);

				const icon = new St.Icon({
					icon_name: icon_name,
					style_class: "system-status-icon"
				});

				const level_label = new St.Label({
					style_class: "indicator-item-label",
					text: `${battery_level}%`,
				});

				this.icon = icon;
				this.label = level_label;

				indicators += 1;
			}
			//}

			this.add_child(hbox);
		}

		update() {
			const battery_level = deviceStatus[this._device].status["battery-level-percent"];
			const icon_name = _batteryLevelIcon(deviceStatus[this._device].status["battery-level-percent"]);

			this.icon.icon_name = icon_name;
			this.label.text = `${battery_level}%`;
		}

		_getDeviceName() {
			return "Device";
		}
	}
); */

function _placeIndicators() {
	// battery level indicator
	/* if (settings.get_boolean("show-battery-level")) {
		const indicatorMenuButton = new IndicatorMenuButton(1);
		Main.panel.addToStatusArea("eruption-indicators", indicatorMenuButton, 2, "right");


		let status_poll_source_toplevel = Mainloop.timeout_add(STATUS_POLL_TIMEOUT_MILLIS, () => {
			indicatorMenuButton.update();

			return true; // keep timer enabled
		});
	} */
}

class ProfileSwitcherExtension {
	constructor() {}

	enable() {
		settings = ExtensionUtils.getSettings();

		eruptionMenuButton = new EruptionMenuButton();
		Main.panel.addToStatusArea("eruption-menu", eruptionMenuButton, 1, "right");

		_placeIndicators();
	}

	disable() {
		Mainloop.source_remove(status_poll_source_toplevel);
		status_poll_source_toplevel = null;

		Mainloop.source_remove(status_poll_source);
		status_poll_source = null;

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