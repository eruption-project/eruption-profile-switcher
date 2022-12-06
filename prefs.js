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
 */

"use strict";

const {
	GObject,
	Gio,
	Gtk,
	Gdk
} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = imports.misc.extensionUtils.getCurrentExtension();

var settings;

function init() { }

function buildPrefsWidget() {
	let builder = new Gtk.Builder();

	builder.set_scope(new MyBuilderScope());
	// builder.set_translation_domain("gettext-domain");
	builder.add_from_file(Me.dir.get_path() + "/prefs.ui");

	let provider = new Gtk.CssProvider();

	provider.load_from_path(Me.dir.get_path() + "/stylesheet.css");
	Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), provider,
		Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

	settings = ExtensionUtils.getSettings();

	builder.get_object("enable_notifications_general").set_active(settings.get_boolean("notifications-general"));
	builder.get_object("enable_notifications_on_profile_switch").set_active(settings.get_boolean("notifications-on-profile-switch"));
	builder.get_object("enable_notifications_on_hotplug").set_active(settings.get_boolean("notifications-on-hotplug"));
	builder.get_object("enable_notifications_on_settings_change").set_active(settings.get_boolean("notifications-on-settings-change"));

	builder.get_object("compact_mode").set_active(settings.get_boolean("compact-mode"));
	builder.get_object("show_battery_level").set_active(settings.get_boolean("show-battery-level"));
	builder.get_object("show_signal_strength").set_active(settings.get_boolean("show-signal-strength"));

	builder.get_object("show_device_indicators").set_active(settings.get_boolean("show-device-indicators"));

	return builder.get_object("main_prefs");
}

const PrefsWidget = GObject.registerClass({
	GTypeName: "PrefsWidget",
	Template: Me.dir.get_child("prefs.ui").get_uri(),
}, class PrefsWidget extends Gtk.Box {

	_init(params = {}) {
		super._init(params);
	}
});

const MyBuilderScope = GObject.registerClass({
	Implements: [Gtk.BuilderScope],
}, class MyBuilderScope extends GObject.Object {

	vfunc_create_closure(builder, handlerName, flags, connectObject) {
		if (flags & Gtk.BuilderClosureFlags.SWAPPED)
			throw new Error("Unsupported template signal flag 'swapped'");

		if (typeof this[handlerName] === "undefined")
			throw new Error(`${handlerName} is undefined`);

		return this[handlerName].bind(connectObject || this);
	}

	on_enable_notifications_general_toggled(w) {
		settings.set_boolean("notifications-general", w.get_active());
	}

	on_enable_notifications_on_profile_switch_toggled(w) {
		settings.set_boolean("notifications-on-profile-switch", w.get_active());
	}

	on_enable_notifications_on_hotplug_toggled(w) {
		settings.set_boolean("notifications-on-hotplug", w.get_active());
	}

	on_enable_notifications_on_settings_change_toggled(w) {
		settings.set_boolean("notifications-on-settings-change", w.get_active());
	}

	on_compact_mode_toggled(w) {
		settings.set_boolean("compact-mode", w.get_active());
	}

	on_show_battery_level_toggled(w) {
		settings.set_boolean("show-battery-level", w.get_active());
	}

	on_show_signal_strength_toggled(w) {
		settings.set_boolean("show-signal-strength", w.get_active());
	}

	on_show_device_indicators_toggled(w) {
		settings.set_boolean("show-device-indicators", w.get_active());
	}
});
