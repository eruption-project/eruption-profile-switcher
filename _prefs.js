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

function init() {}

function buildPrefsWidget() {
    let widget = new PrefsWidget();
    widget.show_all();
    return widget;
}

const PrefsWidget = GObject.registerClass(
    class PrefsWidget extends Gtk.Box {

        _init(params) {

            super._init(params);

            this.margin = 20;
            this.set_spacing(15);
            this.set_orientation(Gtk.Orientation.VERTICAL);

            this.connect('destroy', Gtk.main_quit);

            let myLabel = new Gtk.Label({
                label: "Eruption Profile Switcher | Gnome Shell Extension"
            });

            let hBox = new Gtk.Box();
            hBox.set_orientation(Gtk.Orientation.HORIZONTAL);

            hBox.pack_start(myLabel, false, false, 0);

            this.add(hBox);
        }

    });