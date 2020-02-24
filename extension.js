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
const Slider = imports.ui.slider;
const Signals = imports.signals;

// D-Bus interface specification
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
  </interface>
</node>`.trim();

// D-Bus interface specification
const eruptionConfigIface = `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node name="/org/eruption/config">
  <interface name="org.eruption.Config">
    <property name="Brightness" type="x" access="readwrite"/>
    <property name="EnableSfx" type="b" access="readwrite"/>
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
var eruption, eruptionConfig;

// Panel menu button
var profilesMenuButton;

// Global state
var enableSfx, brightness;

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
      time: 2,
      transition: "easeInOut",
      onComplete: () => {
        Main.uiGroup.remove_actor(text);
      }
    });
  });
}

// Get the profile name from a given .profile filename
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

      this._profile = profile;
      this.setToggleState(false);

      this.connect("activate", this._activate.bind(this));
    }

    _activate(_menuItem, _event) {
      profilesMenuButton.clearAllCheckmarks();

      try {
        eruption.SwitchProfileSync(this._profile.get_filename());
      } catch (e) {
        _showNotification(e.message);
      }
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

      try {
        const EruptionProxy = Gio.DBusProxy.makeProxyWrapper(
          eruptionProfileIface
        );
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

            proxy.connect("g-properties-changed", this._sync.bind(this));
            this._sync(proxy);
          }
        );
      } catch (e) {
        global.log("Error: " + e.message);
        _showNotification("Error: " + e.message);
      }

      let hbox = new St.BoxLayout({ style_class: "panel-status-menu-box" });
      this.icon = new St.Icon({
        icon_name: "keyboard-brightness",
        style_class: "status-icon-notify system-status-icon"
      });

      hbox.add_child(this.icon);
      hbox.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
      this.add_child(hbox);

      this.populateMenu();

      this.connect("popup-menu", sender => {
        this._cancelFlashing = true;
      });
    }

    _onDestroy() {
      super._onDestroy();
    }

    populateMenu(active_item) {
      this.menu.removeAll();

      let active_profile =
        active_item === undefined ? eruption.ActiveProfile : active_item;

      // add profiles radio menu items
      let result = eruption.EnumProfilesSync();
      result[0].forEach(profile => {
        let item = new ProfileMenuItem(new Profile(profile[0], profile[1]));
        if (active_profile.localeCompare(profile[1]) === 0) {
          item.setToggleState(true);
        }

        this.menu.addMenuItem(item);
      });

      // add separator
      let separator = new PopupMenu.PopupSeparatorMenuItem();
      this.menu.addMenuItem(separator);

      // add controls for the global configuration options of eruption
      let enableSfxItem = new PopupMenu.PopupSwitchMenuItem("SoundFX", false);
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

      item.add(icon);
      item.add_child(brightnessSlider);

      item.connect("button-press-event", (actor, event) => {
        return brightnessSlider.startDragging(event);
      });
      item.connect("key-press-event", (actor, event) => {
        return brightnessSlider.emit("key-press-event", event);
      });

      this.menu.addMenuItem(item);
    }

    clearAllCheckmarks() {
      this.menu._getMenuItems().forEach(elem => {
        if (elem instanceof ProfileMenuItem) elem.setToggleState(false);
      });
    }

    flashIcon() {
      this._flashed = false;
      this._cancelFlashing = false;
      this._flash_ttl = 3;

      this._timeoutId = Mainloop.timeout_add(550, () => {
        this._flashed
          ? this.icon.set_icon_name("info")
          : this.icon.set_icon_name("keyboard-brightness");
        this._flashed = !this._flashed;

        if (this._cancelFlashing)
          this.icon.set_icon_name("keyboard-brightness");

        return this._flash_ttl-- >= 0 || this._cancelFlashing;
      });
    }

    _brightnessSliderChanged() {
      let percent = this._brightnessSlider.value * 100;
      eruptionConfig.Brightness = percent;
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
      //_showNotification("Eruption profiles updated");
      this.flashIcon();

      profilesMenuButton.populateMenu();
    }

    _sync(proxy) {
      enableSfx = proxy.EnableSfx;
      this._enableSfxItem.setToggleState(enableSfx);

      brightness = proxy.Brightness;
      this._brightnessSlider.value = brightness / 100;

      //_showNotification("Brightness: " + brightness);
    }
  }
);

class ProfileSwitcherExtension {
  constructor() {}

  enable() {
    profilesMenuButton = new ProfilesMenuButton();
    Main.panel.addToStatusArea("profiles-menu", profilesMenuButton, 1, "right");
  }

  disable() {
    Main.panel.menuManager.removeMenu(profilesMenuButton.menu);
    profilesMenuButton.destroy();
  }
}

function init() {
  return new ProfileSwitcherExtension();
}
