#
# SPDX-License-Identifier: GPL-2.0-or-later
#
# eruption-profile-switcher
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 2 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
# Copyright (c) 2019-2023, The Eruption Development Team
#

all: build

build:
	@echo "Generating extension.zip package..."

	gnome-extensions pack --force --extra-source=ui/prefs.ui \
								  --extra-source=devices.js \
								  --extra-source=dbus_interface.js \
								  --podir=po \
								  --schema=schemas/org.gnome.shell.extensions.eruption-profile-switcher.gschema.xml \
								  .

	@echo "Completed. Now you can install the extension using 'make install'"

install: build
	gnome-extensions install --force eruption-profile-switcher@x3n0m0rph59.org.shell-extension.zip

	@echo "Success! Please restart the GNOME shell for the changes to take effect."

uninstall:
	gnome-extensions uninstall eruption-profile-switcher@x3n0m0rph59.org

	@echo "Done."

reload:
	# gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell --method org.gnome.Shell.Eval 'Meta.restart(_("Restarting…"))'
	killall -HUP gnome-shell

	@echo "Done."

clean:
	rm eruption-profile-switcher@x3n0m0rph59.org.shell-extension.zip

.SILENT: build install uninstall reload clean
.PHONY: build install uninstall reload clean
