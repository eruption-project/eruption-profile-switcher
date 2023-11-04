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
 * Copyright (c) 2019-2023, The Eruption Development Team
 */

// The following D-Bus Ifaces are auto generated with the command
// `dbus-send --system --dest=org.eruption --type=method_call --print-reply /org/eruption/<path> \
//  org.freedesktop.DBus.Introspectable.Introspect`

// D-Bus interface specification: Slots
export var eruptionSlotIface =
    `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
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
      <arg name="slot" type="t"/>
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
export var eruptionProfileIface =
    `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
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
      <arg name="profile_name" type="s"/>
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
export var eruptionConfigIface =
    `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node name="/org/eruption/config">
  <interface name="org.eruption.Config">
    <method name="GetColorSchemes">
      <arg name="color_schemes" type="as" direction="out"/>
    </method>
    <method name="Ping">
      <arg name="status" type="b" direction="out"/>
    </method>
    <method name="PingPrivileged">
      <arg name="status" type="b" direction="out"/>
    </method>
    <method name="RemoveColorScheme">
      <arg name="name" type="s" direction="in"/>
      <arg name="status" type="b" direction="out"/>
    </method>
    <method name="SetColorScheme">
      <arg name="name" type="s" direction="in"/>
      <arg name="data" type="ay" direction="in"/>
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
      <arg name="brightness" type="x"/>
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
export var eruptionStatusIface =
    `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
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
export var eruptionDeviceIface =
    `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
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
    <property name="DeviceStatus" type="s" access="read"/>
    <signal name="DeviceHotplug">
      <arg name="device_info" type="(qqb)"/>
    </signal>
    <signal name="DeviceStatusChanged">
      <arg name="status" type="s"/>
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

// The following D-Bus Ifaces are auto generated with the command
// `dbus-send --session --dest=org.eruption --type=method_call --print-reply /org/eruption/fx_proxy/effects \
//  org.freedesktop.DBus.Introspectable.Introspect`

// D-Bus interface specification: /org/eruption/fx_proxy/effects
export var eruptionFxProxyEffectsIface =
    `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node name="/org/eruption/fx_proxy/effects">
  <interface name="org.eruption.fx_proxy.Effects">
    <method name="DisableAmbientEffect"/>
    <method name="EnableAmbientEffect"/>
    <property name="AmbientEffect" type="b" access="readwrite"/>
    <signal name="StatusChanged">
      <arg name="event" type="s"/>
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
