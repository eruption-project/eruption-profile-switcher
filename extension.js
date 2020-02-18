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

const { Gio, GLib, GObject, Shell, St } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Lang = imports.lang;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Tweener = imports.ui.tweener;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Signals = imports.signals;


// D-Bus interface specification
const eruptionIface = `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
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
  </interface>
</node>`.trim();

// D-Bus proxy
var eruption;
var profilesMenuButton;

// Show centered notification on the primary monitor
function _showNotification(msg) {
  let text = new St.Label({ style_class: "notification-label", text: msg });
  let monitor = Main.layoutManager.primaryMonitor;

  text.opacity = 255;

  Main.uiGroup.add_actor(text);
  text.set_position(
    Math.floor(monitor.width / 2 - text.width / 2),
    Math.floor(monitor.height / 2 - text.height / 2)
  );

  Mainloop.timeout_add(1500, () => {
    Tweener.addTween(text, {
      opacity: 0,
      time: 3,
      transition: "easeInOut",
      onComplete: () => {
        Main.uiGroup.remove_actor(text);
      }
    });
  });
}

function _profileFileToName(filename) {
  let name = ["<unknown>"];
  let result = eruption.EnumProfilesSync();

  name = result[0].find(profile => {
    if (profile[1].localeCompare(filename) === 0) return true;
    else return false;
  });

  return name[0];
}

// Represents an eruption .profile file
class Profile {
  constructor(profile_name, filename) {
    this._name = profile_name;
    this._filename = filename;
  }

  get_name() {
    return this._name;
  }

  get_filename() {
    return this._filename;
  }
}

// Menu item with associated profile object
var ProfileMenuItem = GObject.registerClass(
  class ProfileMenuItem extends PopupMenu.PopupBaseMenuItem {
    _init(profile, params) {
      super._init(params);

      this.checkmark = new St.Icon({
        icon_name: "radio-checked-symbolic",
        style_class: "checkmark"
      });
      this.label = new St.Label({ text: profile.get_name() });
      this.add_child(this.checkmark);
      this.add_child(this.label);

      this.setToggleState(false);

      this.connect("activate", (menuItem, _event) => {
        profilesMenuButton.clearAllCheckmarks();

        try {
          eruption.SwitchProfileSync(profile.get_filename());
        } catch (e) {
          _showNotification(e.message);
        }
      });
    }

    setToggleState(checked) {
      this.checkmark.set_icon_name(checked ? "radio-checked" : "radio");
    }
  }
);

let ProfilesMenuButton = GObject.registerClass(
  class ProfilesMenuButton extends PanelMenu.Button {
    _init() {
      super._init(0.0, _("Eruption Profiles"));

      let hbox = new St.BoxLayout({ style_class: "panel-status-menu-box" });
      let icon = new St.Icon({
        icon_name: "view-coverflow-symbolic",
        style_class: "system-status-icon"
      });

      hbox.add_child(icon);
      hbox.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
      this.add_child(hbox);

      this.populateMenu();
    }

    _onDestroy() {
      super._onDestroy();
    }

    populateMenu(active_item) {
      this.menu.removeAll();

      let active_profile =
        active_item === undefined ? eruption.ActiveProfile : active_item;

      let result = eruption.EnumProfilesSync();
      result[0].forEach(profile => {
        let item = new ProfileMenuItem(new Profile(profile[0], profile[1]));
        if (active_profile.localeCompare(profile[1]) === 0) {
          item.setToggleState(true);
        }

        this.menu.addMenuItem(item);
      });
    }

    clearAllCheckmarks() {
      this.menu._getMenuItems().forEach(elem => elem.setToggleState(false));
    }
  }
);

class ProfileSwitcherExtension {
  constructor() {}

  enable() {
    const EruptionProxy = Gio.DBusProxy.makeProxyWrapper(eruptionIface);
    try {
      eruption = new EruptionProxy(
        Gio.DBus.system,
        "org.eruption",
        "/org/eruption/profile"
      );

      this._active_profile_changed_id = eruption.connectSignal(
        "ActiveProfileChanged",
        this._activeProfileChanged.bind(this)
      );
      this._profiles_changed_id = eruption.connectSignal(
        "ProfilesChanged",
        this._profilesChanged.bind(this)
      );
    } catch (e) {
      global.log("Error: " + e.message);
      _showNotification("Error: " + e.message);
    }

    profilesMenuButton = new ProfilesMenuButton();
    Main.panel.addToStatusArea("profiles-menu", profilesMenuButton, 1, "right");
  }

  // D-Bus signal, emitted when the daemon changed its active profile
  _activeProfileChanged(proxy, sender, [object]) {
    let new_profile = _profileFileToName(object);
    _showNotification(new_profile);

    profilesMenuButton.populateMenu(object);
  }

  // D-Bus signal, emitted when the daemon registered modification or
  // creation of new profile files
  _profilesChanged(_proxy, sender, [object]) {
    _showNotification("Eruption profiles updated");
    profilesMenuButton.populateMenu();
  }

  disable() {
    Main.panel.menuManager.removeMenu(profilesMenuButton.menu);
    profilesMenuButton.destroy();
  }
}

function init() {
  return new ProfileSwitcherExtension();
}
