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

const {
    GObject,
    Gtk
} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

function init() {}

function buildPrefsWidget() {
    let widget = new PrefsWidget();
    widget.show_all();
    return widget;
}

const PrefsWidget = GObject.registerClass(
    class PrefsWidget extends Gtk.ScrolledWindow {

        _init(params) {
            super._init(params);

            let builder = new Gtk.Builder();
            // builder.set_translation_domain('eruption-profile-switcher');
            builder.add_from_file(Me.path + '/prefs.ui');

            this.connect("destroy", Gtk.main_quit);

            let SignalHandler = {
                on_close_button_clicked(w) {
                    log("close");
                }
            };

            builder.connect_signals_full((builder, object, signal, handler) => {
                object.connect(signal, SignalHandler[handler].bind(this));
            });

            this.add(builder.get_object('main_prefs'));
        }
    });