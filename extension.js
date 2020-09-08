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

const {
  Gio,
  GLib,
  GObject,
  Shell,
  St
} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Util = imports.misc.util;
const Lang = imports.lang;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Tweener = imports.ui.tweener;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;
const Signals = imports.signals;

// D-Bus interface specification: Slots
const eruptionSlotIface = `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node name="/org/eruption/slot">
  <interface name="org.eruption.Slot">
    <method name="SwitchSlot">
      <arg name="slot" type="t" direction="in"/>
      <arg name="status" type="b" direction="out"/>
    </method>
    <property name="ActiveSlot" type="t" access="read">
      <annotation name="org.freedesktop.DBus.Property.EmitsChangedSignal" value="const"/>
    </property>
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
var eruptionSlot, eruptionProfile, eruptionConfig;

// Panel menu button
var eruptionMenuButton;

// Global state
var activeSlot,
  activeProfile = new Array(),
  savedProfile = new Array(),
  enableSfx, enableNetFxAmbient, brightness;

// Since we don't want to show the brightness indicator after startup
// we need to track the number of calls
var call_counter_on_slider_changed = 0;

// Show centered notification on the current monitor
function _showNotification(msg) {
  let text = new St.Label({
    style_class: "notification-label",
    text: msg
  });
  let monitor = Main.layoutManager.currentMonitor;

  if (monitor) {
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
  } else {
    call_counter_on_slider_changed = 0;
  }
}

// Global support variables for _showOrUpdateNotification()
var notificationText;
var inhibitor = false;

// Show centered notification on the current monitor
// The notification is faded out conditionally
function _showOrUpdateNotification(msg) {
  if (!notificationText) {
    let text = new St.Label({
      style_class: "notification-label",
      text: msg
    });
    let monitor = Main.layoutManager.currentMonitor;

    if (monitor) {
      notificationText = text;

      text.opacity = 255;

      Main.uiGroup.add_actor(text);
      text.set_position(
        Math.floor(monitor.width / 2 - text.width / 2),
        Math.floor(monitor.height / 2 - text.height / 2)
      );

      Mainloop.timeout_add(1500, () => {
        if (!inhibitor) {
          Tweener.addTween(text, {
            opacity: 0,
            time: 2,
            transition: "easeInOut",
            onComplete: () => {
              notificationText = null;
              Main.uiGroup.remove_actor(text);
            }
          });
        }
      });
    } else {
      call_counter_on_slider_changed = 0;
    }
  } else {
    notificationText.text = msg;
    inhibitor = true;
  }
}

// Dismiss notification
function _fadeOutNotification() {
  Mainloop.timeout_add(1500, () => {
    inhibitor = false;

    Tweener.addTween(notificationText, {
      opacity: 0,
      time: 2,
      transition: "easeInOut",
      onComplete: () => {
        Main.uiGroup.remove_actor(notificationText);
        notificationText = null;
      }
    });
  });
}

// Enable or disable the NetworkFX Ambient effect
// Switch the profile to `netfx.profile` and start or kill the `eruption-netfx` process
function _toggleNetFxAmbient(enable) {
  if (enable) {
    savedProfile[activeSlot] = activeProfile[activeSlot];
    eruptionProfile.SwitchProfileSync("netfx.profile");

    Mainloop.timeout_add(500, () => {
      Util.spawn(["/usr/bin/eruption-netfx", _get_netfxHostName(), _get_netfxPort(), "ambient"]);
    });
  } else {
    eruptionProfile.SwitchProfileSync(savedProfile[activeSlot]);
    Util.spawn(["/usr/bin/pkill", "eruption-netfx"]);
  }
}

// Called when we want to switch to a different slot or profile,
// while "NetworkFX Ambient" is enabled
function _switchAwayFromNetfxAmbient() {
  _toggleNetFxAmbient(false);
  enableNetFxAmbient = false;
}

function _get_netfxHostName() {
  let result = "localhost";

  return result;
}

function _get_netfxPort() {
  let result = "2359";

  return result;
}

// Get the profile name from a given .profile filename
function _profileFileToName(filename) {
  let name = ["<unknown>"];
  let result = eruptionProfile.EnumProfilesSync();

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

var SlotMenuItem = GObject.registerClass(
  class SlotMenuItem extends PopupMenu.PopupBaseMenuItem {
    _init(slot, params) {
      super._init(params);

      this.checkmark = new St.Icon({
        icon_name: "radio-checked-symbolic",
        style_class: "checkmark-slot"
      });
      this.label = new St.Label({
        text: "Slot " + (slot + 1),
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
          _showNotification(e.message);
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
        _showNotification(e.message);
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
          "/org/eruption/slot"
        );

        this._active_slot_changed_id = eruptionSlot.connectSignal(
          "ActiveSlotChanged",
          this._activeSlotChanged.bind(this)
        );

        activeSlot = eruptionSlot.ActiveSlot;

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

            proxy.connect("g-properties-changed", this._sync.bind(this));
            this._sync(proxy);
          }
        );
      } catch (e) {
        global.log("Error: " + e.message);
        _showNotification("Error: " + e.message);
      }

      let hbox = new St.BoxLayout({
        style_class: "panel-status-menu-box"
      });
      this.icon = new St.Icon({
        icon_name: "keyboard-brightness",
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

    populateMenu(config) {
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

      // add separator
      separator = new PopupMenu.PopupSeparatorMenuItem();
      this.menu.addMenuItem(separator);

      // add controls for the global configuration options of eruption
      let enableNetFxAmbientItem = new PopupMenu.PopupSwitchMenuItem("NetworkFX Ambient", false);
      this._enableNetFxAmbientItem = enableNetFxAmbientItem;
      enableNetFxAmbientItem.connect("activate", event => {
        enableNetFxAmbient = !enableNetFxAmbient;
        _toggleNetFxAmbient(enableNetFxAmbient);
      });
      enableNetFxAmbientItem.setToggleState(enableNetFxAmbient);
      this.menu.addMenuItem(enableNetFxAmbientItem);

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
      Mainloop.timeout_add(1, () => {
        let percent = this._brightnessSlider.value * 100;

        brightness = percent;
        eruptionConfig.Brightness = percent;

        // don't show notification directly after startup
        if (call_counter_on_slider_changed > 1) {
          _showOrUpdateNotification("Brightness: " + brightness.toFixed(0));
        }
      });

      call_counter_on_slider_changed++;
    }

    _brightnessSliderChangeCompleted() {
      _fadeOutNotification();
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
      let new_profile = _profileFileToName(object);
      activeProfile[activeSlot] = object;

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

    _sync(proxy) {
      enableSfx = proxy.EnableSfx;
      this._enableSfxItem.setToggleState(enableSfx);

      brightness = proxy.Brightness;
      this._brightnessSlider.value = brightness / 100;

      // _showNotification("Brightness: " + brightness);
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
}

function init() {
  return new ProfileSwitcherExtension();
}