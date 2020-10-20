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
	Gtk
} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

var hostName, portNumber;

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

function init() {}

function buildPrefsWidget() {
	let widget = new PrefsWidget();
	widget.show_all();
	return widget;
}

var PrefsWidget = GObject.registerClass(
	class PrefsWidget extends Gtk.ScrolledWindow {

		_init(params) {
			super._init(params);

			let builder = new Gtk.Builder();
			// builder.set_translation_domain('eruption-profile-switcher');
			builder.add_from_file(Me.path + '/prefs.ui');

			this.connect("destroy", Gtk.main_quit);

			let SignalHandler = {
				on_host_name_changed(w) {
					getSettings().set_string("netfx-host-name", w.text);
				},

				on_port_number_value_changed(w) {
					getSettings().set_int("netfx-port-number", w.get_value_as_int());
				},

				on_enable_notifications_toggled(w) {
					getSettings().set_boolean("notifications", w.get_active());
				}
			};

			builder.connect_signals_full((builder, object, signal, handler) => {
				object.connect(signal, SignalHandler[handler].bind(this));
			});

			this.add(builder.get_object('main_prefs'));

			builder.get_object("host_name").text = getSettings().get_string("netfx-host-name");
			builder.get_object("port_number").value = getSettings().get_int("netfx-port-number");
			builder.get_object("enable_notifications").set_active(getSettings().get_boolean("notifications"));
		}
	});