/* prefs.js
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
	GObject,
	Gio,
	Gtk,
	Gdk
} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = imports.misc.extensionUtils.getCurrentExtension();

var settings;

var hostName, portNumber;

function init() {}

function buildPrefsWidget() {
	let builder = new Gtk.Builder();


    builder.set_scope(new MyBuilderScope());
    // builder.set_translation_domain('gettext-domain');
    builder.add_from_file(Me.dir.get_path() + '/prefs.ui');

	let provider = new Gtk.CssProvider();

	provider.load_from_path(Me.dir.get_path() + '/stylesheet.css');
	Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), provider,
					Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

	settings = ExtensionUtils.getSettings();

	builder.get_object("host_name").text = settings.get_string("netfx-host-name");
	builder.get_object("port_number").value = settings.get_int("netfx-port-number");
	builder.get_object("enable_notifications").set_active(settings.get_boolean("notifications"));
	builder.get_object("show_battery_level").set_active(settings.get_boolean("show-battery-level"));
	builder.get_object("show_signal_strength").set_active(settings.get_boolean("show-signal-strength"));

    return builder.get_object('main_prefs');
}

const PrefsWidget = GObject.registerClass({
    GTypeName: 'PrefsWidget',
    Template: Me.dir.get_child('prefs.ui').get_uri(),
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
            throw new Error('Unsupported template signal flag "swapped"');

        if (typeof this[handlerName] === 'undefined')
            throw new Error(`${handlerName} is undefined`);

        return this[handlerName].bind(connectObject || this);
    }

	on_host_name_changed(w) {
		settings.set_string("netfx-host-name", w.text);
	}

	on_port_number_value_changed(w) {
		settings.set_int("netfx-port-number", w.get_value_as_int());
	}

	on_enable_notifications_toggled(w) {
		settings.set_boolean("notifications", w.get_active());
	}

	on_show_battery_level_toggled(w) {
		settings.set_boolean("show-battery-level", w.get_active());

		if (eruptionMenuButton) {
			eruptionMenuButton.populateMenu();
		}
	}

	on_show_signal_strength_toggled(w) {
		settings.set_boolean("show-signal-strength", w.get_active());

		if (eruptionMenuButton) {
			eruptionMenuButton.populateMenu();
		}
	}
});
